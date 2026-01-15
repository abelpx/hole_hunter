package svc

import (
	"context"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// TargetService 目标服务
type TargetService struct {
	repo     *repo.TargetRepository
	eventBus *event.Bus
}

// NewTargetService 创建目标服务
func NewTargetService(repo *repo.TargetRepository, eventBus *event.Bus) *TargetService {
	return &TargetService{
		repo:     repo,
		eventBus: eventBus,
	}
}

// GetAll 获取所有目标
func (s *TargetService) GetAll(ctx context.Context) ([]*models.Target, error) {
	return s.repo.GetAll(ctx)
}

// GetByID 根据 ID 获取目标
func (s *TargetService) GetByID(ctx context.Context, id int) (*models.Target, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid target id")
	}
	return s.repo.GetByID(ctx, id)
}

// Create 创建目标
func (s *TargetService) Create(ctx context.Context, req *CreateTargetRequest) (*models.Target, error) {
	// 输入验证
	if req.Name == "" {
		return nil, errors.InvalidInput("target name is required")
	}
	if req.URL == "" {
		return nil, errors.InvalidInput("target url is required")
	}

	// 检查 URL 是否已存在
	exists, err := s.repo.ExistsByURL(ctx, req.URL, 0)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.Conflict("target url already exists")
	}

	// 创建目标
	target := &models.Target{
		Name:        req.Name,
		URL:         req.URL,
		Description: req.Description,
		Tags:        req.Tags,
	}

	if err := s.repo.Create(ctx, target); err != nil {
		return nil, err
	}

	// 发布事件
	s.eventBus.PublishAsync(ctx, event.Event{
		Type: event.EventTargetCreated,
		Data: map[string]interface{}{
			"targetId": target.ID,
			"name":     target.Name,
			"url":      target.URL,
		},
	})

	return target, nil
}

// Update 更新目标
func (s *TargetService) Update(ctx context.Context, id int, req *UpdateTargetRequest) error {
	if id <= 0 {
		return errors.InvalidInput("invalid target id")
	}

	// 获取现有目标
	target, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 检查 URL 是否与其他目标冲突
	if req.URL != nil && *req.URL != target.URL {
		exists, err := s.repo.ExistsByURL(ctx, *req.URL, id)
		if err != nil {
			return err
		}
		if exists {
			return errors.Conflict("target url already exists")
		}
	}

	// 更新字段
	if req.Name != nil {
		target.Name = *req.Name
	}
	if req.URL != nil {
		target.URL = *req.URL
	}
	if req.Description != nil {
		target.Description = *req.Description
	}
	if req.Tags != nil {
		target.Tags = req.Tags
	}

	return s.repo.Update(ctx, target)
}

// Delete 删除目标
func (s *TargetService) Delete(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.InvalidInput("invalid target id")
	}

	// 检查是否存在
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 删除目标
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	// 发布事件
	s.eventBus.PublishAsync(ctx, event.Event{
		Type: event.EventTargetDeleted,
		Data: map[string]interface{}{
			"targetId": id,
		},
	})

	return nil
}

// CreateTargetRequest 创建目标请求
type CreateTargetRequest struct {
	Name        string
	URL         string
	Description string
	Tags        []string
}

// UpdateTargetRequest 更新目标请求
type UpdateTargetRequest struct {
	Name        *string
	URL         *string
	Description *string
	Tags        []string
}
