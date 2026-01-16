package svc

import (
	"context"
	"fmt"

	"github.com/holehunter/holehunter/internal/models"
	"gopkg.in/yaml.v3"
)

// TemplateService 模板服务
type TemplateService struct {
	repo TemplateRepository
}

// TemplateRepository 模板仓储接口
type TemplateRepository interface {
	GetAll(ctx context.Context) ([]*models.Template, error)
	GetByID(ctx context.Context, id int) (*models.Template, error)
	GetBySourceAndID(ctx context.Context, source, templateID string) (*models.Template, error)
	GetPage(ctx context.Context, page, pageSize int) ([]*models.Template, int, error)
	GetPageByFilter(ctx context.Context, filter *models.TemplateFilterUnified, page, pageSize int) ([]*models.Template, int, error)
	Create(ctx context.Context, template *models.Template) (*models.Template, error)
	Update(ctx context.Context, template *models.Template) error
	Delete(ctx context.Context, id int) error
	ToggleEnabled(ctx context.Context, id int, enabled bool) error
	GetStats(ctx context.Context) (map[string]int, error)
	SyncBuiltin(ctx context.Context, templates []*models.Template) (*models.SyncStats, error)
	GetCategories(ctx context.Context) ([]string, error)
	GetAuthors(ctx context.Context) ([]string, error)
	GetSeverities(ctx context.Context) ([]string, error)
	GetAllCustom(ctx context.Context) ([]*models.Template, error)
}

// NewTemplateService 创建模板服务
func NewTemplateService(repo TemplateRepository) *TemplateService {
	return &TemplateService{repo: repo}
}

// GetAll 获取所有模板
func (s *TemplateService) GetAll(ctx context.Context) ([]*models.Template, error) {
	return s.repo.GetAll(ctx)
}

// GetByID 根据 ID 获取模板
func (s *TemplateService) GetByID(ctx context.Context, id int) (*models.Template, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid template id: %d", id)
	}
	return s.repo.GetByID(ctx, id)
}

// GetPage 分页获取模板
func (s *TemplateService) GetPage(ctx context.Context, page, pageSize int) ([]*models.Template, int, error) {
	// 参数验证
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 500 {
		pageSize = 500
	}

	return s.repo.GetPage(ctx, page, pageSize)
}

// GetPageByFilter 按过滤条件分页获取模板
func (s *TemplateService) GetPageByFilter(ctx context.Context, filter *models.TemplateFilterUnified, page, pageSize int) ([]*models.Template, int, error) {
	// 参数验证
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 500 {
		pageSize = 500
	}

	return s.repo.GetPageByFilter(ctx, filter, page, pageSize)
}

// CreateCustomTemplate 创建自定义模板
func (s *TemplateService) CreateCustomTemplate(ctx context.Context, req *models.CreateTemplateRequest) (*models.Template, error) {
	// 验证 YAML 内容
	if err := s.validateYAML(req.Content); err != nil {
		return nil, fmt.Errorf("invalid YAML content: %w", err)
	}

	// 提取模板信息
	info, err := s.extractTemplateInfo(req.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to extract template info: %w", err)
	}

	// 如果请求中指定了值，使用请求的值；否则使用从 YAML 提取的值
	name := req.Name
	if name == "" {
		name = info.Name
	}
	severity := req.Severity
	if severity == "" {
		severity = info.Severity
	}
	category := req.Category
	if category == "" {
		category = info.Category
	}
	author := req.Author
	if author == "" {
		author = info.Author
	}
	tags := req.Tags
	if len(tags) == 0 {
		tags = info.Tags
	}

	template := &models.Template{
		Source:     "custom",
		TemplateID: "", // 将由数据库生成
		Name:       name,
		Severity:   severity,
		Category:   category,
		Author:     author,
		Content:    req.Content,
		Enabled:    req.Enabled,
		Tags:       tags,
	}

	return s.repo.Create(ctx, template)
}

// UpdateCustomTemplate 更新自定义模板
func (s *TemplateService) UpdateCustomTemplate(ctx context.Context, id int, req *models.UpdateTemplateRequest) error {
	// 获取现有模板
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if template.Source != "custom" {
		return fmt.Errorf("only custom templates can be updated")
	}

	// 验证 YAML 内容（如果提供）
	if req.Content != nil {
		if err := s.validateYAML(*req.Content); err != nil {
			return fmt.Errorf("invalid YAML content: %w", err)
		}
		template.Content = *req.Content
	}

	// 更新字段
	if req.Name != nil {
		template.Name = *req.Name
	}
	if req.Severity != nil {
		template.Severity = *req.Severity
	}
	if req.Category != nil {
		template.Category = *req.Category
	}
	if req.Author != nil {
		template.Author = *req.Author
	}
	if req.Description != nil {
		template.Description = *req.Description
	}
	if req.Tags != nil {
		template.Tags = req.Tags
	}
	if req.Enabled != nil {
		template.Enabled = *req.Enabled
	}

	return s.repo.Update(ctx, template)
}

// DeleteCustomTemplate 删除自定义模板
func (s *TemplateService) DeleteCustomTemplate(ctx context.Context, id int) error {
	// 验证模板存在且为自定义模板
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if template.Source != "custom" {
		return fmt.Errorf("only custom templates can be deleted")
	}

	return s.repo.Delete(ctx, id)
}

// ToggleCustomTemplate 切换自定义模板启用状态
func (s *TemplateService) ToggleCustomTemplate(ctx context.Context, id int, enabled bool) error {
	// 验证模板存在且为自定义模板
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if template.Source != "custom" {
		return fmt.Errorf("only custom templates can be toggled")
	}

	return s.repo.ToggleEnabled(ctx, id, enabled)
}

// GetStats 获取模板统计信息
func (s *TemplateService) GetStats(ctx context.Context) (map[string]int, error) {
	return s.repo.GetStats(ctx)
}

// SyncBuiltinTemplates 同步内置模板
func (s *TemplateService) SyncBuiltinTemplates(ctx context.Context, templates []*models.Template) (*models.SyncStats, error) {
	return s.repo.SyncBuiltin(ctx, templates)
}

// GetCategories 获取所有分类
func (s *TemplateService) GetCategories(ctx context.Context) ([]string, error) {
	return s.repo.GetCategories(ctx)
}

// GetAuthors 获取所有作者
func (s *TemplateService) GetAuthors(ctx context.Context) ([]string, error) {
	return s.repo.GetAuthors(ctx)
}

// GetSeverities 获取所有严重程度
func (s *TemplateService) GetSeverities(ctx context.Context) ([]string, error) {
	return s.repo.GetSeverities(ctx)
}

// GetAllCustom 获取所有自定义模板
func (s *TemplateService) GetAllCustom(ctx context.Context) ([]*models.Template, error) {
	return s.repo.GetAllCustom(ctx)
}

// GetCustomByID 根据ID获取自定义模板
func (s *TemplateService) GetCustomByID(ctx context.Context, id int) (*models.Template, error) {
	template, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if template.Source != "custom" {
		return nil, fmt.Errorf("template is not custom")
	}
	return template, nil
}

// ValidateCustomTemplate 验证自定义模板
func (s *TemplateService) ValidateCustomTemplate(ctx context.Context, content string) (bool, []string, error) {
	var warnings []string

	// YAML 格式验证
	if err := s.validateYAML(content); err != nil {
		return false, nil, err
	}

	// 提取模板信息
	info, err := s.extractTemplateInfo(content)
	if err != nil {
		return false, nil, err
	}

	// 验证必需字段
	if info.ID == "" {
		warnings = append(warnings, "missing template id")
	}
	if info.Name == "" {
		warnings = append(warnings, "missing template name")
	}
	if info.Severity == "" {
		warnings = append(warnings, "missing severity")
	}

	return len(warnings) == 0, warnings, nil
}

// GetCustomStats 获取自定义模板统计
func (s *TemplateService) GetCustomStats(ctx context.Context) (map[string]interface{}, error) {
	templates, err := s.repo.GetAllCustom(ctx)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"total":    len(templates),
		"enabled":  0,
		"disabled": 0,
	}

	for _, t := range templates {
		if t.Enabled {
			stats["enabled"] = stats["enabled"].(int) + 1
		} else {
			stats["disabled"] = stats["disabled"].(int) + 1
		}
	}

	return stats, nil
}

// validateYAML 验证 YAML 内容
func (s *TemplateService) validateYAML(content string) error {
	var template map[string]interface{}
	if err := yaml.Unmarshal([]byte(content), &template); err != nil {
		return err
	}

	// 检查必需字段
	if template["id"] == nil {
		return fmt.Errorf("template missing required field: id")
	}

	if template["info"] == nil {
		return fmt.Errorf("template missing required field: info")
	}

	return nil
}

// templateInfo 从 YAML 提取的模板信息
type templateInfo struct {
	ID          string
	Name        string
	Severity    string
	Category    string
	Author      string
	Description string
	Tags        []string
}

// extractTemplateInfo 从 YAML 内容提取模板信息
func (s *TemplateService) extractTemplateInfo(content string) (*templateInfo, error) {
	var template map[string]interface{}
	if err := yaml.Unmarshal([]byte(content), &template); err != nil {
		return nil, err
	}

	info := &templateInfo{}

	// 提取 id
	if id, ok := template["id"].(string); ok {
		info.ID = id
	}

	// 提取 info
	if infoMap, ok := template["info"].(map[string]interface{}); ok {
		if name, ok := infoMap["name"].(string); ok {
			info.Name = name
		}
		if severity, ok := infoMap["severity"].(string); ok {
			info.Severity = severity
		}
		if author, ok := infoMap["author"].(string); ok {
			info.Author = author
		}
		if description, ok := infoMap["description"].(string); ok {
			info.Description = description
		}

		// 提取 tags
		if tagsArray, ok := infoMap["tags"].([]interface{}); ok {
			for _, tag := range tagsArray {
				if tagStr, ok := tag.(string); ok {
					info.Tags = append(info.Tags, tagStr)
				}
			}
		}
	}

	return info, nil
}
