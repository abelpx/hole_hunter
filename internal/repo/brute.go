package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// BruteRepository 暴力破解仓库
type BruteRepository struct {
	db *sql.DB
}

// NewBruteRepository 创建暴力破解仓库
func NewBruteRepository(db *sql.DB) *BruteRepository {
	return &BruteRepository{db: db}
}

// CreateTask 创建暴力破解任务
func (r *BruteRepository) CreateTask(ctx context.Context, task *models.BruteTask) error {
	query := `
		INSERT INTO brute_tasks (name, request_id, type, status)
		VALUES (?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		task.Name, task.RequestID, task.Type, task.Status,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	task.ID = int(id)
	return nil
}

// GetTaskByID 根据ID获取任务
func (r *BruteRepository) GetTaskByID(ctx context.Context, id int) (*models.BruteTask, error) {
	query := `
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
		       success_count, failure_count, started_at, completed_at, created_at, updated_at
		FROM brute_tasks
		WHERE id = ?
	`

	var task models.BruteTask
	var startedAt, completedAt, createdAt, updatedAt sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&task.ID, &task.Name, &task.RequestID, &task.Type, &task.Status,
		&task.TotalPayloads, &task.SentPayloads, &task.SuccessCount, &task.FailureCount,
		&startedAt, &completedAt, &createdAt, &updatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("brute task not found")
		}
		return nil, err
	}

	if startedAt.Valid {
		task.StartedAt = startedAt.String
	}
	if completedAt.Valid {
		task.CompletedAt = completedAt.String
	}
	if createdAt.Valid {
		task.CreatedAt = createdAt.String
	}
	if updatedAt.Valid {
		task.UpdatedAt = updatedAt.String
	}

	return &task, nil
}

// GetAllTasks 获取所有任务
func (r *BruteRepository) GetAllTasks(ctx context.Context) ([]*models.BruteTask, error) {
	query := `
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
		       success_count, failure_count, started_at, completed_at, created_at, updated_at
		FROM brute_tasks
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*models.BruteTask
	for rows.Next() {
		var task models.BruteTask

		if err := rows.Scan(
			&task.ID, &task.Name, &task.RequestID, &task.Type, &task.Status,
			&task.TotalPayloads, &task.SentPayloads, &task.SuccessCount, &task.FailureCount,
			&task.StartedAt, &task.CompletedAt, &task.CreatedAt, &task.UpdatedAt,
		); err != nil {
			return nil, err
		}

		tasks = append(tasks, &task)
	}

	return tasks, rows.Err()
}

// DeleteTask 删除任务
func (r *BruteRepository) DeleteTask(ctx context.Context, id int) error {
	query := `DELETE FROM brute_tasks WHERE id = ?`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("brute task not found")
	}

	return nil
}

// UpdateTaskStatus 更新任务状态
func (r *BruteRepository) UpdateTaskStatus(ctx context.Context, id int, status string) error {
	query := `UPDATE brute_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("brute task not found")
	}

	return nil
}

// CreatePayloadSet 创建载荷集
func (r *BruteRepository) CreatePayloadSet(ctx context.Context, set *models.BrutePayloadSet) error {
	configJSON, _ := json.Marshal(set.Config)

	query := `
		INSERT INTO brute_payload_sets (name, type, config)
		VALUES (?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query, set.Name, set.Type, configJSON)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	set.ID = int(id)
	return nil
}

// GetAllPayloadSets 获取所有载荷集
func (r *BruteRepository) GetAllPayloadSets(ctx context.Context) ([]*models.BrutePayloadSet, error) {
	query := `
		SELECT id, name, type, config, created_at
		FROM brute_payload_sets
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sets []*models.BrutePayloadSet
	for rows.Next() {
		var set models.BrutePayloadSet
		var configJSON string

		if err := rows.Scan(&set.ID, &set.Name, &set.Type, &configJSON, &set.CreatedAt); err != nil {
			return nil, err
		}

		_ = json.Unmarshal([]byte(configJSON), &set.Config)
		sets = append(sets, &set)
	}

	return sets, rows.Err()
}
