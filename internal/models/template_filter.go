package models

// TemplateFilter represents filter options for template queries
type TemplateFilter struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Category string `json:"category"` // 分类过滤 (空字符串表示所有)
	Search   string `json:"search"`   // 搜索关键词
	Severity string `json:"severity"` // 严重程度过滤
	Author   string `json:"author"`   // 作者过滤
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
