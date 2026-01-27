package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
)

// Template 统一的模板模型（内置 + 自定义）
type Template struct {
	ID            int              `json:"id"`
	Source        string          `json:"source"`      // "builtin" | "custom"
	TemplateID    string          `json:"template_id"` // 原始模板 ID
	Name          string          `json:"name"`
	Severity      string          `json:"severity"`
	Category      string          `json:"category"`
	Author        string          `json:"author"`
	Path          string          `json:"path"`
	Content       string          `json:"content"` // 自定义模板的 YAML 内容
	Enabled       bool            `json:"enabled"`
	Description   string          `json:"description"`
	Impact        string          `json:"impact"`
	Remediation   string          `json:"remediation"`
	Tags          []string        `json:"tags"`       // 改为标准类型
	Reference     []string        `json:"reference"`  // 改为标准类型
	Metadata      map[string]string `json:"metadata"`   // 改为标准类型
	NucleiVersion string          `json:"nuclei_version,omitempty"`
	OfficialPath  string          `json:"official_path,omitempty"`
	CreatedAt     string          `json:"created_at"`
	UpdatedAt     string          `json:"updated_at"`
}

// TemplateFilter 模板过滤器
type TemplateFilterUnified struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Source   string `json:"source"` // "builtin" | "custom" | "all" | ""
	Category string `json:"category"`
	Search   string `json:"search"`
	Severity string `json:"severity"`
	Author   string `json:"author"`
	Enabled  *bool  `json:"enabled"` // 可选的启用状态过滤
}

// StringSlice 用于存储 JSON 数组到数据库
type StringSlice []string

func (s StringSlice) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	data, err := json.Marshal(s)
	return string(data), err
}

func (s *StringSlice) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case string:
		data = []byte(v)
	case []byte:
		data = v
	default:
		return fmt.Errorf("unsupported type for StringSlice: %T", value)
	}
	return json.Unmarshal(data, s)
}

// MarshalJSON 实现 json.Marshaler 接口，确保 Wails 能正确序列化
func (s StringSlice) MarshalJSON() ([]byte, error) {
	if s == nil {
		return []byte("[]"), nil
	}
	return json.Marshal([]string(s))
}

// JSONMap 用于存储 JSON 对象到数据库
type JSONMap map[string]string

func (j JSONMap) Value() (driver.Value, error) {
	if len(j) == 0 {
		return "{}", nil
	}
	data, err := json.Marshal(j)
	return string(data), err
}

func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = map[string]string{}
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case string:
		data = []byte(v)
	case []byte:
		data = v
	default:
		return fmt.Errorf("unsupported type for JSONMap: %T", value)
	}
	return json.Unmarshal(data, j)
}

// MarshalJSON 实现 json.Marshaler 接口，确保 Wails 能正确序列化
func (j JSONMap) MarshalJSON() ([]byte, error) {
	if j == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(map[string]string(j))
}

// Match 检查模板是否匹配过滤条件
func (f *TemplateFilterUnified) Match(template *Template) bool {
	// Source 过滤
	if f.Source != "" && f.Source != "all" && template.Source != f.Source {
		return false
	}

	// Category 过滤
	if f.Category != "" && f.Category != "all" && template.Category != f.Category {
		return false
	}

	// Severity 过滤
	if f.Severity != "" && f.Severity != "all" && template.Severity != f.Severity {
		return false
	}

	// Author 过滤
	if f.Author != "" && !strings.EqualFold(template.Author, f.Author) {
		return false
	}

	// Enabled 过滤
	if f.Enabled != nil && template.Enabled != *f.Enabled {
		return false
	}

	// Search 过滤
	if f.Search != "" {
		searchLower := strings.ToLower(f.Search)
		nameMatch := strings.Contains(strings.ToLower(template.Name), searchLower)
		idMatch := strings.Contains(strings.ToLower(template.TemplateID), searchLower)
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

// BuildWhereClause 构建 SQL WHERE 子句和参数
func (f *TemplateFilterUnified) BuildWhereClause() (string, []interface{}) {
	conditions := []string{}
	args := []interface{}{}

	if f.Source != "" && f.Source != "all" {
		conditions = append(conditions, "source = ?")
		args = append(args, f.Source)
	}

	if f.Category != "" && f.Category != "all" {
		conditions = append(conditions, "category = ?")
		args = append(args, f.Category)
	}

	if f.Severity != "" && f.Severity != "all" {
		conditions = append(conditions, "severity = ?")
		args = append(args, f.Severity)
	}

	if f.Author != "" {
		conditions = append(conditions, "author = ?")
		args = append(args, f.Author)
	}

	if f.Enabled != nil {
		conditions = append(conditions, "enabled = ?")
		args = append(args, *f.Enabled)
	}

	if f.Search != "" {
		// 使用 LIKE 搜索
		conditions = append(conditions, "(name LIKE ? OR template_id LIKE ? OR description LIKE ?)")
		searchPattern := "%" + f.Search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	return whereClause, args
}

// CreateTemplateRequest 创建自定义模板请求
type CreateTemplateRequest struct {
	Name        string   `json:"name"`
	Content     string   `json:"content"`
	Severity    string   `json:"severity"`
	Category    string   `json:"category"`
	Author      string   `json:"author"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Enabled     bool     `json:"enabled"`
}

// UpdateTemplateRequest 更新自定义模板请求
type UpdateTemplateRequest struct {
	Name        *string  `json:"name,omitempty"`
	Content     *string  `json:"content,omitempty"`
	Severity    *string  `json:"severity,omitempty"`
	Category    *string  `json:"category,omitempty"`
	Author      *string  `json:"author,omitempty"`
	Description *string  `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Enabled     *bool    `json:"enabled,omitempty"`
}

// SyncStats 同步统计
type SyncStats struct {
	Inserted int `json:"inserted"`
	Updated  int `json:"updated"`
	Deleted  int `json:"deleted"`
	Total    int `json:"total"`
}

// TemplatePageResponse 分页响应（Wails 可序列化）
// 使用值类型而非指针，确保 Wails 能正确序列化
type TemplatePageResponse struct {
	Templates []Template `json:"templates"`
	Total     int        `json:"total"`
}

// ToDTO 将 Template 转换为可序列化的 DTO
func (t *Template) ToDTO() map[string]interface{} {
	return map[string]interface{}{
		"id":             t.ID,
		"source":         t.Source,
		"template_id":    t.TemplateID,
		"name":           t.Name,
		"severity":       t.Severity,
		"category":       t.Category,
		"author":         t.Author,
		"path":           t.Path,
		"content":        t.Content,
		"enabled":        t.Enabled,
		"description":    t.Description,
		"impact":         t.Impact,
		"remediation":    t.Remediation,
		"tags":           []string(t.Tags),
		"reference":      []string(t.Reference),
		"metadata":       map[string]string(t.Metadata),
		"nuclei_version": t.NucleiVersion,
		"official_path":  t.OfficialPath,
		"created_at":     t.CreatedAt,
		"updated_at":     t.UpdatedAt,
	}
}
