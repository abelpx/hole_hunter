package svc

import (
	"context"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// BruteService 暴力破解服务
type BruteService struct {
	repo *repo.BruteRepository
}

// NewBruteService 创建暴力破解服务
func NewBruteService(repo *repo.BruteRepository) *BruteService {
	return &BruteService{repo: repo}
}

// CreateTask 创建任务
func (s *BruteService) CreateTask(ctx context.Context, name string, requestID int, bruteType string) (int, error) {
	if name == "" {
		return 0, errors.InvalidInput("name is required")
	}
	if bruteType == "" {
		return 0, errors.InvalidInput("type is required")
	}

	task := &models.BruteTask{
		Name:      name,
		RequestID: requestID,
		Type:      bruteType,
		Status:    "pending",
	}

	if err := s.repo.CreateTask(ctx, task); err != nil {
		return 0, err
	}

	return task.ID, nil
}

// GetTaskByID 获取任务
func (s *BruteService) GetTaskByID(ctx context.Context, id int) (*models.BruteTask, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid task id")
	}
	return s.repo.GetTaskByID(ctx, id)
}

// GetAllTasks 获取所有任务
func (s *BruteService) GetAllTasks(ctx context.Context) ([]*models.BruteTask, error) {
	return s.repo.GetAllTasks(ctx)
}

// DeleteTask 删除任务
func (s *BruteService) DeleteTask(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.InvalidInput("invalid task id")
	}
	return s.repo.DeleteTask(ctx, id)
}

// CreatePayloadSet 创建载荷集
func (s *BruteService) CreatePayloadSet(ctx context.Context, name string, bruteType string, config map[string]interface{}) (int, error) {
	if name == "" {
		return 0, errors.InvalidInput("name is required")
	}
	if bruteType == "" {
		return 0, errors.InvalidInput("type is required")
	}

	set := &models.BrutePayloadSet{
		Name:   name,
		Type:   bruteType,
		Config: config,
	}

	if err := s.repo.CreatePayloadSet(ctx, set); err != nil {
		return 0, err
	}

	return set.ID, nil
}

// GetAllPayloadSets 获取所有载荷集
func (s *BruteService) GetAllPayloadSets(ctx context.Context) ([]*models.BrutePayloadSet, error) {
	return s.repo.GetAllPayloadSets(ctx)
}

// StartBruteTask 启动暴力破解任务
func (s *BruteService) StartBruteTask(ctx context.Context, taskID int) error {
	if taskID <= 0 {
		return errors.InvalidInput("invalid task id")
	}

	task, err := s.repo.GetTaskByID(ctx, taskID)
	if err != nil {
		return err
	}

	if task.Status != "pending" {
		return errors.InvalidInput("task is not in pending status")
	}

	// 更新任务状态为 running
	if err := s.repo.UpdateTaskStatus(ctx, taskID, "running"); err != nil {
		return err
	}

	// TODO: 实现实际的暴力破解执行逻辑
	// 这里应该启动一个 goroutine 来执行暴力破解
	// 参考端口扫描的实现方式

	return nil
}

// GetBruteTaskResults 获取暴力破解任务结果
func (s *BruteService) GetBruteTaskResults(ctx context.Context, taskID int) ([]*models.BruteResult, error) {
	if taskID <= 0 {
		return nil, errors.InvalidInput("invalid task id")
	}

	// TODO: 从数据库或内存中获取结果
	// 当前返回空数组，实际应该从 repo 获取
	return []*models.BruteResult{}, nil
}
