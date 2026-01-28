package svc

import (
	"context"
	"fmt"

	"github.com/holehunter/holehunter/internal/infrastructure/config"
	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/infrastructure/logger"
	"github.com/holehunter/holehunter/internal/metrics"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
	"github.com/holehunter/holehunter/internal/scanner"
	"github.com/holehunter/holehunter/internal/utils"
)

// ScanService 扫描服务
type ScanService struct {
	scanRepo   *repo.ScanRepository
	targetRepo *repo.TargetRepository
	scanner    *scanner.Orchestrator
	eventBus   *event.Bus
}

// NewScanService 创建扫描服务
func NewScanService(
	scanRepo *repo.ScanRepository,
	targetRepo *repo.TargetRepository,
	eventBus *event.Bus,
	logger *logger.Logger,
	cfg *config.Config,
) *ScanService {
	nucleiClient := scanner.NewNucleiClientWithTemplates(cfg.DataDir, cfg.TemplatesDir)
	orchestrator := scanner.NewOrchestrator(nucleiClient, eventBus, logger, cfg.MaxConcurrent, metrics.Global, scanRepo)

	return &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    orchestrator,
		eventBus:   eventBus,
	}
}

// GetAll 获取所有扫描任务
func (s *ScanService) GetAll(ctx context.Context) ([]*models.ScanTask, error) {
	return s.scanRepo.GetAll(ctx)
}

// GetByID 根据 ID 获取扫描任务
func (s *ScanService) GetByID(ctx context.Context, id int) (*models.ScanTask, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid scan task id")
	}
	return s.scanRepo.GetByID(ctx, id)
}

// GetByTargetID 根据目标 ID 获取扫描任务
func (s *ScanService) GetByTargetID(ctx context.Context, targetID int) ([]*models.ScanTask, error) {
	if targetID <= 0 {
		return nil, errors.InvalidInput("invalid target id")
	}
	return s.scanRepo.GetByTargetID(ctx, targetID)
}

// Create 创建扫描任务
func (s *ScanService) Create(ctx context.Context, req *CreateScanRequest) (*models.ScanTask, error) {
	// 输入验证
	if req.Name == "" {
		return nil, errors.InvalidInput("scan task name is required")
	}
	if req.TargetID <= 0 {
		return nil, errors.InvalidInput("invalid target id")
	}
	if req.Strategy == "" {
		return nil, errors.InvalidInput("scan strategy is required")
	}

	// 验证目标存在
	target, err := s.targetRepo.GetByID(ctx, req.TargetID)
	if err != nil {
		if errors.Is(err, errors.ErrCodeNotFound) {
			return nil, errors.NotFound("target not found")
		}
		return nil, errors.Wrap(err, "failed to get target")
	}
	_ = target // 用于后续使用

	// 创建扫描任务
	task := &models.ScanTask{
		Name:          &req.Name,
		TargetID:      req.TargetID,
		Status:        "pending",
		Strategy:      req.Strategy,
		TemplatesUsed: req.Templates,
		Progress:      0,
	}

	if err := s.scanRepo.Create(ctx, task); err != nil {
		return nil, errors.Wrap(err, "failed to create scan task")
	}

	return task, nil
}

// Start 启动扫描任务
func (s *ScanService) Start(ctx context.Context, taskID int) error {
	// 获取任务
	task, err := s.scanRepo.GetByID(ctx, taskID)
	if err != nil {
		return errors.Wrap(err, "failed to get scan task")
	}

	// 状态检查
	if task.Status != "pending" && task.Status != "stopped" {
		return errors.Conflict(fmt.Sprintf("scan task is %s, cannot start", task.Status))
	}

	// 获取目标信息
	target, err := s.targetRepo.GetByID(ctx, task.TargetID)
	if err != nil {
		return errors.Wrap(err, "failed to get target")
	}

	// 构建扫描请求
	scanReq := scanner.ScanRequest{
		Context:   ctx,
		TaskID:    taskID,
		Name:      utils.DerefString(task.Name),
		TargetID:  task.TargetID,
		TargetURL: target.URL,
		Strategy:  task.Strategy,
		Templates: task.TemplatesUsed,
	}

	// 启动扫描
	if err := s.scanner.Scan(ctx, scanReq); err != nil {
		return errors.ScanFailed("failed to start scan", err)
	}

	// 更新状态
	if err := s.scanRepo.UpdateStatus(ctx, taskID, "running"); err != nil {
		return errors.Wrap(err, "failed to update scan status")
	}

	return nil
}

// Stop 停止扫描任务
func (s *ScanService) Stop(ctx context.Context, taskID int) error {
	// 获取任务
	task, err := s.scanRepo.GetByID(ctx, taskID)
	if err != nil {
		return errors.Wrap(err, "failed to get scan task")
	}

	// 状态检查
	if task.Status != "running" {
		return errors.Conflict("scan task is not running")
	}

	// 停止扫描
	if err := s.scanner.Stop(ctx, taskID); err != nil {
		return errors.Wrap(err, "failed to stop scanner")
	}

	// 更新状态
	if err := s.scanRepo.UpdateStatus(ctx, taskID, "stopped"); err != nil {
		return errors.Wrap(err, "failed to update scan status")
	}

	return nil
}

// GetProgress 获取扫描进度
func (s *ScanService) GetProgress(ctx context.Context, taskID int) (*models.ScanProgress, error) {
	// 先从 Scanner 获取实时进度
	if s.scanner.IsRunning(taskID) {
		return s.scanner.GetProgress(ctx, taskID)
	}

	// 如果不在运行中，从数据库获取最终状态
	task, err := s.scanRepo.GetByID(ctx, taskID)
	if err != nil {
		return nil, err
	}

	return &models.ScanProgress{
		TaskID: taskID,
		Status: task.Status,
	}, nil
}

// UpdateProgress 更新扫描进度
func (s *ScanService) UpdateProgress(ctx context.Context, taskID int, progress models.ScanProgress) error {
	if err := s.scanRepo.UpdateProgress(ctx, taskID, progress); err != nil {
		return err
	}

	// 发布事件
	s.eventBus.PublishAsync(ctx, event.Event{
		Type: event.EventScanProgress,
		Data: map[string]interface{}{
			"taskId":   taskID,
			"progress": progress,
		},
	})

	return nil
}

// Delete 删除扫描任务
func (s *ScanService) Delete(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.InvalidInput("invalid scan task id")
	}

	// 检查任务状态
	task, err := s.scanRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if task.Status == "running" {
		return errors.Conflict("cannot delete running scan task, stop it first")
	}

	return s.scanRepo.Delete(ctx, id)
}

// GetStats 获取扫描统计
func (s *ScanService) GetStats(ctx context.Context) (*ScanStats, error) {
	counts, err := s.scanRepo.CountByStatus(ctx)
	if err != nil {
		return nil, err
	}

	return &ScanStats{
		Total:     sumValues(counts),
		Pending:   counts["pending"],
		Running:   counts["running"],
		Completed: counts["completed"],
		Failed:    counts["failed"],
		Stopped:   counts["stopped"],
	}, nil
}

// GetNucleiStatus 获取 Nuclei 状态
func (s *ScanService) GetNucleiStatus() *models.NucleiStatus {
	status := s.scanner.GetStatus()
	return &status
}

// CreateScanRequest 创建扫描请求
type CreateScanRequest struct {
	Name      string
	TargetID  int
	Strategy  string
	Templates []string
}

// ScanStats 扫描统计
type ScanStats struct {
	Total     int
	Pending   int
	Running   int
	Completed int
	Failed    int
	Stopped   int
}

func sumValues(m map[string]int) int {
	sum := 0
	for _, v := range m {
		sum += v
	}
	return sum
}

// UpdateStatus 更新扫描任务状态
func (s *ScanService) UpdateStatus(ctx context.Context, taskID int, status string) error {
	if taskID <= 0 {
		return errors.InvalidInput("invalid scan task id")
	}
	if status == "" {
		return errors.InvalidInput("status cannot be empty")
	}

	return s.scanRepo.UpdateStatus(ctx, taskID, status)
}
