package metrics

import (
	"sync/atomic"
	"time"
)

// Metrics 监控指标结构体
type Metrics struct {
	// 扫描任务指标
	TotalScans     atomic.Int64
	RunningScans   atomic.Int64
	CompletedScans atomic.Int64
	FailedScans    atomic.Int64
	StoppedScans   atomic.Int64

	// 漏洞指标
	TotalVulnerabilities    atomic.Int64
	CriticalVulnerabilities atomic.Int64
	HighVulnerabilities     atomic.Int64
	MediumVulnerabilities   atomic.Int64
	LowVulnerabilities      atomic.Int64

	// 性能指标
	AverageScanDuration atomic.Int64 // 毫秒
	LastScanDuration    atomic.Int64 // 毫秒
	TotalTemplatesExec  atomic.Int64

	// 资源指标
	ActiveGoroutines atomic.Int64
	MemoryUsage      atomic.Int64 // 字节

	// 错误指标
	TotalErrors   atomic.Int64
	TimeoutErrors atomic.Int64
	NetworkErrors atomic.Int64
	ParseErrors   atomic.Int64

	startTime time.Time
}

// Global 全局指标实例
var Global = &Metrics{
	startTime: time.Now(),
}

// ScanMetrics 单次扫描的指标
type ScanMetrics struct {
	ScanID       int
	TargetID     int
	TemplateName string
	StartTime    time.Time
	EndTime      time.Time
	Duration     time.Duration
	Success      bool
	Error        string
	VulnsFound   int
	RequestsSent int
}

// IncrementScanStarted 扫描开始时调用
func (m *Metrics) IncrementScanStarted() {
	m.TotalScans.Add(1)
	m.RunningScans.Add(1)
}

// IncrementScanCompleted 扫描完成时调用
func (m *Metrics) IncrementScanCompleted(duration time.Duration) {
	m.RunningScans.Add(-1)
	m.CompletedScans.Add(1)
	m.LastScanDuration.Store(int64(duration.Milliseconds()))
	updateAverageDuration(m, duration)
}

// IncrementScanFailed 扫描失败时调用
func (m *Metrics) IncrementScanFailed() {
	m.RunningScans.Add(-1)
	m.FailedScans.Add(1)
	m.TotalErrors.Add(1)
}

// IncrementScanStopped 扫描停止时调用
func (m *Metrics) IncrementScanStopped() {
	m.RunningScans.Add(-1)
	m.StoppedScans.Add(1)
}

// IncrementVulnerability 发现漏洞时调用
func (m *Metrics) IncrementVulnerability(severity string) {
	m.TotalVulnerabilities.Add(1)
	switch severity {
	case "critical":
		m.CriticalVulnerabilities.Add(1)
	case "high":
		m.HighVulnerabilities.Add(1)
	case "medium":
		m.MediumVulnerabilities.Add(1)
	case "low":
		m.LowVulnerabilities.Add(1)
	}
}

// RecordTemplateExecuted 记录模板执行
func (m *Metrics) RecordTemplateExecuted() {
	m.TotalTemplatesExec.Add(1)
}

// RecordError 记录错误
func (m *Metrics) RecordError(errorType string) {
	m.TotalErrors.Add(1)
	switch errorType {
	case "timeout":
		m.TimeoutErrors.Add(1)
	case "network":
		m.NetworkErrors.Add(1)
	case "parse":
		m.ParseErrors.Add(1)
	}
}

// UpdateActiveGoroutines 更新活跃goroutine数
func (m *Metrics) UpdateActiveGoroutines(count int64) {
	m.ActiveGoroutines.Store(count)
}

// UpdateMemoryUsage 更新内存使用量
func (m *Metrics) UpdateMemoryUsage(bytes int64) {
	m.MemoryUsage.Store(bytes)
}

// GetSnapshot 获取指标快照
func (m *Metrics) GetSnapshot() MetricsSnapshot {
	return MetricsSnapshot{
		TotalScans:          m.TotalScans.Load(),
		RunningScans:        m.RunningScans.Load(),
		CompletedScans:      m.CompletedScans.Load(),
		FailedScans:         m.FailedScans.Load(),
		StoppedScans:        m.StoppedScans.Load(),
		TotalVulns:          m.TotalVulnerabilities.Load(),
		CriticalVulns:       m.CriticalVulnerabilities.Load(),
		HighVulns:           m.HighVulnerabilities.Load(),
		MediumVulns:         m.MediumVulnerabilities.Load(),
		LowVulns:            m.LowVulnerabilities.Load(),
		AverageScanDuration: m.AverageScanDuration.Load(),
		LastScanDuration:    m.LastScanDuration.Load(),
		TotalTemplates:      m.TotalTemplatesExec.Load(),
		ActiveGoroutines:    m.ActiveGoroutines.Load(),
		MemoryUsage:         m.MemoryUsage.Load(),
		TotalErrors:         m.TotalErrors.Load(),
		TimeoutErrors:       m.TimeoutErrors.Load(),
		NetworkErrors:       m.NetworkErrors.Load(),
		ParseErrors:         m.ParseErrors.Load(),
		Uptime:              time.Since(m.startTime),
	}
}

// Reset 重置所有指标
func (m *Metrics) Reset() {
	m.TotalScans.Store(0)
	m.RunningScans.Store(0)
	m.CompletedScans.Store(0)
	m.FailedScans.Store(0)
	m.StoppedScans.Store(0)
	m.TotalVulnerabilities.Store(0)
	m.CriticalVulnerabilities.Store(0)
	m.HighVulnerabilities.Store(0)
	m.MediumVulnerabilities.Store(0)
	m.LowVulnerabilities.Store(0)
	m.AverageScanDuration.Store(0)
	m.LastScanDuration.Store(0)
	m.TotalTemplatesExec.Store(0)
	m.ActiveGoroutines.Store(0)
	m.MemoryUsage.Store(0)
	m.TotalErrors.Store(0)
	m.TimeoutErrors.Store(0)
	m.NetworkErrors.Store(0)
	m.ParseErrors.Store(0)
	m.startTime = time.Now()
}

// MetricsSnapshot 指标快照
type MetricsSnapshot struct {
	TotalScans          int64
	RunningScans        int64
	CompletedScans      int64
	FailedScans         int64
	StoppedScans        int64
	TotalVulns          int64
	CriticalVulns       int64
	HighVulns           int64
	MediumVulns         int64
	LowVulns            int64
	AverageScanDuration int64
	LastScanDuration    int64
	TotalTemplates      int64
	ActiveGoroutines    int64
	MemoryUsage         int64
	TotalErrors         int64
	TimeoutErrors       int64
	NetworkErrors       int64
	ParseErrors         int64
	Uptime              time.Duration
}

// SuccessRate 计算扫描成功率
func (s *MetricsSnapshot) SuccessRate() float64 {
	total := s.CompletedScans + s.FailedScans
	if total == 0 {
		return 0
	}
	return float64(s.CompletedScans) / float64(total) * 100
}

// AverageVulnsPerScan 计算平均每扫描发现的漏洞数
func (s *MetricsSnapshot) AverageVulnsPerScan() float64 {
	if s.CompletedScans == 0 {
		return 0
	}
	return float64(s.TotalVulns) / float64(s.CompletedScans)
}

// updateAverageDuration 更新平均扫描时长
func updateAverageDuration(m *Metrics, newDuration time.Duration) {
	oldAvg := m.AverageScanDuration.Load()
	oldCount := m.CompletedScans.Load()
	if oldCount == 0 {
		m.AverageScanDuration.Store(int64(newDuration.Milliseconds()))
		return
	}
	// 计算新的平均值
	newAvg := (oldAvg*(oldCount-1) + int64(newDuration.Milliseconds())) / oldCount
	m.AverageScanDuration.Store(newAvg)
}

// Timer 计时器
type Timer struct {
	start time.Time
	m     *Metrics
}

// StartTimer 开始计时
func (m *Metrics) StartTimer() *Timer {
	return &Timer{
		start: time.Now(),
		m:     m,
	}
}

// Stop 停止计时并记录
func (t *Timer) Stop() time.Duration {
	duration := time.Since(t.start)
	t.m.RecordScanDuration(duration)
	return duration
}

// RecordScanDuration 记录扫描持续时间
func (m *Metrics) RecordScanDuration(duration time.Duration) {
	m.LastScanDuration.Store(int64(duration.Milliseconds()))
}
