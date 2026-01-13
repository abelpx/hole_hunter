package services

import (
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repository"
)

type BruteService struct {
	repo *repository.BruteRepository
}

func NewBruteService(repo *repository.BruteRepository) *BruteService {
	return &BruteService{repo: repo}
}

func (s *BruteService) GetAllTasks() ([]models.BruteTask, error) {
	return s.repo.GetAllTasks()
}

func (s *BruteService) GetTaskByID(id int) (*models.BruteTask, error) {
	return s.repo.GetTaskByID(id)
}

func (s *BruteService) CreateTask(name string, requestID int, taskType string) (*models.BruteTask, error) {
	return s.repo.CreateTask(name, requestID, taskType)
}

func (s *BruteService) UpdateTaskStatus(id int, status string) error {
	return s.repo.UpdateTaskStatus(id, status)
}

func (s *BruteService) UpdateTaskProgress(id int, sent, success, failure int) error {
	return s.repo.UpdateTaskProgress(id, sent, success, failure)
}

func (s *BruteService) DeleteTask(id int) error {
	return s.repo.DeleteTask(id)
}

func (s *BruteService) GetAllPayloadSets() ([]models.BrutePayloadSet, error) {
	return s.repo.GetAllPayloadSets()
}

func (s *BruteService) GetPayloadSetByID(id int) (*models.BrutePayloadSet, error) {
	return s.repo.GetPayloadSetByID(id)
}

func (s *BruteService) CreatePayloadSet(name, setType string, config map[string]interface{}) (*models.BrutePayloadSet, error) {
	return s.repo.CreatePayloadSet(name, setType, config)
}

func (s *BruteService) DeletePayloadSet(id int) error {
	return s.repo.DeletePayloadSet(id)
}
