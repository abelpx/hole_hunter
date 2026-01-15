package svc

import (
	"context"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// ScenarioService 场景分组服务
type ScenarioService struct {
	repo *repo.ScenarioRepository
}

// NewScenarioService 创建场景分组服务
func NewScenarioService(repo *repo.ScenarioRepository) *ScenarioService {
	return &ScenarioService{repo: repo}
}

// GetAll 获取所有场景分组
func (s *ScenarioService) GetAll(ctx context.Context) ([]*models.ScenarioGroup, error) {
	return s.repo.GetAll(ctx)
}

// GetByID 根据 ID 获取场景分组
func (s *ScenarioService) GetByID(ctx context.Context, id string) (*models.ScenarioGroup, error) {
	if id == "" {
		return nil, errors.InvalidInput("invalid scenario group id")
	}
	return s.repo.GetByID(ctx, id)
}

// Create 创建场景分组
func (s *ScenarioService) Create(ctx context.Context, req *CreateScenarioGroupRequest) (*models.ScenarioGroup, error) {
	if req.Name == "" {
		return nil, errors.InvalidInput("scenario group name is required")
	}
	if req.ID == "" {
		return nil, errors.InvalidInput("scenario group id is required")
	}

	group := &models.ScenarioGroup{
		ID:          req.ID,
		Name:        req.Name,
		Description: req.Description,
		TemplateIDs: req.TemplateIDs,
		CreatedAt:   0,
		UpdatedAt:   0,
	}

	if err := s.repo.Create(ctx, group); err != nil {
		return nil, err
	}

	return group, nil
}

// Update 更新场景分组
func (s *ScenarioService) Update(ctx context.Context, id string, req *UpdateScenarioGroupRequest) error {
	if id == "" {
		return errors.InvalidInput("invalid scenario group id")
	}

	group, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if req.Name != nil {
		group.Name = *req.Name
	}
	if req.Description != nil {
		group.Description = *req.Description
	}
	if req.TemplateIDs != nil {
		group.TemplateIDs = req.TemplateIDs
	}

	return s.repo.Update(ctx, group)
}

// Delete 删除场景分组
func (s *ScenarioService) Delete(ctx context.Context, id string) error {
	if id == "" {
		return errors.InvalidInput("invalid scenario group id")
	}
	return s.repo.Delete(ctx, id)
}

// AddTemplates 添加模板到场景分组
func (s *ScenarioService) AddTemplates(ctx context.Context, id string, templateIDs []string) error {
	if id == "" {
		return errors.InvalidInput("invalid scenario group id")
	}

	group, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 去重
	templatesMap := make(map[string]bool)
	for _, tid := range group.TemplateIDs {
		templatesMap[tid] = true
	}
	for _, tid := range templateIDs {
		templatesMap[tid] = true
	}

	var result []string
	for tid := range templatesMap {
		result = append(result, tid)
	}

	group.TemplateIDs = result
	return s.repo.Update(ctx, group)
}

// RemoveTemplates 从场景分组移除模板
func (s *ScenarioService) RemoveTemplates(ctx context.Context, id string, templateIDs []string) error {
	if id == "" {
		return errors.InvalidInput("invalid scenario group id")
	}

	group, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 创建要移除的模板 ID 集合
	removeMap := make(map[string]bool)
	for _, tid := range templateIDs {
		removeMap[tid] = true
	}

	var result []string
	for _, tid := range group.TemplateIDs {
		if !removeMap[tid] {
			result = append(result, tid)
		}
	}

	group.TemplateIDs = result
	return s.repo.Update(ctx, group)
}

// CreateScenarioGroupRequest 创建场景分组请求
type CreateScenarioGroupRequest struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	TemplateIDs []string `json:"templateIds"`
}

// UpdateScenarioGroupRequest 更新场景分组请求
type UpdateScenarioGroupRequest struct {
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	TemplateIDs []string `json:"templateIds,omitempty"`
}
