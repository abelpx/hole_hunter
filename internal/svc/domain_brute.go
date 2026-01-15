package svc

import (
	"context"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// DomainBruteService 域名暴力破解服务
type DomainBruteService struct {
	repo *repo.DomainBruteRepository
}

// NewDomainBruteService 创建域名暴力破解服务
func NewDomainBruteService(repo *repo.DomainBruteRepository) *DomainBruteService {
	return &DomainBruteService{repo: repo}
}

// CreateTask 创建任务
func (s *DomainBruteService) CreateTask(ctx context.Context, domain string, wordlist []string, timeout, batchSize int) (int, error) {
	if domain == "" {
		return 0, errors.InvalidInput("domain is required")
	}
	if len(wordlist) == 0 {
		return 0, errors.InvalidInput("wordlist is required")
	}

	task := &models.DomainBruteTask{
		Domain:    domain,
		Wordlist:  wordlist,
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
func (s *DomainBruteService) GetTaskByID(ctx context.Context, id int) (*models.DomainBruteTask, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid task id")
	}
	return s.repo.GetTaskByID(ctx, id)
}

// GetAllTasks 获取所有任务
func (s *DomainBruteService) GetAllTasks(ctx context.Context) ([]*models.DomainBruteTask, error) {
	return s.repo.GetAllTasks(ctx)
}

// GetResults 获取结果
func (s *DomainBruteService) GetResults(ctx context.Context, taskID int) ([]*models.DomainBruteResult, error) {
	if taskID <= 0 {
		return nil, errors.InvalidInput("invalid task id")
	}
	return s.repo.GetResultsByTaskID(ctx, taskID)
}

// CreateResult 创建结果
func (s *DomainBruteService) CreateResult(ctx context.Context, result *models.DomainBruteResult) error {
	return s.repo.CreateResult(ctx, result)
}
