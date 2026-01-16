package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/holehunter/holehunter/internal/models"
)

// TemplateRepository 模板仓储
type TemplateRepository struct {
	db *sql.DB
}

// NewTemplateRepository 创建模板仓储
func NewTemplateRepository(db *sql.DB) *TemplateRepository {
	return &TemplateRepository{db: db}
}

// GetAll 获取所有模板
func (r *TemplateRepository) GetAll(ctx context.Context) ([]*models.Template, error) {
	query := `
		SELECT id, source, template_id, name, severity, category, author,
		       path, content, enabled, description, impact, remediation,
		       tags, reference, metadata, nuclei_version, official_path,
		       created_at, updated_at
		FROM templates
		ORDER BY category, name
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query templates: %w", err)
	}
	defer rows.Close()

	return r.scanTemplates(rows)
}

// GetAllCustom 获取所有自定义模板
func (r *TemplateRepository) GetAllCustom(ctx context.Context) ([]*models.Template, error) {
	query := `
		SELECT id, source, template_id, name, severity, category, author,
		       path, content, enabled, description, impact, remediation,
		       tags, reference, metadata, nuclei_version, official_path,
		       created_at, updated_at
		FROM templates
		WHERE source = 'custom'
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query custom templates: %w", err)
	}
	defer rows.Close()

	return r.scanTemplates(rows)
}

// GetByID 根据 ID 获取模板
func (r *TemplateRepository) GetByID(ctx context.Context, id int) (*models.Template, error) {
	query := `
		SELECT id, source, template_id, name, severity, category, author,
		       path, content, enabled, description, impact, remediation,
		       tags, reference, metadata, nuclei_version, official_path,
		       created_at, updated_at
		FROM templates
		WHERE id = ?
	`

	row := r.db.QueryRowContext(ctx, query, id)
	return r.scanTemplate(row)
}

// GetBySourceAndID 根据 source 和 template_id 获取模板
func (r *TemplateRepository) GetBySourceAndID(ctx context.Context, source, templateID string) (*models.Template, error) {
	query := `
		SELECT id, source, template_id, name, severity, category, author,
		       path, content, enabled, description, impact, remediation,
		       tags, reference, metadata, nuclei_version, official_path,
		       created_at, updated_at
		FROM templates
		WHERE source = ? AND template_id = ?
	`

	row := r.db.QueryRowContext(ctx, query, source, templateID)
	return r.scanTemplate(row)
}

// GetPage 分页获取模板
func (r *TemplateRepository) GetPage(ctx context.Context, page, pageSize int) ([]*models.Template, int, error) {
	// 获取总数
	var total int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM templates").Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count templates: %w", err)
	}

	// 分页查询
	offset := (page - 1) * pageSize
	query := `
		SELECT id, source, template_id, name, severity, category, author,
		       path, content, enabled, description, impact, remediation,
		       tags, reference, metadata, nuclei_version, official_path,
		       created_at, updated_at
		FROM templates
		ORDER BY category, name
		LIMIT ? OFFSET ?
	`

	rows, err := r.db.QueryContext(ctx, query, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query templates page: %w", err)
	}
	defer rows.Close()

	templates, err := r.scanTemplates(rows)
	if err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}

// GetPageByFilter 按过滤条件分页获取模板
func (r *TemplateRepository) GetPageByFilter(ctx context.Context, filter *models.TemplateFilterUnified, page, pageSize int) ([]*models.Template, int, error) {
	whereClause, args := filter.BuildWhereClause()

	// 获取总数
	countQuery := "SELECT COUNT(*) FROM templates " + whereClause
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count filtered templates: %w", err)
	}

	// 分页查询
	offset := (page - 1) * pageSize
	query := `
		SELECT id, source, template_id, name, severity, category, author,
		       path, content, enabled, description, impact, remediation,
		       tags, reference, metadata, nuclei_version, official_path,
		       created_at, updated_at
		FROM templates
		` + whereClause + `
		ORDER BY category, name
		LIMIT ? OFFSET ?
	`

	args = append(args, pageSize, offset)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query filtered templates page: %w", err)
	}
	defer rows.Close()

	templates, err := r.scanTemplates(rows)
	if err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}

// Create 创建自定义模板
func (r *TemplateRepository) Create(ctx context.Context, template *models.Template) (*models.Template, error) {
	// 确保 source 为 custom
	if template.Source != "custom" {
		return nil, fmt.Errorf("only custom templates can be created")
	}

	// 如果没有指定 template_id，生成一个
	if template.TemplateID == "" {
		template.TemplateID = fmt.Sprintf("custom-%d", template.ID)
	}

	query := `
		INSERT INTO templates (
			source, template_id, name, severity, category, author,
			path, content, enabled, description, impact, remediation,
			tags, reference, metadata
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		template.Source, template.TemplateID, template.Name, template.Severity,
		template.Category, template.Author, template.Path, template.Content,
		template.Enabled, template.Description, template.Impact,
		template.Remediation, stringSliceToJSON(template.Tags),
		stringSliceToJSON(template.Reference), mapToJSON(template.Metadata),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get last insert id: %w", err)
	}

	return r.GetByID(ctx, int(id))
}

// Update 更新模板
func (r *TemplateRepository) Update(ctx context.Context, template *models.Template) error {
	// 只允许更新自定义模板
	existing, err := r.GetByID(ctx, template.ID)
	if err != nil {
		return err
	}
	if existing.Source != "custom" {
		return fmt.Errorf("only custom templates can be updated")
	}

	query := `
		UPDATE templates SET
			name = ?,
			severity = ?,
			category = ?,
			author = ?,
			content = ?,
			enabled = ?,
			description = ?,
			impact = ?,
			remediation = ?,
			tags = ?,
			reference = ?,
			metadata = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	_, err = r.db.ExecContext(ctx, query,
		template.Name, template.Severity, template.Category, template.Author,
		template.Content, template.Enabled, template.Description,
		template.Impact, template.Remediation, stringSliceToJSON(template.Tags),
		stringSliceToJSON(template.Reference), mapToJSON(template.Metadata),
		template.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}

	return nil
}

// Delete 删除模板
func (r *TemplateRepository) Delete(ctx context.Context, id int) error {
	// 只允许删除自定义模板
	existing, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing.Source != "custom" {
		return fmt.Errorf("only custom templates can be deleted")
	}

	_, err = r.db.ExecContext(ctx, "DELETE FROM templates WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	return nil
}

// ToggleEnabled 切换模板启用状态
func (r *TemplateRepository) ToggleEnabled(ctx context.Context, id int, enabled bool) error {
	// 只允许修改自定义模板
	existing, err := r.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing.Source != "custom" {
		return fmt.Errorf("only custom templates can be toggled")
	}

	_, err = r.db.ExecContext(ctx, "UPDATE templates SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", enabled, id)
	if err != nil {
		return fmt.Errorf("failed to toggle template: %w", err)
	}

	return nil
}

// GetStats 获取模板统计信息
func (r *TemplateRepository) GetStats(ctx context.Context) (map[string]int, error) {
	stats := make(map[string]int)

	// 按分类统计
	rows, err := r.db.QueryContext(ctx, `
		SELECT category, COUNT(*) as count
		FROM templates
		WHERE enabled = 1
		GROUP BY category
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get category stats: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err != nil {
			return nil, err
		}
		stats[category] = count
	}

	// 按严重程度统计
	rows2, err := r.db.QueryContext(ctx, `
		SELECT severity, COUNT(*) as count
		FROM templates
		WHERE enabled = 1
		GROUP BY severity
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get severity stats: %w", err)
	}
	defer rows2.Close()

	for rows2.Next() {
		var severity string
		var count int
		if err := rows2.Scan(&severity, &count); err != nil {
			return nil, err
		}
		stats[severity] = count
	}

	// 总数
	var total int
	err = r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM templates WHERE enabled = 1").Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}
	stats["total"] = total

	return stats, nil
}

// SyncBuiltin 同步内置模板
func (r *TemplateRepository) SyncBuiltin(ctx context.Context, templates []*models.Template) (*models.SyncStats, error) {
	stats := &models.SyncStats{}

	for _, tmpl := range templates {
		tmpl.Source = "builtin"
		_, err := r.GetBySourceAndID(ctx, "builtin", tmpl.TemplateID)

		if err == sql.ErrNoRows {
			// 插入新模板
			_, err := r.db.ExecContext(ctx, `
				INSERT INTO templates (
					source, template_id, name, severity, category, author,
					path, enabled, description, impact, remediation,
					tags, reference, metadata, nuclei_version, official_path
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`, tmpl.Source, tmpl.TemplateID, tmpl.Name, tmpl.Severity,
				tmpl.Category, tmpl.Author, tmpl.Path, tmpl.Enabled,
				tmpl.Description, tmpl.Impact, tmpl.Remediation,
				stringSliceToJSON(tmpl.Tags), stringSliceToJSON(tmpl.Reference),
				mapToJSON(tmpl.Metadata), tmpl.NucleiVersion, tmpl.OfficialPath,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to insert builtin template %s: %w", tmpl.TemplateID, err)
			}
			stats.Inserted++
		} else if err == nil {
			// 更新现有模板
			_, err := r.db.ExecContext(ctx, `
				UPDATE templates SET
					name = ?, severity = ?, category = ?, author = ?,
					path = ?, description = ?, impact = ?, remediation = ?,
					tags = ?, reference = ?, metadata = ?,
					nuclei_version = ?, official_path = ?, updated_at = CURRENT_TIMESTAMP
				WHERE source = 'builtin' AND template_id = ?
			`, tmpl.Name, tmpl.Severity, tmpl.Category, tmpl.Author,
				tmpl.Path, tmpl.Description, tmpl.Impact, tmpl.Remediation,
				stringSliceToJSON(tmpl.Tags), stringSliceToJSON(tmpl.Reference),
				mapToJSON(tmpl.Metadata), tmpl.NucleiVersion, tmpl.OfficialPath,
				tmpl.TemplateID,
			)
			if err != nil {
				return nil, fmt.Errorf("failed to update builtin template %s: %w", tmpl.TemplateID, err)
			}
			stats.Updated++
		} else {
			return nil, fmt.Errorf("failed to check builtin template %s: %w", tmpl.TemplateID, err)
		}
	}

	// 删除数据库中存在但传入列表中不存在的内置模板
	rows, err := r.db.QueryContext(ctx, "SELECT template_id FROM templates WHERE source = 'builtin'")
	if err != nil {
		return nil, fmt.Errorf("failed to query existing builtin templates: %w", err)
	}
	defer rows.Close()

	existingIDs := make(map[string]bool)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		existingIDs[id] = true
	}

	newIDs := make(map[string]bool)
	for _, tmpl := range templates {
		newIDs[tmpl.TemplateID] = true
	}

	for id := range existingIDs {
		if !newIDs[id] {
			_, err := r.db.ExecContext(ctx, "DELETE FROM templates WHERE source = 'builtin' AND template_id = ?", id)
			if err != nil {
				return nil, fmt.Errorf("failed to delete obsolete builtin template %s: %w", id, err)
			}
			stats.Deleted++
		}
	}

	stats.Total = stats.Inserted + stats.Updated
	return stats, nil
}

// scanTemplate 扫描单行模板数据
func (r *TemplateRepository) scanTemplate(row *sql.Row) (*models.Template, error) {
	var t models.Template
	var tagsJSON, referenceJSON, metadataJSON sql.NullString
	var author, path, content, description, impact, remediation, nucleiVersion, officialPath sql.NullString

	err := row.Scan(
		&t.ID, &t.Source, &t.TemplateID, &t.Name, &t.Severity, &t.Category, &author,
		&path, &content, &t.Enabled, &description, &impact, &remediation,
		&tagsJSON, &referenceJSON, &metadataJSON, &nucleiVersion, &officialPath,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		return nil, fmt.Errorf("failed to scan template: %w", err)
	}

	// 处理 NULL 字符串字段
	if author.Valid {
		t.Author = author.String
	}
	if path.Valid {
		t.Path = path.String
	}
	if content.Valid {
		t.Content = content.String
	}
	if description.Valid {
		t.Description = description.String
	}
	if impact.Valid {
		t.Impact = impact.String
	}
	if remediation.Valid {
		t.Remediation = remediation.String
	}
	if nucleiVersion.Valid {
		t.NucleiVersion = nucleiVersion.String
	}
	if officialPath.Valid {
		t.OfficialPath = officialPath.String
	}

	// 解析 JSON 字段
	if tagsJSON.Valid {
		json.Unmarshal([]byte(tagsJSON.String), &t.Tags)
	}
	if referenceJSON.Valid {
		json.Unmarshal([]byte(referenceJSON.String), &t.Reference)
	}
	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &t.Metadata)
	}

	return &t, nil
}

// scanTemplates 扫描多行模板数据
func (r *TemplateRepository) scanTemplates(rows *sql.Rows) ([]*models.Template, error) {
	var templates []*models.Template

	for rows.Next() {
		var t models.Template
		var tagsJSON, referenceJSON, metadataJSON sql.NullString
		var author, path, content, description, impact, remediation, nucleiVersion, officialPath sql.NullString

		err := rows.Scan(
			&t.ID, &t.Source, &t.TemplateID, &t.Name, &t.Severity, &t.Category, &author,
			&path, &content, &t.Enabled, &description, &impact, &remediation,
			&tagsJSON, &referenceJSON, &metadataJSON, &nucleiVersion, &officialPath,
			&t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan template row: %w", err)
		}

		// 处理 NULL 字符串字段
		if author.Valid {
			t.Author = author.String
		}
		if path.Valid {
			t.Path = path.String
		}
		if content.Valid {
			t.Content = content.String
		}
		if description.Valid {
			t.Description = description.String
		}
		if impact.Valid {
			t.Impact = impact.String
		}
		if remediation.Valid {
			t.Remediation = remediation.String
		}
		if nucleiVersion.Valid {
			t.NucleiVersion = nucleiVersion.String
		}
		if officialPath.Valid {
			t.OfficialPath = officialPath.String
		}

		// 解析 JSON 字段
		if tagsJSON.Valid {
			json.Unmarshal([]byte(tagsJSON.String), &t.Tags)
		}
		if referenceJSON.Valid {
			json.Unmarshal([]byte(referenceJSON.String), &t.Reference)
		}
		if metadataJSON.Valid {
			json.Unmarshal([]byte(metadataJSON.String), &t.Metadata)
		}

		templates = append(templates, &t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return templates, nil
}

// 辅助函数：将 StringSlice 转换为 JSON 字符串
func stringSliceToJSON(slice []string) string {
	if slice == nil {
		return "[]"
	}
	data, _ := json.Marshal(slice)
	return string(data)
}

// 辅助函数：将 map 转换为 JSON 字符串
func mapToJSON(m map[string]string) string {
	if m == nil {
		return "{}"
	}
	data, _ := json.Marshal(m)
	return string(data)
}

// GetCategories 获取所有分类
func (r *TemplateRepository) GetCategories(ctx context.Context) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT category
		FROM templates
		WHERE category != ''
		ORDER BY category
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get categories: %w", err)
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var category string
		if err := rows.Scan(&category); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}

	return categories, nil
}

// GetAuthors 获取所有作者
func (r *TemplateRepository) GetAuthors(ctx context.Context) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT author
		FROM templates
		WHERE author != ''
		ORDER BY author
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get authors: %w", err)
	}
	defer rows.Close()

	var authors []string
	for rows.Next() {
		var author string
		if err := rows.Scan(&author); err != nil {
			return nil, err
		}
		authors = append(authors, author)
	}

	return authors, nil
}

// GetSeverities 获取所有严重程度
func (r *TemplateRepository) GetSeverities(ctx context.Context) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT DISTINCT severity
		FROM templates
		WHERE severity != ''
		ORDER BY
			CASE severity
				WHEN 'critical' THEN 1
				WHEN 'high' THEN 2
				WHEN 'medium' THEN 3
				WHEN 'low' THEN 4
				WHEN 'info' THEN 5
				ELSE 6
			END
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get severities: %w", err)
	}
	defer rows.Close()

	var severities []string
	for rows.Next() {
		var severity string
		if err := rows.Scan(&severity); err != nil {
			return nil, err
		}
		severities = append(severities, severity)
	}

	return severities, nil
}
