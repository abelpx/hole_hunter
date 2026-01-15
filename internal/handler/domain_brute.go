package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// DomainBruteHandler 域名暴力破解处理器
type DomainBruteHandler struct {
	service *svc.DomainBruteService
}

// NewDomainBruteHandler 创建域名暴力破解处理器
func NewDomainBruteHandler(service *svc.DomainBruteService) *DomainBruteHandler {
	return &DomainBruteHandler{service: service}
}

// CreateTask 创建任务
func (h *DomainBruteHandler) CreateTask(ctx context.Context, domain string, wordlist []string, timeout, batchSize int) (int, error) {
	return h.service.CreateTask(ctx, domain, wordlist, timeout, batchSize)
}

// GetTaskByID 获取任务
func (h *DomainBruteHandler) GetTaskByID(ctx context.Context, id int) (*models.DomainBruteTask, error) {
	return h.service.GetTaskByID(ctx, id)
}

// GetAllTasks 获取所有任务
func (h *DomainBruteHandler) GetAllTasks(ctx context.Context) ([]*models.DomainBruteTask, error) {
	return h.service.GetAllTasks(ctx)
}

// GetResults 获取结果
func (h *DomainBruteHandler) GetResults(ctx context.Context, taskID int) ([]*models.DomainBruteResult, error) {
	return h.service.GetResults(ctx, taskID)
}

// CreateResult 创建结果
func (h *DomainBruteHandler) CreateResult(ctx context.Context, result *models.DomainBruteResult) error {
	return h.service.CreateResult(ctx, result)
}
