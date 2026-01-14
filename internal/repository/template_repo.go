package repository

import (
	"os"
	"path/filepath"
	"strings"
)

type TemplateRepository struct {
	templatesDir string
}

func NewTemplateRepository(templatesDir string) *TemplateRepository {
	return &TemplateRepository{templatesDir: templatesDir}
}

func (r *TemplateRepository) GetTemplatesDir() string {
	return r.templatesDir
}

func (r *TemplateRepository) WalkTemplatesDir(callback func(path string, category, id string) error) error {
	if _, err := os.Stat(r.templatesDir); os.IsNotExist(err) {
		return nil
	}

	return filepath.Walk(r.templatesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		if info.IsDir() || !strings.HasSuffix(path, ".yaml") {
			return nil
		}

		relPath, _ := filepath.Rel(r.templatesDir, path)
		id := strings.TrimSuffix(relPath, ".yaml")
		parts := strings.Split(relPath, string(filepath.Separator))
		category := "other"
		if len(parts) > 0 && parts[0] != "" {
			category = parts[0]
		}

		return callback(path, category, id)
	})
}

func (r *TemplateRepository) ReadTemplateFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func (r *TemplateRepository) TemplateExists(path string) bool {
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return false
	}
	return true
}
