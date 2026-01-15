package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// PortScanRepository 端口扫描仓库
type PortScanRepository struct {
	db *sql.DB
}

// NewPortScanRepository 创建端口扫描仓库
func NewPortScanRepository(db *sql.DB) *PortScanRepository {
	return &PortScanRepository{db: db}
}

// CreateTask 创建端口扫描任务
func (r *PortScanRepository) CreateTask(ctx context.Context, task *models.PortScanTask) error {
	portsJSON, _ := json.Marshal(task.Ports)

	query := `
		INSERT INTO port_scan_tasks (target, ports, timeout, batch_size, status)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		task.Target, portsJSON, task.Timeout, task.BatchSize, task.Status,
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
func (r *PortScanRepository) GetTaskByID(ctx context.Context, id int) (*models.PortScanTask, error) {
	query := `
		SELECT id, target, ports, timeout, batch_size, status, started_at, completed_at, created_at
		FROM port_scan_tasks
		WHERE id = ?
	`

	var task models.PortScanTask
	var portsJSON string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&task.ID, &task.Target, &portsJSON, &task.Timeout, &task.BatchSize,
		&task.Status, &task.StartedAt, &task.CompletedAt, &task.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("port scan task not found")
		}
		return nil, err
	}

	json.Unmarshal([]byte(portsJSON), &task.Ports)
	return &task, nil
}

// GetAllTasks 获取所有任务
func (r *PortScanRepository) GetAllTasks(ctx context.Context) ([]*models.PortScanTask, error) {
	query := `
		SELECT id, target, ports, timeout, batch_size, status, started_at, completed_at, created_at
		FROM port_scan_tasks
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*models.PortScanTask
	for rows.Next() {
		var task models.PortScanTask
		var portsJSON string

		if err := rows.Scan(
			&task.ID, &task.Target, &portsJSON, &task.Timeout, &task.BatchSize,
			&task.Status, &task.StartedAt, &task.CompletedAt, &task.CreatedAt,
		); err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(portsJSON), &task.Ports)
		tasks = append(tasks, &task)
	}

	return tasks, rows.Err()
}

// UpdateTaskStatus 更新任务状态
func (r *PortScanRepository) UpdateTaskStatus(ctx context.Context, id int, status string) error {
	query := `UPDATE port_scan_tasks SET status = ? WHERE id = ?`
	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("port scan task not found")
	}

	return nil
}

// CreateResult 创建扫描结果
func (r *PortScanRepository) CreateResult(ctx context.Context, result *models.PortScanResult) error {
	query := `
		INSERT INTO port_scan_results (task_id, port, status, service, banner, latency)
		VALUES (?, ?, ?, ?, ?, ?)
	`

	_, err := r.db.ExecContext(ctx, query,
		result.TaskID, result.Port, result.Status, result.Service, result.Banner, result.Latency,
	)
	return err
}

// GetResultsByTaskID 获取任务结果
func (r *PortScanRepository) GetResultsByTaskID(ctx context.Context, taskID int) ([]*models.PortScanResult, error) {
	query := `
		SELECT id, task_id, port, status, service, banner, latency, created_at
		FROM port_scan_results
		WHERE task_id = ?
		ORDER BY port ASC
	`

	rows, err := r.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*models.PortScanResult
	for rows.Next() {
		var result models.PortScanResult

		if err := rows.Scan(
			&result.ID, &result.TaskID, &result.Port, &result.Status,
			&result.Service, &result.Banner, &result.Latency, &result.CreatedAt,
		); err != nil {
			return nil, err
		}

		results = append(results, &result)
	}

	return results, rows.Err()
}
