package services

import (
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repository"
)

type TargetService struct {
	repo *repository.TargetRepository
}

func NewTargetService(repo *repository.TargetRepository) *TargetService {
	return &TargetService{repo: repo}
}

func (s *TargetService) GetAll() ([]models.Target, error) {
	return s.repo.GetAll()
}

func (s *TargetService) GetByID(id int) (*models.Target, error) {
	return s.repo.GetByID(id)
}

func (s *TargetService) Create(name, url, description string, tags []string) (*models.Target, error) {
	return s.repo.Create(name, url, description, tags)
}

func (s *TargetService) Update(id int, name, url, description string, tags []string) error {
	return s.repo.Update(id, name, url, description, tags)
}

func (s *TargetService) Delete(id int) error {
	return s.repo.Delete(id)
}
