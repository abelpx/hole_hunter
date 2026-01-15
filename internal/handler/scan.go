package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// ScanHandler 扫描处理器
type ScanHandler struct {
	service *svc.ScanService
}

// NewScanHandler 创建扫描处理器
func NewScanHandler(service *svc.ScanService) *ScanHandler {
	return &ScanHandler{service: service}
}

// GetAll 获取所有扫描任务
func (h *ScanHandler) GetAll(ctx context.Context) ([]*models.ScanTask, error) {
	return h.service.GetAll(ctx)
}

// GetByID 根据 ID 获取扫描任务
func (h *ScanHandler) GetByID(ctx context.Context, id int) (*models.ScanTask, error) {
	return h.service.GetByID(ctx, id)
}

// GetByTargetID 根据目标 ID 获取扫描任务
func (h *ScanHandler) GetByTargetID(ctx context.Context, targetID int) ([]*models.ScanTask, error) {
	return h.service.GetByTargetID(ctx, targetID)
}

// Create 创建扫描任务
func (h *ScanHandler) Create(ctx context.Context, name string, targetID int, strategy string, templates []string) (*models.ScanTask, error) {
	return h.service.Create(ctx, &svc.CreateScanRequest{
		Name:      name,
		TargetID:  targetID,
		Strategy:  strategy,
		Templates: templates,
	})
}

// Start 启动扫描任务
func (h *ScanHandler) Start(ctx context.Context, taskID int) error {
	return h.service.Start(ctx, taskID)
}

// Stop 停止扫描任务
func (h *ScanHandler) Stop(ctx context.Context, taskID int) error {
	return h.service.Stop(ctx, taskID)
}

// GetProgress 获取扫描进度
func (h *ScanHandler) GetProgress(ctx context.Context, taskID int) (*models.ScanProgress, error) {
	return h.service.GetProgress(ctx, taskID)
}

// Delete 删除扫描任务
func (h *ScanHandler) Delete(ctx context.Context, id int) error {
	return h.service.Delete(ctx, id)
}

// GetStats 获取扫描统计
func (h *ScanHandler) GetStats(ctx context.Context) (*svc.ScanStats, error) {
	return h.service.GetStats(ctx)
}

// GetNucleiStatus 获取 Nuclei 状态
func (h *ScanHandler) GetNucleiStatus() *models.NucleiStatus {
	return h.service.GetNucleiStatus()
}
