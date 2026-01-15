package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// ScanRepository 扫描任务仓储
type ScanRepository struct {
	db *sql.DB
}

// NewScanRepository 创建扫描任务仓储
func NewScanRepository(db *sql.DB) *ScanRepository {
	return &ScanRepository{db: db}
}

// GetAll 获取所有扫描任务
func (r *ScanRepository) GetAll(ctx context.Context) ([]*models.ScanTask, error) {
	return r.GetAllPaged(ctx, 0, 0)
}

// GetAllPaged 分页获取扫描任务
func (r *ScanRepository) GetAllPaged(ctx context.Context, offset, limit int) ([]*models.ScanTask, error) {
	query := `
		SELECT id, name, target_id, status, strategy, templates_used,
		       started_at, completed_at, total_templates, executed_templates,
		       progress, current_template, error, created_at
		FROM scan_tasks ORDER BY created_at DESC
	`

	// 添加分页
	if limit > 0 {
		query += " LIMIT ? OFFSET ?"
	}

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, errors.DBError("failed to query scan tasks", err)
	}
	defer rows.Close()

	var tasks []*models.ScanTask
	for rows.Next() {
		t, err := r.scanTask(rows)
		if err != nil {
			return nil, errors.DBError("failed to scan scan task", err)
		}
		tasks = append(tasks, t)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.DBError("error iterating scan tasks", err)
	}

	return tasks, nil
}

// GetByID 根据 ID 获取扫描任务
func (r *ScanRepository) GetByID(ctx context.Context, id int) (*models.ScanTask, error) {
	var t models.ScanTask
	var name, startedAt, completedAt, templatesUsed, currentTemplate, errStr sql.NullString
	var totalTemplates, executedTemplates sql.NullInt64

	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, target_id, status, strategy, templates_used,
		         started_at, completed_at, total_templates, executed_templates,
		         progress, current_template, error, created_at
		  FROM scan_tasks WHERE id = ?`, id).
		Scan(&t.ID, &name, &t.TargetID, &t.Status, &t.Strategy, &templatesUsed,
			&startedAt, &completedAt, &totalTemplates, &executedTemplates,
			&t.Progress, &currentTemplate, &errStr, &t.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.NotFound("scan task not found")
	}
	if err != nil {
		return nil, errors.DBError("failed to query scan task", err)
	}

	// 处理可空字段
	if name.Valid {
		t.Name = &name.String
	}
	if startedAt.Valid {
		t.StartedAt = &startedAt.String
	}
	if completedAt.Valid {
		t.CompletedAt = &completedAt.String
	}
	if templatesUsed.Valid {
		json.Unmarshal([]byte(templatesUsed.String), &t.TemplatesUsed)
	}
	if totalTemplates.Valid {
		val := int(totalTemplates.Int64)
		t.TotalTemplates = &val
	}
	if executedTemplates.Valid {
		val := int(executedTemplates.Int64)
		t.ExecutedTemplates = &val
	}
	if currentTemplate.Valid {
		t.CurrentTemplate = &currentTemplate.String
	}
	if errStr.Valid {
		t.Error = &errStr.String
	}

	return &t, nil
}

// GetByTargetID 根据目标 ID 获取扫描任务
func (r *ScanRepository) GetByTargetID(ctx context.Context, targetID int) ([]*models.ScanTask, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, name, target_id, status, strategy, templates_used,
		         started_at, completed_at, total_templates, executed_templates,
		         progress, current_template, error, created_at
		  FROM scan_tasks WHERE target_id = ? ORDER BY created_at DESC`, targetID)
	if err != nil {
		return nil, errors.DBError("failed to query scan tasks by target", err)
	}
	defer rows.Close()

	var tasks []*models.ScanTask
	for rows.Next() {
		t, err := r.scanTask(rows)
		if err != nil {
			return nil, errors.DBError("failed to scan scan task", err)
		}
		tasks = append(tasks, t)
	}

	return tasks, nil
}

// Create 创建扫描任务
func (r *ScanRepository) Create(ctx context.Context, t *models.ScanTask) error {
	templatesJSON, err := json.Marshal(t.TemplatesUsed)
	if err != nil {
		return errors.Internal("failed to marshal templates", err)
	}

	result, err := r.db.ExecContext(ctx,
		`INSERT INTO scan_tasks (name, target_id, status, strategy, templates_used, created_at)
		 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
		t.Name, t.TargetID, t.Status, t.Strategy, string(templatesJSON))
	if err != nil {
		return errors.DBError("failed to create scan task", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return errors.DBError("failed to get last insert id", err)
	}

	t.ID = int(id)
	return nil
}

// UpdateStatus 更新扫描任务状态
func (r *ScanRepository) UpdateStatus(ctx context.Context, id int, status string) error {
	// 使用事务确保数据一致性
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return errors.DBError("failed to begin transaction", err)
	}
	defer func() { _ = tx.Rollback() }()

	// 更新状态
	_, err = tx.ExecContext(ctx,
		"UPDATE scan_tasks SET status = ? WHERE id = ?",
		status, id)
	if err != nil {
		return errors.DBError("failed to update scan status", err)
	}

	// 如果开始扫描，更新 started_at
	if status == "running" {
		_, err = tx.ExecContext(ctx,
			"UPDATE scan_tasks SET started_at = datetime('now') WHERE id = ?", id)
		if err != nil {
			return errors.DBError("failed to update started_at", err)
		}
	}

	// 如果扫描完成或失败，更新 completed_at
	if status == "completed" || status == "failed" || status == "stopped" {
		_, err = tx.ExecContext(ctx,
			"UPDATE scan_tasks SET completed_at = datetime('now') WHERE id = ?", id)
		if err != nil {
			return errors.DBError("failed to update completed_at", err)
		}
	}

	return tx.Commit()
}

// UpdateProgress 更新扫描进度
func (r *ScanRepository) UpdateProgress(ctx context.Context, id int, progress models.ScanProgress) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE scan_tasks
		 SET progress = ?, total_templates = ?, executed_templates = ?, current_template = ?
		 WHERE id = ?`,
		progress.Progress, progress.TotalTemplates, progress.Executed,
		progress.CurrentTemplate, id)
	if err != nil {
		return errors.DBError("failed to update scan progress", err)
	}
	return nil
}

// Update 更新扫描任务
func (r *ScanRepository) Update(ctx context.Context, t *models.ScanTask) error {
	templatesJSON, err := json.Marshal(t.TemplatesUsed)
	if err != nil {
		return errors.Internal("failed to marshal templates", err)
	}

	_, err = r.db.ExecContext(ctx,
		`UPDATE scan_tasks
		 SET name = ?, status = ?, strategy = ?, templates_used = ?,
		     progress = ?, current_template = ?, error = ?
		 WHERE id = ?`,
		t.Name, t.Status, t.Strategy, string(templatesJSON),
		t.Progress, t.CurrentTemplate, t.Error, t.ID)
	if err != nil {
		return errors.DBError("failed to update scan task", err)
	}
	return nil
}

// Delete 删除扫描任务
func (r *ScanRepository) Delete(ctx context.Context, id int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM scan_tasks WHERE id = ?", id)
	if err != nil {
		return errors.DBError("failed to delete scan task", err)
	}
	return nil
}

// CountByStatus 统计各状态的扫描任务数量
func (r *ScanRepository) CountByStatus(ctx context.Context) (map[string]int, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT status, COUNT(*) FROM scan_tasks GROUP BY status")
	if err != nil {
		return nil, errors.DBError("failed to count scan tasks by status", err)
	}
	defer rows.Close()

	result := make(map[string]int)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		result[status] = count
	}

	return result, nil
}

// scanTask 扫描一行扫描任务数据
func (r *ScanRepository) scanTask(rows *sql.Rows) (*models.ScanTask, error) {
	var t models.ScanTask
	var name, startedAt, completedAt, templatesUsed, currentTemplate, errStr sql.NullString
	var totalTemplates, executedTemplates sql.NullInt64

	err := rows.Scan(&t.ID, &name, &t.TargetID, &t.Status, &t.Strategy, &templatesUsed,
		&startedAt, &completedAt, &totalTemplates, &executedTemplates,
		&t.Progress, &currentTemplate, &errStr, &t.CreatedAt)
	if err != nil {
		return nil, err
	}

	// 处理可空字段
	if name.Valid {
		t.Name = &name.String
	}
	if startedAt.Valid {
		t.StartedAt = &startedAt.String
	}
	if completedAt.Valid {
		t.CompletedAt = &completedAt.String
	}
	if templatesUsed.Valid {
		json.Unmarshal([]byte(templatesUsed.String), &t.TemplatesUsed)
	}
	if totalTemplates.Valid {
		val := int(totalTemplates.Int64)
		t.TotalTemplates = &val
	}
	if executedTemplates.Valid {
		val := int(executedTemplates.Int64)
		t.ExecutedTemplates = &val
	}
	if currentTemplate.Valid {
		t.CurrentTemplate = &currentTemplate.String
	}
	if errStr.Valid {
		t.Error = &errStr.String
	}

	return &t, nil
}
