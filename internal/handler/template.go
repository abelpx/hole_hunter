package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// TemplateHandler 模板处理器
type TemplateHandler struct {
	service *svc.TemplateService
}

// NewTemplateHandler 创建模板处理器
func NewTemplateHandler(service *svc.TemplateService) *TemplateHandler {
	return &TemplateHandler{service: service}
}

// GetAll 获取所有模板
func (h *TemplateHandler) GetAll(ctx context.Context) ([]*models.NucleiTemplate, error) {
	return h.service.GetAll(ctx)
}

// GetByCategory 根据分类获取模板
func (h *TemplateHandler) GetByCategory(ctx context.Context, category string) ([]*models.NucleiTemplate, error) {
	return h.service.GetByCategory(ctx, category)
}

// GetBySeverity 根据严重级别获取模板
func (h *TemplateHandler) GetBySeverity(ctx context.Context, severity string) ([]*models.NucleiTemplate, error) {
	return h.service.GetBySeverity(ctx, severity)
}

// GetByID 根据 ID 获取模板
func (h *TemplateHandler) GetByID(ctx context.Context, id string) (*models.NucleiTemplate, error) {
	return h.service.GetByID(ctx, id)
}

// GetCategories 获取所有分类
func (h *TemplateHandler) GetCategories(ctx context.Context) ([]string, error) {
	return h.service.GetCategories(ctx)
}

// GetSeverities 获取所有严重级别
func (h *TemplateHandler) GetSeverities(ctx context.Context) ([]string, error) {
	return h.service.GetSeverities(ctx)
}
