package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// TargetRepository 目标仓储
type TargetRepository struct {
	*BaseRepository
}

// NewTargetRepository 创建目标仓储
func NewTargetRepository(db *sql.DB) *TargetRepository {
	return &TargetRepository{
		BaseRepository: NewBaseRepository(db),
	}
}

// GetAll 获取所有目标
func (r *TargetRepository) GetAll(ctx context.Context) ([]*models.Target, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, name, url, description, tags, created_at, updated_at FROM targets ORDER BY created_at DESC")
	if err != nil {
		return nil, errors.DBError("failed to query targets", err)
	}
	defer rows.Close()

	var targets []*models.Target
	for rows.Next() {
		t, err := r.scanTarget(rows)
		if err != nil {
			return nil, errors.DBError("failed to scan target", err)
		}
		targets = append(targets, t)
	}

	if err := rows.Err(); err != nil {
		return nil, errors.DBError("error iterating targets", err)
	}

	return targets, nil
}

// GetByID 根据 ID 获取目标
func (r *TargetRepository) GetByID(ctx context.Context, id int) (*models.Target, error) {
	var t models.Target
	var tags sql.NullString

	err := r.db.QueryRowContext(ctx,
		"SELECT id, name, url, description, tags, created_at, updated_at FROM targets WHERE id = ?", id).
		Scan(&t.ID, &t.Name, &t.URL, &t.Description, &tags, &t.CreatedAt, &t.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.NotFound("target not found")
	}
	if err != nil {
		return nil, errors.DBError("failed to query target", err)
	}

	if tags.Valid {
		json.Unmarshal([]byte(tags.String), &t.Tags)
	}

	return &t, nil
}

// Create 创建目标
func (r *TargetRepository) Create(ctx context.Context, t *models.Target) error {
	tagsJSON, err := json.Marshal(t.Tags)
	if err != nil {
		return errors.Internal("failed to marshal tags", err)
	}

	result, err := r.db.ExecContext(ctx,
		"INSERT INTO targets (name, url, description, tags, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
		t.Name, t.URL, t.Description, string(tagsJSON))
	if err != nil {
		return errors.DBError("failed to create target", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return errors.DBError("failed to get last insert id", err)
	}

	t.ID = int(id)
	return nil
}

// Update 更新目标
func (r *TargetRepository) Update(ctx context.Context, t *models.Target) error {
	tagsJSON, err := json.Marshal(t.Tags)
	if err != nil {
		return errors.Internal("failed to marshal tags", err)
	}

	_, err = r.db.ExecContext(ctx,
		"UPDATE targets SET name = ?, url = ?, description = ?, tags = ?, updated_at = datetime('now') WHERE id = ?",
		t.Name, t.URL, t.Description, string(tagsJSON), t.ID)

	if err != nil {
		return errors.DBError("failed to update target", err)
	}

	return nil
}

// Delete 删除目标
func (r *TargetRepository) Delete(ctx context.Context, id int) error {
	return r.DeleteByID(ctx, "targets", id)
}

// ExistsByURL 检查 URL 是否已存在
func (r *TargetRepository) ExistsByURL(ctx context.Context, url string, excludeID int) (bool, error) {
	var count int
	var err error

	if excludeID > 0 {
		err = r.db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM targets WHERE url = ? AND id != ?", url, excludeID).Scan(&count)
	} else {
		err = r.db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM targets WHERE url = ?", url).Scan(&count)
	}

	if err != nil {
		return false, errors.DBError("failed to check url existence", err)
	}

	return count > 0, nil
}

// scanTarget 扫描一行目标数据
func (r *TargetRepository) scanTarget(rows *sql.Rows) (*models.Target, error) {
	var t models.Target
	var tags sql.NullString

	err := rows.Scan(&t.ID, &t.Name, &t.URL, &t.Description, &tags, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if tags.Valid {
		json.Unmarshal([]byte(tags.String), &t.Tags)
	}

	return &t, nil
}
