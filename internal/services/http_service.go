package services

import (
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repository"
)

type HTTPService struct {
	repo *repository.HTTPRepository
}

func NewHTTPService(repo *repository.HTTPRepository) *HTTPService {
	return &HTTPService{repo: repo}
}

func (s *HTTPService) GetAll() ([]models.HttpRequest, error) {
	return s.repo.GetAll()
}

func (s *HTTPService) GetByID(id int) (*models.HttpRequest, error) {
	return s.repo.GetByID(id)
}

func (s *HTTPService) Create(name, method, url string, headers map[string]string, body, contentType string, tags []string) (*models.HttpRequest, error) {
	return s.repo.Create(name, method, url, headers, body, contentType, tags)
}

func (s *HTTPService) Update(id int, name, method, url string, headers map[string]string, body, contentType string, tags []string) error {
	return s.repo.Update(id, name, method, url, headers, body, contentType, tags)
}

func (s *HTTPService) Delete(id int) error {
	return s.repo.Delete(id)
}
