package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/holehunter/holehunter/internal/models"
)

type BruteRepository struct {
	db *sql.DB
}

func NewBruteRepository(db *sql.DB) *BruteRepository {
	return &BruteRepository{db: db}
}

func (r *BruteRepository) GetAllTasks() ([]models.BruteTask, error) {
	rows, err := r.db.Query(`
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
		       success_count, failure_count, started_at, completed_at, created_at
		FROM brute_tasks ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.BruteTask
	for rows.Next() {
		var t models.BruteTask
		var startedAt, completedAt sql.NullString

		if err := rows.Scan(
			&t.ID, &t.Name, &t.RequestID, &t.Type, &t.Status, &t.TotalPayloads,
			&t.SentPayloads, &t.SuccessCount, &t.FailureCount, &startedAt, &completedAt, &t.CreatedAt,
		); err != nil {
			return nil, err
		}

		if startedAt.Valid {
			t.StartedAt = startedAt.String
		}
		if completedAt.Valid {
			t.CompletedAt = completedAt.String
		}

		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (r *BruteRepository) GetTaskByID(id int) (*models.BruteTask, error) {
	var t models.BruteTask
	var startedAt, completedAt sql.NullString

	err := r.db.QueryRow(`
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
		       success_count, failure_count, started_at, completed_at, created_at
		FROM brute_tasks WHERE id = ?
	`, id).Scan(
		&t.ID, &t.Name, &t.RequestID, &t.Type, &t.Status, &t.TotalPayloads,
		&t.SentPayloads, &t.SuccessCount, &t.FailureCount, &startedAt, &completedAt, &t.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("brute task not found: %d", id)
	}
	if err != nil {
		return nil, err
	}

	if startedAt.Valid {
		t.StartedAt = startedAt.String
	}
	if completedAt.Valid {
		t.CompletedAt = completedAt.String
	}

	return &t, nil
}

func (r *BruteRepository) CreateTask(name string, requestID int, taskType string) (*models.BruteTask, error) {
	now := time.Now().Format("2006-01-02 15:04:05")

	result, err := r.db.Exec(`
		INSERT INTO brute_tasks (name, request_id, type, status, created_at)
		VALUES (?, ?, ?, 'pending', ?)
	`, name, requestID, taskType, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.BruteTask{
		ID:            int(id),
		Name:          name,
		RequestID:     requestID,
		Type:          taskType,
		Status:        "pending",
		TotalPayloads: 0,
		SentPayloads:  0,
		SuccessCount:  0,
		FailureCount:  0,
		CreatedAt:     now,
	}, nil
}

func (r *BruteRepository) UpdateTaskStatus(id int, status string) error {
	_, err := r.db.Exec("UPDATE brute_tasks SET status = ? WHERE id = ?", status, id)
	return err
}

func (r *BruteRepository) UpdateTaskProgress(id int, sent, success, failure int) error {
	_, err := r.db.Exec(`
		UPDATE brute_tasks
		SET sent_payloads = ?, success_count = ?, failure_count = ?
		WHERE id = ?
	`, sent, success, failure, id)
	return err
}

func (r *BruteRepository) SetTaskStartTime(id int) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := r.db.Exec("UPDATE brute_tasks SET started_at = ? WHERE id = ?", now, id)
	return err
}

func (r *BruteRepository) SetTaskCompleteTime(id int) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := r.db.Exec("UPDATE brute_tasks SET completed_at = ?, status = 'completed' WHERE id = ?", now, id)
	return err
}

func (r *BruteRepository) DeleteTask(id int) error {
	_, err := r.db.Exec("DELETE FROM brute_tasks WHERE id = ?", id)
	return err
}

func (r *BruteRepository) GetAllPayloadSets() ([]models.BrutePayloadSet, error) {
	rows, err := r.db.Query(`
		SELECT id, name, type, config, created_at
		FROM brute_payload_sets ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sets []models.BrutePayloadSet
	for rows.Next() {
		var s models.BrutePayloadSet
		var config sql.NullString

		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &config, &s.CreatedAt); err != nil {
			return nil, err
		}

		if config.Valid {
			json.Unmarshal([]byte(config.String), &s.Config)
		} else {
			s.Config = make(map[string]interface{})
		}

		sets = append(sets, s)
	}
	return sets, nil
}

func (r *BruteRepository) GetPayloadSetByID(id int) (*models.BrutePayloadSet, error) {
	var s models.BrutePayloadSet
	var config sql.NullString

	err := r.db.QueryRow(`
		SELECT id, name, type, config, created_at
		FROM brute_payload_sets WHERE id = ?
	`, id).Scan(&s.ID, &s.Name, &s.Type, &config, &s.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("payload set not found: %d", id)
	}
	if err != nil {
		return nil, err
	}

	if config.Valid {
		json.Unmarshal([]byte(config.String), &s.Config)
	} else {
		s.Config = make(map[string]interface{})
	}

	return &s, nil
}

func (r *BruteRepository) CreatePayloadSet(name, setType string, config map[string]interface{}) (*models.BrutePayloadSet, error) {
	configJSON, _ := json.Marshal(config)
	now := time.Now().Format("2006-01-02 15:04:05")

	result, err := r.db.Exec(`
		INSERT INTO brute_payload_sets (name, type, config, created_at)
		VALUES (?, ?, ?, ?)
	`, name, setType, string(configJSON), now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.BrutePayloadSet{
		ID:        int(id),
		Name:      name,
		Type:      setType,
		Config:    config,
		CreatedAt: now,
	}, nil
}

func (r *BruteRepository) DeletePayloadSet(id int) error {
	_, err := r.db.Exec("DELETE FROM brute_payload_sets WHERE id = ?", id)
	return err
}
