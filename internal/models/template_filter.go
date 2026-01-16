package models

import "strings"

// TemplateFilter represents filter options for template queries
type TemplateFilter struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Category string `json:"category"` // 分类过滤 (空字符串表示所有)
	Search   string `json:"search"`   // 搜索关键词
	Severity string `json:"severity"` // 严重程度过滤
	Author   string `json:"author"`   // 作者过滤
}

// Match checks if a template matches the filter criteria
func (f *TemplateFilter) Match(template *NucleiTemplate) bool {
	if f.Category != "" && f.Category != "all" && template.Category != f.Category {
		return false
	}

	if f.Severity != "" && f.Severity != "all" && template.Severity != f.Severity {
		return false
	}

	if f.Author != "" && template.Author != f.Author {
		return false
	}

	if f.Search != "" {
		searchLower := strings.ToLower(f.Search)
		nameMatch := strings.Contains(strings.ToLower(template.Name), searchLower)
		idMatch := strings.Contains(strings.ToLower(template.ID), searchLower)
		descMatch := strings.Contains(strings.ToLower(template.Description), searchLower)
		tagMatch := false
		for _, tag := range template.Tags {
			if strings.Contains(strings.ToLower(tag), searchLower) {
				tagMatch = true
				break
			}
		}
		if !nameMatch && !idMatch && !descMatch && !tagMatch {
			return false
		}
	}

	return true
}

// CategoryStats represents category statistics
type CategoryStats struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

// PaginatedTemplatesResult represents paginated query results with statistics
type PaginatedTemplatesResult struct {
	Templates     []NucleiTemplate `json:"templates"`
	Total         int              `json:"total"`
	CategoryStats []CategoryStats  `json:"categoryStats"` // 各分类的模板总数
	FilteredTotal int              `json:"filteredTotal"` // 应用过滤条件后的总数（用于分页计算）
}
