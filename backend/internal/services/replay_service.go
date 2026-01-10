package services

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/models"
)

// ReplayService handles HTTP request replay functionality
type ReplayService struct {
	db    *sql.DB
	client *http.Client
}

func NewReplayService(db *sql.DB) *ReplayService {
	return &ReplayService{
		db: db,
		client: &http.Client{
			Timeout: 30 * time.Second,
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

// ListRequests lists all saved HTTP requests
func (s *ReplayService) ListRequests(c *gin.Context) {
	rows, err := s.db.Query(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	requests := []models.HTTPRequest{}
	for rows.Next() {
		var req models.HTTPRequest
		var headersStr, tagsStr string

		err := rows.Scan(
			&req.ID, &req.Name, &req.Method, &req.URL, &headersStr,
			&req.Body, &req.ContentType, &tagsStr, &req.CreatedAt, &req.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		req.ScanHeaders(headersStr)
		req.ScanTags(tagsStr)
		requests = append(requests, req)
	}

	c.JSON(http.StatusOK, gin.H{"data": requests})
}

// GetRequest retrieves a single HTTP request
func (s *ReplayService) GetRequest(c *gin.Context) {
	id := c.Param("id")
	var req models.HTTPRequest
	var headersStr, tagsStr string

	err := s.db.QueryRow(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Name, &req.Method, &req.URL, &headersStr,
		&req.Body, &req.ContentType, &tagsStr, &req.CreatedAt, &req.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	req.ScanHeaders(headersStr)
	req.ScanTags(tagsStr)
	c.JSON(http.StatusOK, gin.H{"data": req})
}

// CreateRequest creates a new HTTP request for replay
func (s *ReplayService) CreateRequest(c *gin.Context) {
	var reqConfig models.CreateReplayRequest
	if err := c.ShouldBindJSON(&reqConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	headersJSON, _ := json.Marshal(reqConfig.Headers)
	tagsJSON, _ := json.Marshal(reqConfig.Tags)
	now := time.Now()

	result, err := s.db.Exec(`
		INSERT INTO http_requests (name, method, url, headers, body, content_type, tags, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, reqConfig.Name, reqConfig.Method, reqConfig.URL, string(headersJSON),
		reqConfig.Body, reqConfig.ContentType, string(tagsJSON), now, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    gin.H{"id": id},
	})
}

// UpdateRequest updates an existing HTTP request
func (s *ReplayService) UpdateRequest(c *gin.Context) {
	id := c.Param("id")
	var reqConfig models.CreateReplayRequest
	if err := c.ShouldBindJSON(&reqConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	headersJSON, _ := json.Marshal(reqConfig.Headers)
	tagsJSON, _ := json.Marshal(reqConfig.Tags)
	now := time.Now()

	_, err := s.db.Exec(`
		UPDATE http_requests
		SET name = ?, method = ?, url = ?, headers = ?, body = ?, content_type = ?, tags = ?, updated_at = ?
		WHERE id = ?
	`, reqConfig.Name, reqConfig.Method, reqConfig.URL, string(headersJSON),
		reqConfig.Body, reqConfig.ContentType, string(tagsJSON), now, id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DeleteRequest deletes an HTTP request
func (s *ReplayService) DeleteRequest(c *gin.Context) {
	id := c.Param("id")

	_, err := s.db.Exec("DELETE FROM http_requests WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// SendRequest sends an HTTP request and saves the response
func (s *ReplayService) SendRequest(c *gin.Context) {
	id := c.Param("id")

	// Get the request
	var req models.HTTPRequest
	var headersStr, tagsStr string

	err := s.db.QueryRow(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests WHERE id = ?
	`, id).Scan(
		&req.ID, &req.Name, &req.Method, &req.URL, &headersStr,
		&req.Body, &req.ContentType, &tagsStr, &req.CreatedAt, &req.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	req.ScanHeaders(headersStr)
	req.ScanTags(tagsStr)

	// Parse headers
	var headers []models.Header
	json.Unmarshal([]byte(req.Headers), &headers)

	// Create HTTP request
	httpReq, err := http.NewRequest(req.Method, req.URL, strings.NewReader(req.Body))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid request: %v", err)})
		return
	}

	// Set headers
	for _, h := range headers {
		if strings.ToLower(h.Key) == "host" {
			httpReq.Host = h.Value
		} else if strings.ToLower(h.Key) == "content-length" {
			// Skip, will be set automatically
			continue
		} else {
			httpReq.Header.Set(h.Key, h.Value)
		}
	}

	// Set content type if provided
	if req.ContentType != "" {
		httpReq.Header.Set("Content-Type", req.ContentType)
	}

	// Send request
	startTime := time.Now()
	resp, err := s.client.Do(httpReq)
	duration := time.Since(startTime)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Request failed: %v", err)})
		return
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to read response: %v", err)})
		return
	}

	// Read response headers
	var respHeaders []models.Header
	for k, vv := range resp.Header {
		for _, v := range vv {
			respHeaders = append(respHeaders, models.Header{Key: k, Value: v})
		}
	}
	respHeadersJSON, _ := json.Marshal(respHeaders)

	// Truncate body if too large (store up to 1MB)
	maxBodySize := int64(1024 * 1024)
	storedBody := string(bodyBytes)
	if int64(len(storedBody)) > maxBodySize {
		storedBody = storedBody[:maxBodySize] + "\n\n... (truncated)"
	}

	// Save response
	now := time.Now()
	_, err = s.db.Exec(`
		INSERT INTO http_responses (request_id, status_code, status_text, headers, body, body_size, header_size, duration, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, req.ID, resp.StatusCode, resp.Status[:], string(respHeadersJSON), storedBody,
		len(bodyBytes), calculateHeaderSize(resp.Header), duration.Milliseconds(), now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status_code":  resp.StatusCode,
			"status_text":  resp.Status[:],
			"headers":      respHeaders,
			"body":         string(bodyBytes),
			"body_size":    len(bodyBytes),
			"duration":     duration.Milliseconds(),
			"timestamp":    now,
		},
	})
}

// GetResponseHistory retrieves response history for a request
func (s *ReplayService) GetResponseHistory(c *gin.Context) {
	id := c.Param("id")

	rows, err := s.db.Query(`
		SELECT id, request_id, status_code, status_text, headers, body_size, duration, timestamp, created_at
		FROM http_responses
		WHERE request_id = ?
		ORDER BY created_at DESC
		LIMIT 100
	`, id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	responses := []models.HTTPResponse{}
	for rows.Next() {
		var resp models.HTTPResponse

		err := rows.Scan(
			&resp.ID, &resp.RequestID, &resp.StatusCode, &resp.StatusText,
			&resp.Headers, &resp.BodySize, &resp.Duration, &resp.Timestamp, &resp.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		responses = append(responses, resp)
	}

	c.JSON(http.StatusOK, gin.H{"data": responses})
}

// GetResponse retrieves a single response
func (s *ReplayService) GetResponse(c *gin.Context) {
	id := c.Param("id")
	var resp models.HTTPResponse

	err := s.db.QueryRow(`
		SELECT id, request_id, status_code, status_text, headers, body, duration, timestamp, created_at
		FROM http_responses WHERE id = ?
	`, id).Scan(
		&resp.ID, &resp.RequestID, &resp.StatusCode, &resp.StatusText,
		&resp.Headers, &resp.Body, &resp.Duration, &resp.Timestamp, &resp.CreatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Response not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": resp})
}

// ImportRequest imports a request from raw text (curl, raw HTTP)
func (s *ReplayService) ImportRequest(c *gin.Context) {
	var req struct {
		Raw string `json:"raw" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse the raw request
	httpReq, err := s.parseRawRequest(req.Raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to parse request: %v", err)})
		return
	}

	// Extract headers
	var headers []models.Header
	for k, vv := range httpReq.Header {
		for _, v := range vv {
			headers = append(headers, models.Header{Key: k, Value: v})
		}
	}

	// Read body
	bodyBytes, err := io.ReadAll(httpReq.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create request
	reqConfig := models.CreateReplayRequest{
		Name:        fmt.Sprintf("Imported %s", httpReq.Method),
		Method:      httpReq.Method,
		URL:         httpReq.URL.String(),
		Headers:     headers,
		Body:        string(bodyBytes),
		ContentType: httpReq.Header.Get("Content-Type"),
	}

	headersJSON, _ := json.Marshal(reqConfig.Headers)
	tagsJSON, _ := json.Marshal([]string{})
	now := time.Now()

	result, err := s.db.Exec(`
		INSERT INTO http_requests (name, method, url, headers, body, content_type, tags, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, reqConfig.Name, reqConfig.Method, reqConfig.URL, string(headersJSON),
		reqConfig.Body, reqConfig.ContentType, string(tagsJSON), now, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    gin.H{"id": id},
	})
}

// parseRawRequest parses a raw HTTP request string
func (s *ReplayService) parseRawRequest(raw string) (*http.Request, error) {
	// Try to detect if it's a curl command or raw HTTP
	if strings.HasPrefix(strings.TrimSpace(raw), "curl") {
		return s.parseCurlCommand(raw)
	}

	// Parse as raw HTTP
	reader := bufio.NewReader(strings.NewReader(raw))
	return http.ReadRequest(reader)
}

// parseCurlCommand parses a curl command into an HTTP request
func (s *ReplayService) parseCurlCommand(curlCmd string) (*http.Request, error) {
	// Simple curl parser - extract URL and basic options
	parts := strings.Fields(curlCmd)

	var urlStr string
	var headers []models.Header
	var body string
	method := "GET"

	for i, part := range parts {
		if i == 0 {
			continue // Skip 'curl'
		}

		if strings.HasPrefix(part, "http://") || strings.HasPrefix(part, "https://") {
			urlStr = part
		} else if part == "-X" && i+1 < len(parts) {
			method = parts[i+1]
		} else if part == "-H" && i+1 < len(parts) {
			headerParts := strings.SplitN(parts[i+1], ":", 2)
			if len(headerParts) == 2 {
				headers = append(headers, models.Header{
					Key:   strings.Trim(headerParts[0], `"'`),
					Value: strings.Trim(headerParts[1], `"'`),
				})
			}
		} else if part == "-d" && i+1 < len(parts) {
			body = strings.Trim(parts[i+1], `"'`)
			method = "POST"
		}
	}

	if urlStr == "" {
		return nil, fmt.Errorf("no URL found in curl command")
	}

	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}

	httpReq, err := http.NewRequest(method, urlStr, bodyReader)
	if err != nil {
		return nil, err
	}

	// Set headers
	for _, h := range headers {
		httpReq.Header.Set(h.Key, h.Value)
	}

	return httpReq, nil
}

// calculateHeaderSize estimates the size of headers in bytes
func calculateHeaderSize(h http.Header) int64 {
	size := 0
	for k, vv := range h {
		size += len(k)
		for _, v := range vv {
			size += len(v)
		}
	}
	return int64(size)
}
