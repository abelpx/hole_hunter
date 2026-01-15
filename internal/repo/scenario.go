package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// ScenarioRepository 场景分组仓库
type ScenarioRepository struct {
	db *sql.DB
}

// NewScenarioRepository 创建场景分组仓库
func NewScenarioRepository(db *sql.DB) *ScenarioRepository {
	return &ScenarioRepository{db: db}
}

// GetAll 获取所有场景分组
func (r *ScenarioRepository) GetAll(ctx context.Context) ([]*models.ScenarioGroup, error) {
	query := `
		SELECT id, name, description, templates, created_at
		FROM scenarios
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []*models.ScenarioGroup
	for rows.Next() {
		var group models.ScenarioGroup
		var templatesJSON string
		var createdAt int64

		if err := rows.Scan(&group.ID, &group.Name, &group.Description, &templatesJSON, &createdAt); err != nil {
			return nil, err
		}

		group.CreatedAt = createdAt
		group.UpdatedAt = createdAt // 简化处理，使用 created_at 作为 updated_at

		if err := json.Unmarshal([]byte(templatesJSON), &group.TemplateIDs); err != nil {
			return nil, err
		}

		groups = append(groups, &group)
	}

	return groups, rows.Err()
}

// GetByID 根据 ID 获取场景分组
func (r *ScenarioRepository) GetByID(ctx context.Context, id string) (*models.ScenarioGroup, error) {
	query := `
		SELECT id, name, description, templates, created_at
		FROM scenarios
		WHERE id = ?
	`

	var group models.ScenarioGroup
	var templatesJSON string
	var createdAt int64

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&group.ID, &group.Name, &group.Description, &templatesJSON, &createdAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("scenario group not found")
		}
		return nil, err
	}

	group.CreatedAt = createdAt
	group.UpdatedAt = createdAt

	if err := json.Unmarshal([]byte(templatesJSON), &group.TemplateIDs); err != nil {
		return nil, err
	}

	return &group, nil
}

// Create 创建场景分组
func (r *ScenarioRepository) Create(ctx context.Context, group *models.ScenarioGroup) error {
	templatesJSON, err := json.Marshal(group.TemplateIDs)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO scenarios (id, name, description, templates)
		VALUES (?, ?, ?, ?)
	`

	_, err = r.db.ExecContext(ctx, query, group.ID, group.Name, group.Description, templatesJSON)
	return err
}

// Update 更新场景分组
func (r *ScenarioRepository) Update(ctx context.Context, group *models.ScenarioGroup) error {
	templatesJSON, err := json.Marshal(group.TemplateIDs)
	if err != nil {
		return err
	}

	query := `
		UPDATE scenarios
		SET name = ?, description = ?, templates = ?
		WHERE id = ?
	`

	result, err := r.db.ExecContext(ctx, query, group.Name, group.Description, templatesJSON, group.ID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("scenario group not found")
	}

	return nil
}

// Delete 删除场景分组
func (r *ScenarioRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM scenarios WHERE id = ?`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("scenario group not found")
	}

	return nil
}
