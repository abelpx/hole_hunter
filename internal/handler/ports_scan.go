package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// PortScanHandler 端口扫描处理器
type PortScanHandler struct {
	service *svc.PortScanService
}

// NewPortScanHandler 创建端口扫描处理器
func NewPortScanHandler(service *svc.PortScanService) *PortScanHandler {
	return &PortScanHandler{service: service}
}

// CreateTask 创建扫描任务
func (h *PortScanHandler) CreateTask(ctx context.Context, target string, ports []int, timeout, batchSize int) (int, error) {
	return h.service.CreateTask(ctx, target, ports, timeout, batchSize)
}

// GetTaskByID 获取任务
func (h *PortScanHandler) GetTaskByID(ctx context.Context, id int) (*models.PortScanTask, error) {
	return h.service.GetTaskByID(ctx, id)
}

// GetAllTasks 获取所有任务
func (h *PortScanHandler) GetAllTasks(ctx context.Context) ([]*models.PortScanTask, error) {
	return h.service.GetAllTasks(ctx)
}

// GetResults 获取扫描结果
func (h *PortScanHandler) GetResults(ctx context.Context, taskID int) ([]*models.PortScanResult, error) {
	return h.service.GetResults(ctx, taskID)
}

// CreateResult 创建扫描结果
func (h *PortScanHandler) CreateResult(ctx context.Context, result *models.PortScanResult) error {
	return h.service.CreateResult(ctx, result)
}
