package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/holehunter/holehunter/internal/models"
)

type TargetRepository struct {
	db *sql.DB
}

func NewTargetRepository(db *sql.DB) *TargetRepository {
	return &TargetRepository{db: db}
}

func (r *TargetRepository) GetAll() ([]models.Target, error) {
	rows, err := r.db.Query("SELECT id, name, url, description, tags, created_at, updated_at FROM targets ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []models.Target
	for rows.Next() {
		var t models.Target
		var tags sql.NullString
		if err := rows.Scan(&t.ID, &t.Name, &t.URL, &t.Description, &tags, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		if tags.Valid {
			json.Unmarshal([]byte(tags.String), &t.Tags)
		}
		targets = append(targets, t)
	}
	return targets, nil
}

func (r *TargetRepository) GetByID(id int) (*models.Target, error) {
	var t models.Target
	var tags sql.NullString
	err := r.db.QueryRow("SELECT id, name, url, description, tags, created_at, updated_at FROM targets WHERE id = ?", id).
		Scan(&t.ID, &t.Name, &t.URL, &t.Description, &tags, &t.CreatedAt, &t.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("target not found: %d", id)
	}
	if err != nil {
		return nil, err
	}
	if tags.Valid {
		json.Unmarshal([]byte(tags.String), &t.Tags)
	}
	return &t, nil
}

func (r *TargetRepository) Create(name, url, description string, tags []string) (*models.Target, error) {
	tagsJSON, _ := json.Marshal(tags)
	now := time.Now().Format("2006-01-02 15:04:05")

	result, err := r.db.Exec(
		"INSERT INTO targets (name, url, description, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		name, url, description, string(tagsJSON), now, now,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.Target{
		ID:          int(id),
		Name:        name,
		URL:         url,
		Description: description,
		Tags:        tags,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func (r *TargetRepository) Update(id int, name, url, description string, tags []string) error {
	tagsJSON, _ := json.Marshal(tags)
	now := time.Now().Format("2006-01-02 15:04:05")

	_, err := r.db.Exec(
		"UPDATE targets SET name = ?, url = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?",
		name, url, description, string(tagsJSON), now, id,
	)
	return err
}

func (r *TargetRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM targets WHERE id = ?", id)
	return err
}
