package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/holehunter/holehunter/internal/models"
)

type HTTPRepository struct {
	db *sql.DB
}

func NewHTTPRepository(db *sql.DB) *HTTPRepository {
	return &HTTPRepository{db: db}
}

func (r *HTTPRepository) GetAll() ([]models.HttpRequest, error) {
	rows, err := r.db.Query(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.HttpRequest
	for rows.Next() {
		var req models.HttpRequest
		var headers, tags sql.NullString

		if err := rows.Scan(
			&req.ID, &req.Name, &req.Method, &req.URL, &headers, &req.Body,
			&req.ContentType, &tags, &req.CreatedAt, &req.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if headers.Valid {
			json.Unmarshal([]byte(headers.String), &req.Headers)
		} else {
			req.Headers = make(map[string]string)
		}
		if tags.Valid {
			json.Unmarshal([]byte(tags.String), &req.Tags)
		}

		requests = append(requests, req)
	}
	return requests, nil
}

func (r *HTTPRepository) GetByID(id int) (*models.HttpRequest, error) {
	var req models.HttpRequest
	var headers, tags sql.NullString

	err := r.db.QueryRow(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Name, &req.Method, &req.URL, &headers, &req.Body,
		&req.ContentType, &tags, &req.CreatedAt, &req.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("http request not found: %d", id)
	}
	if err != nil {
		return nil, err
	}

	if headers.Valid {
		json.Unmarshal([]byte(headers.String), &req.Headers)
	} else {
		req.Headers = make(map[string]string)
	}
	if tags.Valid {
		json.Unmarshal([]byte(tags.String), &req.Tags)
	}

	return &req, nil
}

func (r *HTTPRepository) Create(name, method, url string, headers map[string]string, body, contentType string, tags []string) (*models.HttpRequest, error) {
	headersJSON, _ := json.Marshal(headers)
	tagsJSON, _ := json.Marshal(tags)
	now := time.Now().Format("2006-01-02 15:04:05")

	result, err := r.db.Exec(`
		INSERT INTO http_requests (name, method, url, headers, body, content_type, tags, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, name, method, url, string(headersJSON), body, contentType, string(tagsJSON), now, now)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.HttpRequest{
		ID:          int(id),
		Name:        name,
		Method:      method,
		URL:         url,
		Headers:     headers,
		Body:        body,
		ContentType: contentType,
		Tags:        tags,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func (r *HTTPRepository) Update(id int, name, method, url string, headers map[string]string, body, contentType string, tags []string) error {
	headersJSON, _ := json.Marshal(headers)
	tagsJSON, _ := json.Marshal(tags)
	now := time.Now().Format("2006-01-02 15:04:05")

	_, err := r.db.Exec(`
		UPDATE http_requests
		SET name = ?, method = ?, url = ?, headers = ?, body = ?, content_type = ?, tags = ?, updated_at = ?
		WHERE id = ?
	`, name, method, url, string(headersJSON), body, contentType, string(tagsJSON), now, id)
	return err
}

func (r *HTTPRepository) Delete(id int) error {
	_, err := r.db.Exec("DELETE FROM http_requests WHERE id = ?", id)
	return err
}
