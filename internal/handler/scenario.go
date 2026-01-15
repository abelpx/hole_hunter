package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// ScenarioHandler 场景分组处理器
type ScenarioHandler struct {
	service *svc.ScenarioService
}

// NewScenarioHandler 创建场景分组处理器
func NewScenarioHandler(service *svc.ScenarioService) *ScenarioHandler {
	return &ScenarioHandler{service: service}
}

// GetAll 获取所有场景分组
func (h *ScenarioHandler) GetAll(ctx context.Context) ([]*models.ScenarioGroup, error) {
	return h.service.GetAll(ctx)
}

// GetByID 根据 ID 获取场景分组
func (h *ScenarioHandler) GetByID(ctx context.Context, id string) (*models.ScenarioGroup, error) {
	return h.service.GetByID(ctx, id)
}

// Create 创建场景分组
func (h *ScenarioHandler) Create(ctx context.Context, id, name, description string, templateIDs []string) (*models.ScenarioGroup, error) {
	return h.service.Create(ctx, &svc.CreateScenarioGroupRequest{
		ID:          id,
		Name:        name,
		Description: description,
		TemplateIDs: templateIDs,
	})
}

// Update 更新场景分组
func (h *ScenarioHandler) Update(ctx context.Context, id string, name, description *string, templateIDs []string) error {
	return h.service.Update(ctx, id, &svc.UpdateScenarioGroupRequest{
		Name:        name,
		Description: description,
		TemplateIDs: templateIDs,
	})
}

// Delete 删除场景分组
func (h *ScenarioHandler) Delete(ctx context.Context, id string) error {
	return h.service.Delete(ctx, id)
}

// AddTemplates 添加模板到场景分组
func (h *ScenarioHandler) AddTemplates(ctx context.Context, id string, templateIDs []string) error {
	return h.service.AddTemplates(ctx, id, templateIDs)
}

// RemoveTemplates 从场景分组移除模板
func (h *ScenarioHandler) RemoveTemplates(ctx context.Context, id string, templateIDs []string) error {
	return h.service.RemoveTemplates(ctx, id, templateIDs)
}
