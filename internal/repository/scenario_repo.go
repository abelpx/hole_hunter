package repository

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/holehunter/holehunter/internal/models"
)

type ScenarioRepository struct {
	filePath string
	mu       sync.RWMutex
}

func NewScenarioRepository(dataDir string) *ScenarioRepository {
	return &ScenarioRepository{
		filePath: filepath.Join(dataDir, "scenario-groups.json"),
	}
}

func (r *ScenarioRepository) load() ([]models.ScenarioGroup, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := os.ReadFile(r.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.ScenarioGroup{}, nil
		}
		return nil, err
	}

	var groups []models.ScenarioGroup
	if err := json.Unmarshal(data, &groups); err != nil {
		return nil, err
	}

	return groups, nil
}

func (r *ScenarioRepository) save(groups []models.ScenarioGroup) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := json.MarshalIndent(groups, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(r.filePath, data, 0644)
}

func (r *ScenarioRepository) GetAll() ([]models.ScenarioGroup, error) {
	return r.load()
}

func (r *ScenarioRepository) GetByID(id string) (*models.ScenarioGroup, error) {
	groups, err := r.load()
	if err != nil {
		return nil, err
	}

	for _, group := range groups {
		if group.ID == id {
			return &group, nil
		}
	}

	return nil, fmt.Errorf("scenario group not found: %s", id)
}

func (r *ScenarioRepository) Create(group models.ScenarioGroup) error {
	groups, err := r.load()
	if err != nil {
		return err
	}

	groups = append(groups, group)
	return r.save(groups)
}

func (r *ScenarioRepository) Update(id string, updater func(*models.ScenarioGroup)) error {
	groups, err := r.load()
	if err != nil {
		return err
	}

	for i, g := range groups {
		if g.ID == id {
			updater(&groups[i])
			return r.save(groups)
		}
	}

	return fmt.Errorf("scenario group not found: %s", id)
}

func (r *ScenarioRepository) Delete(id string) error {
	groups, err := r.load()
	if err != nil {
		return err
	}

	var newGroups []models.ScenarioGroup
	found := false
	for _, g := range groups {
		if g.ID != id {
			newGroups = append(newGroups, g)
		} else {
			found = true
		}
	}

	if !found {
		return fmt.Errorf("scenario group not found: %s", id)
	}

	return r.save(newGroups)
}
