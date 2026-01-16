package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// BruteHandler 暴力破解处理器
type BruteHandler struct {
	service *svc.BruteService
}

// NewBruteHandler 创建暴力破解处理器
func NewBruteHandler(service *svc.BruteService) *BruteHandler {
	return &BruteHandler{service: service}
}

// CreateTask 创建任务
func (h *BruteHandler) CreateTask(ctx context.Context, name string, requestID int, bruteType string) (int, error) {
	return h.service.CreateTask(ctx, name, requestID, bruteType)
}

// GetTaskByID 获取任务
func (h *BruteHandler) GetTaskByID(ctx context.Context, id int) (*models.BruteTask, error) {
	return h.service.GetTaskByID(ctx, id)
}

// GetAllTasks 获取所有任务
func (h *BruteHandler) GetAllTasks(ctx context.Context) ([]*models.BruteTask, error) {
	return h.service.GetAllTasks(ctx)
}

// DeleteTask 删除任务
func (h *BruteHandler) DeleteTask(ctx context.Context, id int) error {
	return h.service.DeleteTask(ctx, id)
}

// CreatePayloadSet 创建载荷集
func (h *BruteHandler) CreatePayloadSet(ctx context.Context, name string, bruteType string, config map[string]interface{}) (int, error) {
	return h.service.CreatePayloadSet(ctx, name, bruteType, config)
}

// GetAllPayloadSets 获取所有载荷集
func (h *BruteHandler) GetAllPayloadSets(ctx context.Context) ([]*models.BrutePayloadSet, error) {
	return h.service.GetAllPayloadSets(ctx)
}

// StartBruteTask 启动暴力破解任务
func (h *BruteHandler) StartBruteTask(ctx context.Context, taskID int) error {
	return h.service.StartBruteTask(ctx, taskID)
}

// GetBruteTaskResults 获取暴力破解任务结果
func (h *BruteHandler) GetBruteTaskResults(ctx context.Context, taskID int) ([]*models.BruteResult, error) {
	return h.service.GetBruteTaskResults(ctx, taskID)
}
