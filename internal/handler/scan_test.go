package handler

import (
	"testing"

	"github.com/holehunter/holehunter/internal/infrastructure/config"
	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/infrastructure/logger"
	"github.com/holehunter/holehunter/internal/repo"
	"github.com/holehunter/holehunter/internal/svc"
)

// TestScanHandler_NewScanHandler 测试创建扫描处理器
func TestScanHandler_NewScanHandler(t *testing.T) {
	service := &svc.ScanService{}
	handler := NewScanHandler(service)

	if handler == nil {
		t.Error("NewScanHandler() should return non-nil handler")
	}
}

// TestScanHandler_GetNucleiStatus 测试获取 Nuclei 状态
func TestScanHandler_GetNucleiStatus(t *testing.T) {
	tmpDir := t.TempDir()
	cfg := &config.Config{
		DataDir:       tmpDir,
		MaxConcurrent: 5,
	}

	eventBus := event.NewBus()
	log := logger.New("info", "")

	scanRepo := repo.NewScanRepository(nil, log)
	targetRepo := repo.NewTargetRepository(nil)

	service := svc.NewScanService(
		scanRepo,
		targetRepo,
		eventBus,
		log,
		cfg,
	)
	handler := NewScanHandler(service)

	status := handler.GetNucleiStatus()

	if status == nil {
		t.Error("GetNucleiStatus() should never return nil")
	}
}

// 注意: Handler 层主要是对 Service 层的简单代理，
// 因此大部分测试应该集中在 Service 层。
// Handler 层的测试价值相对较低，因为：
// 1. Handler 方法只是直接调用 Service 层的对应方法
// 2. 没有额外的业务逻辑
// 3. 真正的测试应该集中在 Service 层
