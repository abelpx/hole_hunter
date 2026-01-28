package scanner

import (
	"context"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/infrastructure/logger"
	"github.com/holehunter/holehunter/internal/metrics"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// Scanner 扫描器接口
type Scanner interface {
	// Scan 启动扫描
	Scan(ctx context.Context, req ScanRequest) error
	// Stop 停止扫描
	Stop(ctx context.Context, taskID int) error
	// GetProgress 获取扫描进度
	GetProgress(ctx context.Context, taskID int) (*models.ScanProgress, error)
	// IsRunning 检查是否正在运行
	IsRunning(taskID int) bool
	// GetRunningCount 获取运行中的扫描数量
	GetRunningCount() int
}

// ScanRequest 扫描请求
type ScanRequest struct {
	Context   context.Context
	TaskID    int
	Name      string
	TargetID  int
	TargetURL string
	Strategy  string
	Templates []string
	CustomDir string
}

// Orchestrator 扫描编排器
type Orchestrator struct {
	nuclei        *NucleiClient
	processMgr    *ScanProcessManager
	eventBus      *event.Bus
	logger        *logger.Logger
	maxConcurrent int
	scanRepo      *repo.ScanRepository

	mu    sync.RWMutex
	scans map[int]*ScanContext
}

// ScanContext 扫描上下文
type ScanContext struct {
	TaskID     int
	Request    ScanRequest
	CancelFunc context.CancelFunc
	VulnCount  atomic.Int32
	ProgressMu sync.RWMutex
	Progress   *models.ScanProgress
	StartTime  time.Time
	metrics    *metrics.Metrics
}

// NewOrchestrator 创建扫描编排器
func NewOrchestrator(
	nuclei *NucleiClient,
	eventBus *event.Bus,
	logger *logger.Logger,
	maxConcurrent int,
	metrics *metrics.Metrics,
	scanRepo *repo.ScanRepository,
) *Orchestrator {
	return &Orchestrator{
		nuclei:        nuclei,
		processMgr:    NewScanProcessManager(),
		eventBus:      eventBus,
		logger:        logger,
		maxConcurrent: maxConcurrent,
		scanRepo:      scanRepo,
		scans:         make(map[int]*ScanContext),
	}
}

// Scan 启动扫描
func (o *Orchestrator) Scan(ctx context.Context, req ScanRequest) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	// 检查并发限制
	if len(o.scans) >= o.maxConcurrent {
		return errors.Conflict("max concurrent scans reached")
	}

	// 检查是否已存在
	if _, exists := o.scans[req.TaskID]; exists {
		return errors.Conflict("scan task already running")
	}

	// 检查扫描器是否可用
	if !o.nuclei.IsAvailable() {
		return errors.Internal("nuclei binary not found", nil)
	}

	// 构建命令
	cmd, err := o.nuclei.BuildCommand(req.TargetURL, req.Strategy, req.Templates, req.CustomDir)
	if err != nil {
		return errors.Internal("failed to build command", err)
	}

	// 设置环境变量 - nuclei 需要这些来定位模板目录
	cmd.Env = append(os.Environ(),
		"NUCLEI_TEMPLATES_DIR="+o.nuclei.templatesDir,
	)

	o.logger.Debug("Nuclei command: %s with templates dir: %s", cmd.Path, o.nuclei.templatesDir)

	// 创建扫描上下文
	ctx, cancel := context.WithCancel(ctx)
	scanContext := &ScanContext{
		TaskID:     req.TaskID,
		Request:    req,
		CancelFunc: cancel,
		StartTime:  time.Now(),
		metrics:    metrics.Global,
		Progress: &models.ScanProgress{
			TaskID: req.TaskID,
			Status: "running",
		},
	}

	// 创建进程
	process := NewScanProcess(req.TaskID, cmd)

	// 添加到进程管理器
	o.processMgr.Add(process)

	// 保存上下文
	o.scans[req.TaskID] = scanContext

	// 发布扫描启动事件
	o.eventBus.PublishAsync(ctx, event.Event{
		Type: event.EventScanStarted,
		Data: map[string]interface{}{
			"taskId":   req.TaskID,
			"targetId": req.TargetID,
		},
	})

	// 记录指标
	metrics.Global.IncrementScanStarted()

	// 启动扫描
	go o.runScan(scanContext, process)

	o.logger.Info("Scan started: task_id=%d, target=%s, strategy=%s", req.TaskID, req.TargetURL, req.Strategy)
	return nil
}

// Stop 停止扫描
func (o *Orchestrator) Stop(ctx context.Context, taskID int) error {
	o.mu.Lock()
	defer o.mu.Unlock()

	scanCtx, exists := o.scans[taskID]
	if !exists {
		return errors.NotFound("scan task not found")
	}

	scanCtx.CancelFunc()

	if process, ok := o.processMgr.Get(taskID); ok {
		if err := process.Stop(); err != nil {
			o.logger.Error("Failed to stop scan process: task_id=%d, error=%v", taskID, err)
			return errors.Internal("failed to stop scan", err)
		}
	}

	// 发布停止事件
	o.eventBus.PublishAsync(ctx, event.Event{
		Type: event.EventScanStopped,
		Data: map[string]interface{}{
			"taskId": taskID,
		},
	})

	// 记录指标
	duration := time.Since(scanCtx.StartTime)
	metrics.Global.IncrementScanStopped()
	metrics.Global.RecordScanDuration(duration)

	o.logger.Info("Scan stopped: task_id=%d", taskID)
	return nil
}

// GetProgress 获取扫描进度
func (o *Orchestrator) GetProgress(ctx context.Context, taskID int) (*models.ScanProgress, error) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	if scanCtx, exists := o.scans[taskID]; exists {
		return scanCtx.Progress, nil
	}

	return nil, errors.NotFound("scan task not found or not running")
}

// IsRunning 检查是否正在运行
func (o *Orchestrator) IsRunning(taskID int) bool {
	o.mu.RLock()
	defer o.mu.RUnlock()
	_, exists := o.scans[taskID]
	return exists
}

// GetRunningCount 获取运行中的扫描数量
func (o *Orchestrator) GetRunningCount() int {
	o.mu.RLock()
	defer o.mu.RUnlock()
	return len(o.scans)
}

// runScan 运行扫描
func (o *Orchestrator) runScan(scanCtx *ScanContext, process *ScanProcess) {
	o.logger.Info("Running scan: task_id=%d, target=%s", scanCtx.TaskID, scanCtx.Request.TargetURL)

	defer func() {
		o.mu.Lock()
		delete(o.scans, scanCtx.TaskID)
		o.processMgr.Remove(scanCtx.TaskID)
		o.mu.Unlock()
	}()

	// 创建输出解析器
	parser := NewOutputParser(
		o.onVulnerability(scanCtx.TaskID),
		o.onProgress(scanCtx.TaskID),
	)

	// 使用 scanCtx 的 context 而不是 Background
	ctx := scanCtx.Request.Context
	if ctx == nil {
		ctx = context.Background()
	}

	// 运行扫描
	if err := process.Run(ctx, parser); err != nil {
		o.logger.Error("Scan failed: task_id=%d, error=%v", scanCtx.TaskID, err)
		o.handleScanError(scanCtx.TaskID, err)
		return
	}

	// 扫描完成
	vulnCount := int(scanCtx.VulnCount.Load())
	o.logger.Info("Scan completed: task_id=%d, vuln_count=%d", scanCtx.TaskID, vulnCount)
	o.onScanCompleted(scanCtx.TaskID, vulnCount)
}

// onVulnerability 处理漏洞发现
func (o *Orchestrator) onVulnerability(taskID int) func(*NucleiOutput) {
	return func(output *NucleiOutput) {
		o.mu.RLock()
		scanCtx, exists := o.scans[taskID]
		o.mu.RUnlock()

		if exists {
			count := scanCtx.VulnCount.Add(1)
			o.logger.Debug("Vulnerability found: task_id=%d, count=%d, vuln=%s", taskID, count, output.Name)
		}

		// 使用 scanCtx 的 context（如果存在），否则使用 Background
		ctx := context.Background()
		if exists && scanCtx.Request.Context != nil {
			ctx = scanCtx.Request.Context
		}

		// 发布漏洞发现事件
		o.eventBus.PublishAsync(ctx, event.Event{
			Type: event.EventVulnFound,
			Data: map[string]interface{}{
				"taskId": taskID,
				"vuln":   output,
			},
		})

		// 记录指标
		metrics.Global.IncrementVulnerability(output.Severity)
	}
}

// onProgress 处理进度更新
func (o *Orchestrator) onProgress(taskID int) func(ScanProgress) {
	return func(progress ScanProgress) {
		o.mu.RLock()
		scanCtx, exists := o.scans[taskID]
		o.mu.RUnlock()

		if exists {
			scanCtx.ProgressMu.Lock()
			scanCtx.Progress = &models.ScanProgress{
				TaskID:          progress.TaskID,
				Status:          progress.Status,
				TotalTemplates:  progress.TotalTemplates,
				Executed:        progress.Executed,
				Progress:        progress.Progress,
				CurrentTemplate: progress.CurrentTemplate,
			}
			scanCtx.ProgressMu.Unlock()

			// 记录模板执行指标
			if progress.Executed > 0 {
				for i := 0; i < progress.Executed; i++ {
					metrics.Global.RecordTemplateExecuted()
				}
			}
		}

		// 使用 scanCtx 的 context（如果存在），否则使用 Background
		ctx := context.Background()
		if exists && scanCtx.Request.Context != nil {
			ctx = scanCtx.Request.Context
		}

		// 发布进度事件
		o.eventBus.PublishAsync(ctx, event.Event{
			Type: event.EventScanProgress,
			Data: map[string]interface{}{
				"taskId":   taskID,
				"progress": progress,
			},
		})

		// 更新数据库中的进度
		if o.scanRepo != nil {
			dbProgress := models.ScanProgress{
				TaskID:          progress.TaskID,
				Status:          progress.Status,
				TotalTemplates:  progress.TotalTemplates,
				Executed:        progress.Executed,
				Progress:        progress.Progress,
				CurrentTemplate: progress.CurrentTemplate,
			}
			if err := o.scanRepo.UpdateProgress(ctx, taskID, dbProgress); err != nil {
				o.logger.Warn("Failed to update scan progress in database: task_id=%d, error=%v", taskID, err)
			}
		}
	}
}

// onScanCompleted 处理扫描完成
func (o *Orchestrator) onScanCompleted(taskID int, vulnCount int) {
	o.eventBus.PublishAsync(context.Background(), event.Event{
		Type: event.EventScanCompleted,
		Data: map[string]interface{}{
			"taskId":    taskID,
			"vulnCount": vulnCount,
		},
	})

	// 记录指标
	o.mu.RLock()
	scanCtx, exists := o.scans[taskID]
	o.mu.RUnlock()

	if exists {
		duration := time.Since(scanCtx.StartTime)
		metrics.Global.IncrementScanCompleted(duration)
	}
}

// handleScanError 处理扫描错误
func (o *Orchestrator) handleScanError(taskID int, err error) {
	o.eventBus.PublishAsync(context.Background(), event.Event{
		Type: event.EventScanFailed,
		Data: map[string]interface{}{
			"taskId": taskID,
			"error":  errors.SanitizeUserError(err),
		},
	})

	// 记录指标
	metrics.Global.IncrementScanFailed()

	// 根据错误类型记录
	if context.Canceled == err {
		metrics.Global.RecordError("timeout")
	} else {
		metrics.Global.RecordError("network")
	}
}

// GetStatus 获取 Nuclei 状态
func (o *Orchestrator) GetStatus() models.NucleiStatus {
	return models.NucleiStatus{
		Available: o.nuclei.IsAvailable(),
		Version:   o.nuclei.GetVersion(),
		Path:      o.nuclei.GetBinary(),
	}
}
