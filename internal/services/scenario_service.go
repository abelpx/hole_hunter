package services

import (
	"fmt"
	"time"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repository"
)

type ScenarioService struct {
	repo *repository.ScenarioRepository
}

func NewScenarioService(repo *repository.ScenarioRepository) *ScenarioService {
	return &ScenarioService{repo: repo}
}

func (s *ScenarioService) GetAll() ([]models.ScenarioGroup, error) {
	return s.repo.GetAll()
}

func (s *ScenarioService) GetByID(id string) (*models.ScenarioGroup, error) {
	return s.repo.GetByID(id)
}

func (s *ScenarioService) Create(name, description string) (*models.ScenarioGroup, error) {
	id := fmt.Sprintf("scenario-%d", time.Now().UnixNano())
	now := time.Now().Unix()

	group := models.ScenarioGroup{
		ID:          id,
		Name:        name,
		Description: description,
		TemplateIDs: []string{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(group); err != nil {
		return nil, err
	}

	return &group, nil
}

func (s *ScenarioService) Update(id, name, description string, templateIds []string) error {
	return s.repo.Update(id, func(g *models.ScenarioGroup) {
		g.Name = name
		g.Description = description
		g.TemplateIDs = templateIds
		g.UpdatedAt = time.Now().Unix()
	})
}

func (s *ScenarioService) Delete(id string) error {
	return s.repo.Delete(id)
}

func (s *ScenarioService) AddTemplates(id string, templateIds []string) error {
	return s.repo.Update(id, func(g *models.ScenarioGroup) {
		idMap := make(map[string]bool)
		for _, id := range g.TemplateIDs {
			idMap[id] = true
		}
		for _, id := range templateIds {
			idMap[id] = true
		}

		var mergedIds []string
		for id := range idMap {
			mergedIds = append(mergedIds, id)
		}
		g.TemplateIDs = mergedIds
		g.UpdatedAt = time.Now().Unix()
	})
}

func (s *ScenarioService) RemoveTemplates(id string, templateIds []string) error {
	return s.repo.Update(id, func(g *models.ScenarioGroup) {
		removeMap := make(map[string]bool)
		for _, id := range templateIds {
			removeMap[id] = true
		}

		var newIds []string
		for _, id := range g.TemplateIDs {
			if !removeMap[id] {
				newIds = append(newIds, id)
			}
		}
		g.TemplateIDs = newIds
		g.UpdatedAt = time.Now().Unix()
	})
}

func (s *ScenarioService) GetTemplates(id string, getAllTemplatesFunc func() ([]models.NucleiTemplate, error)) ([]models.NucleiTemplate, error) {
	group, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if len(group.TemplateIDs) == 0 {
		return []models.NucleiTemplate{}, nil
	}

	allTemplates, err := getAllTemplatesFunc()
	if err != nil {
		return nil, err
	}

	idMap := make(map[string]bool)
	for _, id := range group.TemplateIDs {
		idMap[id] = true
	}

	var result []models.NucleiTemplate
	for _, tmpl := range allTemplates {
		if idMap[tmpl.ID] {
			result = append(result, tmpl)
		}
	}

	return result, nil
}
