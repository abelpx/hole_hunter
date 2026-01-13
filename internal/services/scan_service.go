package services

import (
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repository"
)

type ScanService struct {
	repo *repository.ScanRepository
}

func NewScanService(repo *repository.ScanRepository) *ScanService {
	return &ScanService{repo: repo}
}

func (s *ScanService) GetAll() ([]models.ScanTask, error) {
	return s.repo.GetAll()
}

func (s *ScanService) GetByID(id int) (*models.ScanTask, error) {
	return s.repo.GetByID(id)
}

func (s *ScanService) Create(name *string, targetID int, strategy string, templates []string) (*models.ScanTask, error) {
	return s.repo.Create(name, targetID, strategy, templates)
}

func (s *ScanService) UpdateStatus(id int, status string) error {
	return s.repo.UpdateStatus(id, status)
}

func (s *ScanService) UpdateProgress(id int, progress, total, executed int) error {
	return s.repo.UpdateProgress(id, progress, total, executed)
}

func (s *ScanService) Delete(id int) error {
	return s.repo.Delete(id)
}
