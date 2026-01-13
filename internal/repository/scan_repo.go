package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/holehunter/holehunter/internal/models"
)

type ScanRepository struct {
	db *sql.DB
}

func NewScanRepository(db *sql.DB) *ScanRepository {
	return &ScanRepository{db: db}
}

func (r *ScanRepository) GetAll() ([]models.ScanTask, error) {
	rows, err := r.db.Query(`
		SELECT id, name, target_id, status, strategy, templates_used,
		       started_at, completed_at, total_templates, executed_templates,
		       progress, current_template, error, created_at
		FROM scan_tasks ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []models.ScanTask
	for rows.Next() {
		var t models.ScanTask
		var templates sql.NullString
		var startedAt, completedAt, currentTemplate, errStr sql.NullString
		var totalTemplates, executedTemplates sql.NullInt64

		if err := rows.Scan(
			&t.ID, &t.Name, &t.TargetID, &t.Status, &t.Strategy, &templates,
			&startedAt, &completedAt, &totalTemplates, &executedTemplates,
			&t.Progress, &currentTemplate, &errStr, &t.CreatedAt,
		); err != nil {
			return nil, err
		}

		if templates.Valid {
			json.Unmarshal([]byte(templates.String), &t.TemplatesUsed)
		}
		if startedAt.Valid {
			t.StartedAt = &startedAt.String
		}
		if completedAt.Valid {
			t.CompletedAt = &completedAt.String
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

		tasks = append(tasks, t)
	}
	return tasks, nil
}

func (r *ScanRepository) GetByID(id int) (*models.ScanTask, error) {
	var t models.ScanTask
	var templates sql.NullString
	var startedAt, completedAt, currentTemplate, errStr sql.NullString
	var totalTemplates, executedTemplates sql.NullInt64

	err := r.db.QueryRow(`
		SELECT id, name, target_id, status, strategy, templates_used,
		       started_at, completed_at, total_templates, executed_templates,
		       progress, current_template, error, created_at
		FROM scan_tasks WHERE id = ?
	`, id).Scan(
		&t.ID, &t.Name, &t.TargetID, &t.Status, &t.Strategy, &templates,
		&startedAt, &completedAt, &totalTemplates, &executedTemplates,
		&t.Progress, &currentTemplate, &errStr, &t.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("scan task not found: %d", id)
	}
	if err != nil {
		return nil, err
	}

	if templates.Valid {
		json.Unmarshal([]byte(templates.String), &t.TemplatesUsed)
	}
	if startedAt.Valid {
		t.StartedAt = &startedAt.String
	}
	if completedAt.Valid {
		t.CompletedAt = &completedAt.String
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

func (r *ScanRepository) Create(name *string, targetID int, strategy string, templates []string) (*models.ScanTask, error) {
	templatesJSON, _ := json.Marshal(templates)
	now := time.Now().Format("2006-01-02 15:04:05")

	result, err := r.db.Exec(`
		INSERT INTO scan_tasks (name, target_id, status, strategy, templates_used, created_at)
		VALUES (?, ?, 'pending', ?, ?, ?)
	`, name, targetID, strategy, string(templatesJSON), now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.ScanTask{
		ID:            int(id),
		Name:          name,
		TargetID:      targetID,
		Status:        "pending",
		Strategy:      strategy,
		TemplatesUsed: templates,
		CreatedAt:     now,
	}, nil
}

func (r *ScanRepository) UpdateStatus(id int, status string) error {
	_, err := r.db.Exec("UPDATE scan_tasks SET status = ? WHERE id = ?", status, id)
	return err
}

func (r *ScanRepository) UpdateProgress(id int, progress, total, executed int) error {
	_, err := r.db.Exec(`
		UPDATE scan_tasks
		SET progress = ?, total_templates = ?, executed_templates = ?
		WHERE id = ?
	`, progress, total, executed, id)
	return err
}

func (r *ScanRepository) UpdateCurrentTemplate(id int, currentTemplate string) error {
	_, err := r.db.Exec("UPDATE scan_tasks SET current_template = ? WHERE id = ?", currentTemplate, id)
	return err
}

func (r *ScanRepository) UpdateError(id int, errMsg string) error {
	_, err := r.db.Exec("UPDATE scan_tasks SET error = ? WHERE id = ?", errMsg, id)
	return err
}

func (r *ScanRepository) SetStartTime(id int) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := r.db.Exec("UPDATE scan_tasks SET started_at = ? WHERE id = ?", now, id)
	return err
}

func (r *ScanRepository) SetCompleteTime(id int) error {
	now := time.Now().Format("2006-01-02 15:04:05")
	_, err := r.db.Exec("UPDATE scan_tasks SET completed_at = ?, status = 'completed' WHERE id = ?", now, id)
	return err
}

func (r *ScanRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM scan_tasks WHERE id = ?", id)
	return err
}
