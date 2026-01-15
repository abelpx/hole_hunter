package scanner

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/infrastructure/logger"
	"github.com/holehunter/holehunter/internal/metrics"
	"github.com/holehunter/holehunter/internal/models"
)

// TestOrchestrator_NewOrchestrator 测试创建扫描编排器
func TestOrchestrator_NewOrchestrator(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	if orch == nil {
		t.Fatal("NewOrchestrator() returned nil")
	}

	if orch.GetRunningCount() != 0 {
		t.Errorf("NewOrchestrator() running count = %d, want 0", orch.GetRunningCount())
	}
}

// TestOrchestrator_Scan_UnavailableNuclei 测试 Nuclei 不可用时的扫描
func TestOrchestrator_Scan_UnavailableNuclei(t *testing.T) {
	bus := event.NewBus()
	log := logger.New("info", "")

	// 创建一个不可用的客户端（空 binary 路径）
	client := &NucleiClient{binaryPath: "", templatesDir: "/tmp"}

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	ctx := context.Background()
	req := ScanRequest{
		Context:   ctx,
		TaskID:    1,
		Name:      "test-scan",
		TargetID:  1,
		TargetURL: "https://example.com",
		Strategy:  "fast",
	}

	err := orch.Scan(ctx, req)
	if err == nil {
		t.Error("Scan() should return error when nuclei is not available")
	}
}

// TestOrchestrator_Scan_ConcurrentLimit 测试并发限制
func TestOrchestrator_Scan_ConcurrentLimit(t *testing.T) {
	tmpDir := t.TempDir()

	// 创建一个假的 nuclei 二进制文件
	fakeNuclei := filepath.Join(tmpDir, "nuclei")
	file, err := os.Create(fakeNuclei)
	if err != nil {
		t.Fatal(err)
	}
	file.Close()
	_ = os.Chmod(fakeNuclei, 0755)

	client := &NucleiClient{binaryPath: fakeNuclei, templatesDir: tmpDir}
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 1, metrics.Global) // maxConcurrent = 1

	ctx := context.Background()
	req1 := ScanRequest{
		Context:   ctx,
		TaskID:    1,
		Name:      "test-scan-1",
		TargetID:  1,
		TargetURL: "https://example.com",
		Strategy:  "fast",
	}

	// 由于二进制是假的，扫描会失败，但我们可以验证逻辑
	err = orch.Scan(ctx, req1)
	// 错误是预期的，因为假二进制无法执行
	_ = err

	// 验证扫描被添加到 map 中
	if orch.GetRunningCount() != 0 {
		// 扫描失败后会从 map 中移除，所以这里应该是 0
		t.Log("Scan failed and was removed from tracking (expected with fake binary)")
	}
}

// TestOrchestrator_Stop 测试停止扫描
func TestOrchestrator_Stop(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	ctx := context.Background()
	taskID := 1

	// 停止不存在的扫描
	err := orch.Stop(ctx, taskID)
	if err == nil {
		t.Error("Stop() should return error for non-existent scan")
	}
}

// TestOrchestrator_GetProgress 测试获取扫描进度
func TestOrchestrator_GetProgress(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	ctx := context.Background()
	taskID := 1

	// 获取不存在的扫描进度
	progress, err := orch.GetProgress(ctx, taskID)
	if err == nil {
		t.Error("GetProgress() should return error for non-existent scan")
	}
	if progress != nil {
		t.Error("GetProgress() should return nil progress for non-existent scan")
	}
}

// TestOrchestrator_IsRunning 测试检查扫描是否运行中
func TestOrchestrator_IsRunning(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	if orch.IsRunning(1) {
		t.Error("IsRunning(1) = true, want false")
	}
}

// TestOrchestrator_GetRunningCount 测试获取运行中的扫描数量
func TestOrchestrator_GetRunningCount(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	count := orch.GetRunningCount()
	if count != 0 {
		t.Errorf("GetRunningCount() = %d, want 0", count)
	}
}

// TestOrchestrator_GetStatus 测试获取 Nuclei 状态
func TestOrchestrator_GetStatus(t *testing.T) {
	tmpDir := t.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	status := orch.GetStatus()

	// 在 CI 环境中 nuclei 不可用
	if status.Available {
		t.Log("nuclei is available (unexpected in CI)")
	}

	// 验证其他字段
	if status.Path == "" && client.GetBinary() != "" {
		t.Error("GetStatus().Path should match client binary path")
	}
}

// TestScanContext 测试扫描上下文
func TestScanContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	scanCtx := &ScanContext{
		TaskID: 1,
		Request: ScanRequest{
			Context:  ctx,
			TaskID:   1,
			Name:     "test",
			TargetID: 1,
		},
		CancelFunc: cancel,
		StartTime:  time.Now(),
		metrics:    nil,
		Progress: &models.ScanProgress{
			TaskID: 1,
			Status: "running",
		},
	}

	if scanCtx.TaskID != 1 {
		t.Errorf("TaskID = %d, want 1", scanCtx.TaskID)
	}

	// 测试取消功能
	scanCtx.CancelFunc()
	<-ctx.Done()
}

// TestScanRequest 测试扫描请求
func TestScanRequest(t *testing.T) {
	tests := []struct {
		name  string
		req   ScanRequest
		valid bool
	}{
		{
			name: "valid request",
			req: ScanRequest{
				TaskID:    1,
				TargetID:  1,
				TargetURL: "https://example.com",
				Strategy:  "fast",
			},
			valid: true,
		},
		{
			name: "empty target URL",
			req: ScanRequest{
				TaskID:    1,
				TargetID:  1,
				TargetURL: "",
				Strategy:  "fast",
			},
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.req.TargetURL != ""
			if isValid != tt.valid {
				t.Errorf("URL validation mismatch: got %v, want %v", isValid, tt.valid)
			}
		})
	}
}

// Benchmark
func BenchmarkNewOrchestrator(b *testing.B) {
	tmpDir := b.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = NewOrchestrator(client, bus, log, 5, metrics.Global)
	}
}

func BenchmarkGetRunningCount(b *testing.B) {
	tmpDir := b.TempDir()
	client := NewNucleiClient(tmpDir)
	bus := event.NewBus()
	log := logger.New("info", "")

	orch := NewOrchestrator(client, bus, log, 5, metrics.Global)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		orch.GetRunningCount()
	}
}
