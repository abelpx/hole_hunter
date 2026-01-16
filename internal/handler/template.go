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
func (h *TemplateHandler) GetAll(ctx context.Context) ([]*models.Template, error) {
	return h.service.GetAll(ctx)
}

// GetByID 根据 ID 获取模板
func (h *TemplateHandler) GetByID(ctx context.Context, id int) (*models.Template, error) {
	return h.service.GetByID(ctx, id)
}

// GetPage 分页获取模板
func (h *TemplateHandler) GetPage(ctx context.Context, page, pageSize int) ([]*models.Template, int, error) {
	return h.service.GetPage(ctx, page, pageSize)
}

// GetPageByFilter 根据过滤条件分页获取模板
func (h *TemplateHandler) GetPageByFilter(ctx context.Context, filter *models.TemplateFilterUnified, page, pageSize int) ([]*models.Template, int, error) {
	return h.service.GetPageByFilter(ctx, filter, page, pageSize)
}

// GetStats 获取模板统计信息
func (h *TemplateHandler) GetStats(ctx context.Context) (map[string]int, error) {
	return h.service.GetStats(ctx)
}

// GetCategories 获取所有分类
func (h *TemplateHandler) GetCategories(ctx context.Context) ([]string, error) {
	return h.service.GetCategories(ctx)
}

// GetAuthors 获取所有作者
func (h *TemplateHandler) GetAuthors(ctx context.Context) ([]string, error) {
	return h.service.GetAuthors(ctx)
}

// GetSeverities 获取所有严重程度
func (h *TemplateHandler) GetSeverities(ctx context.Context) ([]string, error) {
	return h.service.GetSeverities(ctx)
}

// CreateCustomTemplate 创建自定义模板
func (h *TemplateHandler) CreateCustomTemplate(ctx context.Context, req *models.CreateTemplateRequest) (*models.Template, error) {
	return h.service.CreateCustomTemplate(ctx, req)
}

// UpdateCustomTemplate 更新自定义模板
func (h *TemplateHandler) UpdateCustomTemplate(ctx context.Context, id int, req *models.UpdateTemplateRequest) error {
	return h.service.UpdateCustomTemplate(ctx, id, req)
}

// DeleteCustomTemplate 删除自定义模板
func (h *TemplateHandler) DeleteCustomTemplate(ctx context.Context, id int) error {
	return h.service.DeleteCustomTemplate(ctx, id)
}

// ToggleCustomTemplate 切换自定义模板启用状态
func (h *TemplateHandler) ToggleCustomTemplate(ctx context.Context, id int, enabled bool) error {
	return h.service.ToggleCustomTemplate(ctx, id, enabled)
}

// SyncBuiltinTemplates 同步内置模板
func (h *TemplateHandler) SyncBuiltinTemplates(ctx context.Context, templates []*models.Template) (*models.SyncStats, error) {
	return h.service.SyncBuiltinTemplates(ctx, templates)
}

// GetAllCustom 获取所有自定义模板
func (h *TemplateHandler) GetAllCustom(ctx context.Context) ([]*models.Template, error) {
	return h.service.GetAllCustom(ctx)
}

// GetCustomByID 根据ID获取自定义模板
func (h *TemplateHandler) GetCustomByID(ctx context.Context, id int) (*models.Template, error) {
	return h.service.GetCustomByID(ctx, id)
}

// ValidateCustomTemplate 验证自定义模板
func (h *TemplateHandler) ValidateCustomTemplate(ctx context.Context, content string) (bool, []string, error) {
	return h.service.ValidateCustomTemplate(ctx, content)
}

// GetCustomStats 获取自定义模板统计
func (h *TemplateHandler) GetCustomStats(ctx context.Context) (map[string]interface{}, error) {
	return h.service.GetCustomStats(ctx)
}

// GetTemplateService 获取模板服务（用于内部同步）
func (h *TemplateHandler) GetTemplateService() *svc.TemplateService {
	return h.service
}
