package svc

import (
	"context"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// PortScanService 端口扫描服务
type PortScanService struct {
	repo *repo.PortScanRepository
}

// NewPortScanService 创建端口扫描服务
func NewPortScanService(repo *repo.PortScanRepository) *PortScanService {
	return &PortScanService{repo: repo}
}

// CreateTask 创建扫描任务
func (s *PortScanService) CreateTask(ctx context.Context, target string, ports []int, timeout, batchSize int) (int, error) {
	if target == "" {
		return 0, errors.InvalidInput("target is required")
	}
	if len(ports) == 0 {
		return 0, errors.InvalidInput("ports are required")
	}

	task := &models.PortScanTask{
		Target:    target,
		Ports:     ports,
		Timeout:   timeout,
		BatchSize: batchSize,
		Status:    "pending",
	}

	if err := s.repo.CreateTask(ctx, task); err != nil {
		return 0, err
	}

	return task.ID, nil
}

// GetTaskByID 获取任务
func (s *PortScanService) GetTaskByID(ctx context.Context, id int) (*models.PortScanTask, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid task id")
	}
	return s.repo.GetTaskByID(ctx, id)
}

// GetAllTasks 获取所有任务
func (s *PortScanService) GetAllTasks(ctx context.Context) ([]*models.PortScanTask, error) {
	return s.repo.GetAllTasks(ctx)
}

// GetResults 获取扫描结果
func (s *PortScanService) GetResults(ctx context.Context, taskID int) ([]*models.PortScanResult, error) {
	if taskID <= 0 {
		return nil, errors.InvalidInput("invalid task id")
	}
	return s.repo.GetResultsByTaskID(ctx, taskID)
}

// CreateResult 创建扫描结果
func (s *PortScanService) CreateResult(ctx context.Context, result *models.PortScanResult) error {
	return s.repo.CreateResult(ctx, result)
}
