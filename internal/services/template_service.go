package services

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repository"
)

type TemplateService struct {
	repo *repository.TemplateRepository
}

type TemplateFilter struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Category string `json:"category"`
	Search   string `json:"search"`
	Severity string `json:"severity"`
	Author   string `json:"author"`
}

type CategoryStats struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

type PaginatedTemplatesResult struct {
	Templates     []models.NucleiTemplate `json:"templates"`
	Total         int                     `json:"total"`
	CategoryStats []CategoryStats         `json:"categoryStats"`
	FilteredTotal int                     `json:"filteredTotal"`
}

func NewTemplateService(repo *repository.TemplateRepository) *TemplateService {
	return &TemplateService{repo: repo}
}

func (s *TemplateService) GetAllTemplates() ([]models.NucleiTemplate, error) {
	const pageSize = 1000
	var allTemplates []models.NucleiTemplate

	for page := 1; ; page++ {
		result, err := s.GetTemplatesPaginated(page, pageSize)
		if err != nil {
			return nil, err
		}
		allTemplates = append(allTemplates, result.Templates...)
		if len(allTemplates) >= result.Total {
			break
		}
	}

	return allTemplates, nil
}

func (s *TemplateService) GetTemplatesPaginated(page, pageSize int) (*PaginatedTemplatesResult, error) {
	templatesDir := s.repo.GetTemplatesDir()

	if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
		return &PaginatedTemplatesResult{
			Templates: []models.NucleiTemplate{},
			Total:     0,
		}, nil
	}

	var files []string
	err := s.repo.WalkTemplatesDir(func(path, category, id string) error {
		files = append(files, path)
		return nil
	})

	if err != nil {
		return nil, err
	}

	total := len(files)
	start := (page - 1) * pageSize
	if start >= total {
		return &PaginatedTemplatesResult{
			Templates: []models.NucleiTemplate{},
			Total:     total,
		}, nil
	}

	end := start + pageSize
	if end > total {
		end = total
	}

	pagedFiles := files[start:end]
	templates := s.parseTemplateFilesSimple(pagedFiles, templatesDir)

	sort.Slice(templates, func(i, j int) bool {
		return templates[i].ID < templates[j].ID
	})

	return &PaginatedTemplatesResult{
		Templates: templates,
		Total:     total,
	}, nil
}

func (s *TemplateService) parseTemplateFilesSimple(files []string, templatesDir string) []models.NucleiTemplate {
	templates := make([]models.NucleiTemplate, 0, len(files))
	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, 10)

	for _, filePath := range files {
		wg.Add(1)
		go func(fp string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			content, err := s.repo.ReadTemplateFile(fp)
			if err != nil {
				return
			}

			template := ParseNucleiTemplate(content, fp, templatesDir)
			if template != nil {
				mu.Lock()
				templates = append(templates, *template)
				mu.Unlock()
			}
		}(filePath)
	}

	wg.Wait()
	return templates
}

func (s *TemplateService) GetTemplatesPaginatedV2(filter TemplateFilter) (*PaginatedTemplatesResult, error) {
	templatesDir := s.repo.GetTemplatesDir()

	if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
		return emptyPaginatedResult(), nil
	}

	allFiles, categoryMap := s.collectTemplateFiles()
	total := len(allFiles)

	if total == 0 {
		return emptyPaginatedResult(), nil
	}

	categoryStats := s.buildCategoryStats(categoryMap)
	filteredFiles := s.applyFilters(allFiles, filter)
	filteredTotal := len(filteredFiles)

	start := (filter.Page - 1) * filter.PageSize
	if start >= filteredTotal {
		return &PaginatedTemplatesResult{
			Templates:     []models.NucleiTemplate{},
			Total:         total,
			CategoryStats: categoryStats,
			FilteredTotal: filteredTotal,
		}, nil
	}

	end := start + filter.PageSize
	if end > filteredTotal {
		end = filteredTotal
	}

	pagedFiles := filteredFiles[start:end]
	templates := s.parseTemplateFiles(pagedFiles, filter)

	return &PaginatedTemplatesResult{
		Templates:     templates,
		Total:         total,
		CategoryStats: categoryStats,
		FilteredTotal: filteredTotal,
	}, nil
}

func emptyPaginatedResult() *PaginatedTemplatesResult {
	return &PaginatedTemplatesResult{
		Templates:     []models.NucleiTemplate{},
		Total:         0,
		CategoryStats: []CategoryStats{},
		FilteredTotal: 0,
	}
}

func (s *TemplateService) collectTemplateFiles() ([]templateFileInfo, map[string]int) {
	var files []templateFileInfo
	var mu sync.Mutex
	categoryMap := make(map[string]int)

	s.repo.WalkTemplatesDir(func(path, category, id string) error {
		mu.Lock()
		categoryMap[category]++
		files = append(files, templateFileInfo{
			path:     path,
			category: category,
			id:       id,
		})
		mu.Unlock()
		return nil
	})

	return files, categoryMap
}

type templateFileInfo struct {
	path     string
	category string
	id       string
}

func (s *TemplateService) buildCategoryStats(categoryMap map[string]int) []CategoryStats {
	var stats []CategoryStats
	for cat, count := range categoryMap {
		stats = append(stats, CategoryStats{
			Category: cat,
			Count:    count,
		})
	}
	sort.Slice(stats, func(i, j int) bool {
		return stats[i].Count > stats[j].Count
	})
	return stats
}

func (s *TemplateService) applyFilters(files []templateFileInfo, filter TemplateFilter) []templateFileInfo {
	var result []templateFileInfo
	lowerSearch := strings.ToLower(filter.Search)
	lowerCategory := strings.ToLower(filter.Category)

	for _, file := range files {
		if lowerCategory != "" && lowerCategory != "all" {
			if !strings.Contains(strings.ToLower(file.category), lowerCategory) {
				continue
			}
		}

		if lowerSearch != "" {
			if !strings.Contains(strings.ToLower(file.id), lowerSearch) {
				result = append(result, file)
				continue
			}
		}

		result = append(result, file)
	}

	if lowerSearch != "" && filter.Severity == "" && filter.Author == "" {
		result = s.applySearchFilter(result, lowerSearch)
	}

	return result
}

func (s *TemplateService) applySearchFilter(files []templateFileInfo, lowerSearch string) []templateFileInfo {
	var result []templateFileInfo

	for _, file := range files {
		if strings.Contains(strings.ToLower(file.id), lowerSearch) {
			result = append(result, file)
			continue
		}

		content, err := s.repo.ReadTemplateFile(file.path)
		if err != nil {
			continue
		}

		if s.matchesSearchCriteria(content, lowerSearch) {
			result = append(result, file)
		}
	}

	return result
}

func (s *TemplateService) matchesSearchCriteria(content []byte, lowerSearch string) bool {
	contentStr := string(content)

	if idx := strings.Index(contentStr, "name:"); idx > 0 {
		endIdx := strings.Index(contentStr[idx:], "\n")
		if endIdx > 0 {
			name := strings.ToLower(strings.TrimSpace(contentStr[idx+5 : idx+endIdx]))
			if strings.Contains(name, lowerSearch) {
				return true
			}
		}
	}

	tagsStart := strings.Index(contentStr, "tags:")
	if tagsStart > 0 {
		tagsEnd := strings.Index(contentStr[tagsStart:], "\n\n")
		if tagsEnd < 0 {
			tagsEnd = len(contentStr)
		}
		tagsSection := contentStr[tagsStart : tagsStart+tagsEnd]
		if strings.Contains(strings.ToLower(tagsSection), lowerSearch) {
			return true
		}
	}

	return false
}

func (s *TemplateService) parseTemplateFiles(files []templateFileInfo, filter TemplateFilter) []models.NucleiTemplate {
	templatesDir := s.repo.GetTemplatesDir()
	templates := make([]models.NucleiTemplate, 0, len(files))

	var wg sync.WaitGroup
	var mu sync.Mutex
	sem := make(chan struct{}, 10)

	for _, file := range files {
		wg.Add(1)
		go func(fi templateFileInfo) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			content, err := s.repo.ReadTemplateFile(fi.path)
			if err != nil {
				return
			}

			template := ParseNucleiTemplate(content, fi.path, templatesDir)
			if template == nil {
				return
			}

			if filter.Severity != "" && !strings.EqualFold(template.Severity, filter.Severity) {
				return
			}
			if filter.Author != "" && !strings.EqualFold(template.Author, filter.Author) {
				return
			}

			mu.Lock()
			templates = append(templates, *template)
			mu.Unlock()
		}(file)
	}

	wg.Wait()

	sort.Slice(templates, func(i, j int) bool {
		return templates[i].ID < templates[j].ID
	})

	return templates
}

func (s *TemplateService) GetTemplateByPath(path string) (*models.NucleiTemplate, error) {
	templatesDir := s.repo.GetTemplatesDir()

	if !s.repo.TemplateExists(path) {
		return nil, os.ErrNotExist
	}

	content, err := s.repo.ReadTemplateFile(path)
	if err != nil {
		return nil, err
	}

	return ParseNucleiTemplate(content, path, templatesDir), nil
}

func (s *TemplateService) SearchTemplates(keyword string) ([]models.NucleiTemplate, error) {
	filter := TemplateFilter{
		Page:    1,
		PageSize: 10000,
		Search:  keyword,
	}

	result, err := s.GetTemplatesPaginatedV2(filter)
	if err != nil {
		return nil, err
	}

	return result.Templates, nil
}

func (s *TemplateService) GetCategories() ([]CategoryStats, error) {
	_, categoryMap := s.collectTemplateFiles()
	return s.buildCategoryStats(categoryMap), nil
}

func (s *TemplateService) SetTemplateEnabled(templateID string, enabled bool) error {
	templatesDir := s.repo.GetTemplatesDir()
	templatePath := filepath.Join(templatesDir, templateID+".yaml")

	if !s.repo.TemplateExists(templatePath) {
		return os.ErrNotExist
	}

	content, err := s.repo.ReadTemplateFile(templatePath)
	if err != nil {
		return err
	}

	contentStr := string(content)
	if !strings.Contains(contentStr, "# disabled") {
		return nil
	}

	var newLines []string
	lines := strings.Split(contentStr, "\n")
	for _, line := range lines {
		if !strings.Contains(line, "# disabled") {
			newLines = append(newLines, line)
		}
	}

	newContent := strings.Join(newLines, "\n")
	return os.WriteFile(templatePath, []byte(newContent), 0644)
}

func (s *TemplateService) GetTemplateEnabled(templateID string) (bool, error) {
	templatesDir := s.repo.GetTemplatesDir()
	templatePath := filepath.Join(templatesDir, templateID+".yaml")

	if !s.repo.TemplateExists(templatePath) {
		return false, os.ErrNotExist
	}

	content, err := s.repo.ReadTemplateFile(templatePath)
	if err != nil {
		return false, err
	}

	return !strings.Contains(string(content), "# disabled"), nil
}
