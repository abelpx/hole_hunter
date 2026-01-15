package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// TargetHandler 目标处理器
type TargetHandler struct {
	service *svc.TargetService
}

// NewTargetHandler 创建目标处理器
func NewTargetHandler(service *svc.TargetService) *TargetHandler {
	return &TargetHandler{service: service}
}

// GetAll 获取所有目标
func (h *TargetHandler) GetAll(ctx context.Context) ([]*models.Target, error) {
	return h.service.GetAll(ctx)
}

// GetByID 根据 ID 获取目标
func (h *TargetHandler) GetByID(ctx context.Context, id int) (*models.Target, error) {
	return h.service.GetByID(ctx, id)
}

// Create 创建目标
func (h *TargetHandler) Create(ctx context.Context, name, url, description string, tags []string) (*models.Target, error) {
	return h.service.Create(ctx, &svc.CreateTargetRequest{
		Name:        name,
		URL:         url,
		Description: description,
		Tags:        tags,
	})
}

// Update 更新目标
func (h *TargetHandler) Update(ctx context.Context, id int, name, url, description string, tags []string) error {
	return h.service.Update(ctx, id, &svc.UpdateTargetRequest{
		Name:        &name,
		URL:         &url,
		Description: &description,
		Tags:        tags,
	})
}

// Delete 删除目标
func (h *TargetHandler) Delete(ctx context.Context, id int) error {
	return h.service.Delete(ctx, id)
}
