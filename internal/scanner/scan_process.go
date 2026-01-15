package scanner

import (
	"context"
	"os/exec"
	"syscall"
	"sync"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
)

const (
	gracefulShutdownTimeout = 10 * time.Second
)

// ScanProcess 表示一个正在运行的扫描进程
type ScanProcess struct {
	ID           int
	Cmd          *exec.Cmd
	Progress     ScanProgress
	ProgressMu   sync.RWMutex
	CancelFunc   context.CancelFunc
	startTime    time.Time
	vulnCount    int
	executed     int
	total        int
	currentTempl string
}

// NewScanProcess 创建新的扫描进程
func NewScanProcess(id int, cmd *exec.Cmd) *ScanProcess {
	return &ScanProcess{
		ID:        id,
		Cmd:       cmd,
		startTime: time.Now(),
		Progress: ScanProgress{
			TaskID: id,
			Status: "starting",
		},
	}
}

// Run 执行扫描
func (p *ScanProcess) Run(ctx context.Context, parser *OutputParser) error {
	// 创建管道
	stdout, err := p.Cmd.StdoutPipe()
	if err != nil {
		return errors.Internal("failed to create stdout pipe", err)
	}
	stderr, err := p.Cmd.StderrPipe()
	if err != nil {
		return errors.Internal("failed to create stderr pipe", err)
	}

	// 启动命令
	if err := p.Cmd.Start(); err != nil {
		return errors.Internal("failed to start nuclei", err)
	}

	p.setProgress(ScanProgress{
		TaskID: p.ID,
		Status: "running",
	})

	// 使用 WaitGroup 管理解析 goroutine
	var wg sync.WaitGroup
	wg.Add(2)

	// 启动解析 goroutine
	go func() {
		defer wg.Done()
		parser.ParseStdout(stdout)
	}()
	go func() {
		defer wg.Done()
		parser.ParseStderr(stderr)
	}()

	// 等待解析完成的 goroutine
	doneParsing := make(chan struct{})
	go func() {
		wg.Wait()
		close(doneParsing)
	}()

	// 等待解析完成或 context 取消
	select {
	case <-doneParsing:
		// 解析完成，等待命令结束
	case <-ctx.Done():
		// Context 取消，终止进程
		_ = p.Cmd.Process.Kill()
		return ctx.Err()
	}

	// 等待命令完成
	if err := p.Cmd.Wait(); err != nil {
		return errors.Internal("scan failed", err)
	}

	p.setProgress(ScanProgress{
		TaskID:    p.ID,
		Status:    "completed",
		VulnCount: p.vulnCount,
	})

	return nil
}

// Stop 停止扫描（优雅关闭）
func (p *ScanProcess) Stop() error {
	if p.Cmd.Process == nil {
		return errors.Internal("process not started", nil)
	}

	// 首先尝试优雅终止（SIGTERM）
	if err := p.Cmd.Process.Signal(syscall.SIGTERM); err == nil {
		// 等待进程自然结束，最多等待 10 秒
		done := make(chan error, 1)
		go func() {
			done <- p.Cmd.Wait()
		}()

		select {
		case <-done:
			// 进程已正常结束
			p.setProgress(ScanProgress{
				TaskID: p.ID,
				Status: "stopped",
			})
			return nil
		case <-time.After(gracefulShutdownTimeout):
			// 超时后强制杀死
		}
	}

	// 强制杀死进程
	if err := p.Cmd.Process.Kill(); err != nil {
		return errors.Internal("failed to kill process", err)
	}

	p.setProgress(ScanProgress{
		TaskID: p.ID,
		Status: "stopped",
	})

	return nil
}

// UpdateProgress 更新进度
func (p *ScanProcess) UpdateProgress(progress ScanProgress) {
	p.ProgressMu.Lock()
	defer p.ProgressMu.Unlock()

	p.Progress = progress
	p.Progress.TaskID = p.ID

	// 更新内部状态
	if progress.VulnCount > 0 {
		p.vulnCount = progress.VulnCount
	}
	if progress.Executed > 0 {
		p.executed = progress.Executed
	}
	if progress.TotalTemplates > 0 {
		p.total = progress.TotalTemplates
	}
	if progress.CurrentTemplate != "" {
		p.currentTempl = progress.CurrentTemplate
	}
}

// GetProgress 获取当前进度
func (p *ScanProcess) GetProgress() ScanProgress {
	p.ProgressMu.RLock()
	defer p.ProgressMu.RUnlock()
	return p.Progress
}

// GetVulnCount 获取漏洞数量
func (p *ScanProcess) GetVulnCount() int {
	p.ProgressMu.RLock()
	defer p.ProgressMu.RUnlock()
	return p.vulnCount
}

// GetDuration 获取运行时长
func (p *ScanProcess) GetDuration() time.Duration {
	return time.Since(p.startTime)
}

// IsRunning 检查是否正在运行
func (p *ScanProcess) IsRunning() bool {
	p.ProgressMu.RLock()
	defer p.ProgressMu.RUnlock()
	return p.Progress.Status == "running"
}

// setProgress 设置进度（内部方法）
func (p *ScanProcess) setProgress(progress ScanProgress) {
	p.ProgressMu.Lock()
	p.Progress = progress
	p.Progress.TaskID = p.ID
	p.ProgressMu.Unlock()
}

// IncrementVulnCount 增加漏洞计数
func (p *ScanProcess) IncrementVulnCount() {
	p.ProgressMu.Lock()
	p.vulnCount++
	p.Progress.VulnCount = p.vulnCount
	p.ProgressMu.Unlock()
}

// ScanProcessManager 管理多个扫描进程
type ScanProcessManager struct {
	processes map[int]*ScanProcess
	mu        sync.RWMutex
}

// NewScanProcessManager 创建进程管理器
func NewScanProcessManager() *ScanProcessManager {
	return &ScanProcessManager{
		processes: make(map[int]*ScanProcess),
	}
}

// Add 添加进程
func (m *ScanProcessManager) Add(process *ScanProcess) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.processes[process.ID] = process
}

// Remove 移除进程
func (m *ScanProcessManager) Remove(id int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.processes, id)
}

// Get 获取进程
func (m *ScanProcessManager) Get(id int) (*ScanProcess, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	process, ok := m.processes[id]
	return process, ok
}

// Exists 检查进程是否存在
func (m *ScanProcessManager) Exists(id int) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, ok := m.processes[id]
	return ok
}

// List 获取所有进程
func (m *ScanProcessManager) List() []*ScanProcess {
	m.mu.RLock()
	defer m.mu.RUnlock()

	processes := make([]*ScanProcess, 0, len(m.processes))
	for _, p := range m.processes {
		processes = append(processes, p)
	}
	return processes
}

// StopAll 停止所有进程
func (m *ScanProcessManager) StopAll() {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, p := range m.processes {
		_ = p.Stop()
	}
}

// Count 获取进程数量
func (m *ScanProcessManager) Count() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.processes)
}
