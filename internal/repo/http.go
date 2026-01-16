package repo

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
)

// HTTPRequestRepository HTTP 请求仓库
type HTTPRequestRepository struct {
	db *sql.DB
}

// NewHTTPRequestRepository 创建 HTTP 请求仓库
func NewHTTPRequestRepository(db *sql.DB) *HTTPRequestRepository {
	return &HTTPRequestRepository{db: db}
}

// GetAll 获取所有 HTTP 请求
func (r *HTTPRequestRepository) GetAll(ctx context.Context) ([]*models.HttpRequest, error) {
	query := `
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []*models.HttpRequest
	for rows.Next() {
		var req models.HttpRequest
		var headersJSON, tagsJSON string

		if err := rows.Scan(
			&req.ID, &req.Name, &req.Method, &req.URL,
			&headersJSON, &req.Body, &req.ContentType, &tagsJSON,
			&req.CreatedAt, &req.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if err := json.Unmarshal([]byte(headersJSON), &req.Headers); err != nil {
			req.Headers = make(map[string]string)
		}
		if err := json.Unmarshal([]byte(tagsJSON), &req.Tags); err != nil {
			req.Tags = []string{}
		}

		requests = append(requests, &req)
	}

	return requests, rows.Err()
}

// GetByID 根据 ID 获取 HTTP 请求
func (r *HTTPRequestRepository) GetByID(ctx context.Context, id int) (*models.HttpRequest, error) {
	query := `
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests
		WHERE id = ?
	`

	var req models.HttpRequest
	var headersJSON, tagsJSON string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&req.ID, &req.Name, &req.Method, &req.URL,
		&headersJSON, &req.Body, &req.ContentType, &tagsJSON,
		&req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("http request not found")
		}
		return nil, err
	}

	if err := json.Unmarshal([]byte(headersJSON), &req.Headers); err != nil {
		req.Headers = make(map[string]string)
	}
	if err := json.Unmarshal([]byte(tagsJSON), &req.Tags); err != nil {
		req.Tags = []string{}
	}

	return &req, nil
}

// Create 创建 HTTP 请求
func (r *HTTPRequestRepository) Create(ctx context.Context, req *models.HttpRequest) error {
	headersJSON, _ := json.Marshal(req.Headers)
	tagsJSON, _ := json.Marshal(req.Tags)

	query := `
		INSERT INTO http_requests (name, method, url, headers, body, content_type, tags)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		req.Name, req.Method, req.URL, headersJSON, req.Body, req.ContentType, tagsJSON,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	req.ID = int(id)
	return nil
}

// Update 更新 HTTP 请求
func (r *HTTPRequestRepository) Update(ctx context.Context, req *models.HttpRequest) error {
	headersJSON, _ := json.Marshal(req.Headers)
	tagsJSON, _ := json.Marshal(req.Tags)

	query := `
		UPDATE http_requests
		SET name = ?, method = ?, url = ?, headers = ?, body = ?, content_type = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`

	result, err := r.db.ExecContext(ctx, query,
		req.Name, req.Method, req.URL, headersJSON, req.Body, req.ContentType, tagsJSON, req.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("http request not found")
	}

	return nil
}

// Delete 删除 HTTP 请求
func (r *HTTPRequestRepository) Delete(ctx context.Context, id int) error {
	query := `DELETE FROM http_requests WHERE id = ?`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.NotFound("http request not found")
	}

	return nil
}

// HTTPResponseRepository HTTP 响应仓库
type HTTPResponseRepository struct {
	db *sql.DB
}

// NewHTTPResponseRepository 创建 HTTP 响应仓库
func NewHTTPResponseRepository(db *sql.DB) *HTTPResponseRepository {
	return &HTTPResponseRepository{db: db}
}

// Create 创建 HTTP 响应
func (r *HTTPResponseRepository) Create(ctx context.Context, resp *models.HttpResponse) error {
	headersJSON, _ := json.Marshal(resp.Headers)

	query := `
		INSERT INTO http_responses (request_id, status_code, status_text, headers, body, body_size, header_size, duration)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		resp.RequestID, resp.StatusCode, resp.StatusText, headersJSON,
		resp.Body, resp.BodySize, resp.HeaderSize, resp.Duration,
	)
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	resp.ID = int(id)
	return nil
}

// GetByRequestID 根据请求 ID 获取响应
func (r *HTTPResponseRepository) GetByRequestID(ctx context.Context, requestID int) (*models.HttpResponse, error) {
	query := `
		SELECT id, request_id, status_code, status_text, headers, body, body_size, header_size, duration, timestamp, created_at
		FROM http_responses
		WHERE request_id = ?
		ORDER BY created_at DESC
		LIMIT 1
	`

	var resp models.HttpResponse
	var headersJSON string

	err := r.db.QueryRowContext(ctx, query, requestID).Scan(
		&resp.ID, &resp.RequestID, &resp.StatusCode, &resp.StatusText,
		&headersJSON, &resp.Body, &resp.BodySize, &resp.HeaderSize,
		&resp.Duration, &resp.Timestamp, &resp.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.NotFound("http response not found")
		}
		return nil, err
	}

	if err := json.Unmarshal([]byte(headersJSON), &resp.Headers); err != nil {
		resp.Headers = make(map[string]string)
	}

	return &resp, nil
}

// GetHistoryByRequestID 根据请求 ID 获取历史响应记录
func (r *HTTPResponseRepository) GetHistoryByRequestID(ctx context.Context, requestID int) ([]*models.HttpResponse, error) {
	query := `
		SELECT id, request_id, status_code, status_text, headers, body, body_size, header_size, duration, timestamp, created_at
		FROM http_responses
		WHERE request_id = ?
		ORDER BY created_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []*models.HttpResponse
	for rows.Next() {
		var resp models.HttpResponse
		var headersJSON string

		if err := rows.Scan(
			&resp.ID, &resp.RequestID, &resp.StatusCode, &resp.StatusText,
			&headersJSON, &resp.Body, &resp.BodySize, &resp.HeaderSize,
			&resp.Duration, &resp.Timestamp, &resp.CreatedAt,
		); err != nil {
			return nil, err
		}

		if err := json.Unmarshal([]byte(headersJSON), &resp.Headers); err != nil {
			resp.Headers = make(map[string]string)
		}

		responses = append(responses, &resp)
	}

	return responses, rows.Err()
}
