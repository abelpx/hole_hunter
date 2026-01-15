package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// DomainBruteRepository 域名暴力破解仓库
type DomainBruteRepository struct {
	db *sql.DB
}

// NewDomainBruteRepository 创建域名暴力破解仓库
func NewDomainBruteRepository(db *sql.DB) *DomainBruteRepository {
	return &DomainBruteRepository{db: db}
}

// CreateTask 创建域名暴力破解任务
func (r *DomainBruteRepository) CreateTask(ctx context.Context, task *models.DomainBruteTask) error {
	wordlistJSON, _ := json.Marshal(task.Wordlist)

	query := `
		INSERT INTO domain_brute_tasks (domain, wordlist, timeout, batch_size, status)
		VALUES (?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		task.Domain, wordlistJSON, task.Timeout, task.BatchSize, task.Status,
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
func (r *DomainBruteRepository) GetTaskByID(ctx context.Context, id int) (*models.DomainBruteTask, error) {
	query := `
		SELECT id, domain, wordlist, timeout, batch_size, status, started_at, completed_at, created_at
		FROM domain_brute_tasks
		WHERE id = ?
	`

	var task models.DomainBruteTask
	var wordlistJSON string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&task.ID, &task.Domain, &wordlistJSON, &task.Timeout, &task.BatchSize,
		&task.Status, &task.StartedAt, &task.CompletedAt, &task.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("domain brute task not found")
		}
		return nil, err
	}

	json.Unmarshal([]byte(wordlistJSON), &task.Wordlist)
	return &task, nil
}

// GetAllTasks 获取所有任务
func (r *DomainBruteRepository) GetAllTasks(ctx context.Context) ([]*models.DomainBruteTask, error) {
	query := `
		SELECT id, domain, wordlist, timeout, batch_size, status, started_at, completed_at, created_at
		FROM domain_brute_tasks
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*models.DomainBruteTask
	for rows.Next() {
		var task models.DomainBruteTask
		var wordlistJSON string

		if err := rows.Scan(
			&task.ID, &task.Domain, &wordlistJSON, &task.Timeout, &task.BatchSize,
			&task.Status, &task.StartedAt, &task.CompletedAt, &task.CreatedAt,
		); err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(wordlistJSON), &task.Wordlist)
		tasks = append(tasks, &task)
	}

	return tasks, rows.Err()
}

// UpdateTaskStatus 更新任务状态
func (r *DomainBruteRepository) UpdateTaskStatus(ctx context.Context, id int, status string) error {
	query := `UPDATE domain_brute_tasks SET status = ? WHERE id = ?`
	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("domain brute task not found")
	}

	return nil
}

// CreateResult 创建扫描结果
func (r *DomainBruteRepository) CreateResult(ctx context.Context, result *models.DomainBruteResult) error {
	ipsJSON, _ := json.Marshal(result.IPs)

	query := `
		INSERT INTO domain_brute_results (task_id, subdomain, resolved, ips, latency)
		VALUES (?, ?, ?, ?, ?)
	`

	_, err := r.db.ExecContext(ctx, query,
		result.TaskID, result.Subdomain, result.Resolved, ipsJSON, result.Latency,
	)
	return err
}

// GetResultsByTaskID 获取任务结果
func (r *DomainBruteRepository) GetResultsByTaskID(ctx context.Context, taskID int) ([]*models.DomainBruteResult, error) {
	query := `
		SELECT id, task_id, subdomain, resolved, ips, latency, created_at
		FROM domain_brute_results
		WHERE task_id = ?
		ORDER BY subdomain ASC
	`

	rows, err := r.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*models.DomainBruteResult
	for rows.Next() {
		var result models.DomainBruteResult
		var ipsJSON string

		if err := rows.Scan(
			&result.ID, &result.TaskID, &result.Subdomain, &result.Resolved,
			&ipsJSON, &result.Latency, &result.CreatedAt,
		); err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(ipsJSON), &result.IPs)
		results = append(results, &result)
	}

	return results, rows.Err()
}
