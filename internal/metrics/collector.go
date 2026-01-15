package metrics

import (
	"runtime"
	"time"
)

// Collector 指标收集器
type Collector struct {
	metrics *Metrics
	ticker  *time.Ticker
	done    chan struct{}
}

// NewCollector 创建指标收集器
func NewCollector(m *Metrics) *Collector {
	return &Collector{
		metrics: m,
		done:    make(chan struct{}),
	}
}

// Start 启动指标收集
func (c *Collector) Start(interval time.Duration) {
	c.ticker = time.NewTicker(interval)
	go c.collect()
}

// Stop 停止指标收集
func (c *Collector) Stop() {
	close(c.done)
	if c.ticker != nil {
		c.ticker.Stop()
	}
}

// collect 定期收集系统指标
func (c *Collector) collect() {
	for {
		select {
		case <-c.ticker.C:
			c.collectSystemMetrics()
		case <-c.done:
			return
		}
	}
}

// collectSystemMetrics 收集系统指标
func (c *Collector) collectSystemMetrics() {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// 更新内存使用量（堆内存分配）
	c.metrics.UpdateMemoryUsage(int64(memStats.Alloc))

	// 更新goroutine数量
	c.metrics.UpdateActiveGoroutines(int64(runtime.NumGoroutine()))
}

// RecordScan 记录扫描指标
func (c *Collector) RecordScan(scan *ScanMetrics) {
	if scan.Success {
		c.metrics.IncrementScanCompleted(scan.Duration)
	} else {
		c.metrics.IncrementScanFailed()
	}

	// 记录模板执行数
	if scan.RequestsSent > 0 {
		for i := 0; i < scan.RequestsSent; i++ {
			c.metrics.RecordTemplateExecuted()
		}
	}

	// 记录发现的漏洞
	if scan.VulnsFound > 0 {
		for i := 0; i < scan.VulnsFound; i++ {
			c.metrics.IncrementVulnerability("unknown")
		}
	}
}

// GetSystemStats 获取系统统计信息
func (c *Collector) GetSystemStats() SystemStats {
	snapshot := c.metrics.GetSnapshot()
	return SystemStats{
		MemoryUsage:      snapshot.MemoryUsage,
		MemoryUsageMB:    snapshot.MemoryUsage / 1024 / 1024,
		ActiveGoroutines: snapshot.ActiveGoroutines,
		Uptime:           snapshot.Uptime,
	}
}

// GetScanStats 获取扫描统计信息
func (c *Collector) GetScanStats() ScanStats {
	snapshot := c.metrics.GetSnapshot()
	return ScanStats{
		TotalScans:     snapshot.TotalScans,
		RunningScans:   snapshot.RunningScans,
		CompletedScans: snapshot.CompletedScans,
		FailedScans:    snapshot.FailedScans,
		StoppedScans:   snapshot.StoppedScans,
		SuccessRate:    snapshot.SuccessRate(),
		AvgDuration:    snapshot.AverageScanDuration,
		LastDuration:   snapshot.LastScanDuration,
	}
}

// GetVulnStats 获取漏洞统计信息
func (c *Collector) GetVulnStats() VulnStats {
	snapshot := c.metrics.GetSnapshot()
	return VulnStats{
		Total:          snapshot.TotalVulns,
		Critical:       snapshot.CriticalVulns,
		High:           snapshot.HighVulns,
		Medium:         snapshot.MediumVulns,
		Low:            snapshot.LowVulns,
		AvgPerScan:     snapshot.AverageVulnsPerScan(),
		TotalTemplates: snapshot.TotalTemplates,
	}
}

// GetErrorStats 获取错误统计信息
func (c *Collector) GetErrorStats() ErrorStats {
	snapshot := c.metrics.GetSnapshot()
	return ErrorStats{
		Total:    snapshot.TotalErrors,
		Timeouts: snapshot.TimeoutErrors,
		Network:  snapshot.NetworkErrors,
		Parse:    snapshot.ParseErrors,
	}
}

// SystemStats 系统统计信息
type SystemStats struct {
	MemoryUsage      int64
	MemoryUsageMB    int64
	ActiveGoroutines int64
	Uptime           time.Duration
}

// ScanStats 扫描统计信息
type ScanStats struct {
	TotalScans     int64
	RunningScans   int64
	CompletedScans int64
	FailedScans    int64
	StoppedScans   int64
	SuccessRate    float64
	AvgDuration    int64 // 毫秒
	LastDuration   int64 // 毫秒
}

// VulnStats 漏洞统计信息
type VulnStats struct {
	Total          int64
	Critical       int64
	High           int64
	Medium         int64
	Low            int64
	AvgPerScan     float64
	TotalTemplates int64
}

// ErrorStats 错误统计信息
type ErrorStats struct {
	Total    int64
	Timeouts int64
	Network  int64
	Parse    int64
}
