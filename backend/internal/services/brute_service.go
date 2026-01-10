package services

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/models"
)

// BruteService handles brute force attacks
type BruteService struct {
	db     *sql.DB
	client *http.Client
}

func NewBruteService(db *sql.DB) *BruteService {
	return &BruteService{
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

// CreateBruteTask creates a new brute force task
func (s *BruteService) CreateBruteTask(c *gin.Context) {
	var req models.CreateBruteTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the base request
	var httpReq models.HTTPRequest
	var headersStr, tagsStr string

	err := s.db.QueryRow(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests WHERE id = ?
	`, req.RequestID).Scan(
		&httpReq.ID, &httpReq.Name, &httpReq.Method, &httpReq.URL, &headersStr,
		&httpReq.Body, &httpReq.ContentType, &tagsStr, &httpReq.CreatedAt, &httpReq.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	httpReq.ScanHeaders(headersStr)
	httpReq.ScanTags(tagsStr)

	// Calculate total payloads based on type
	totalPayloads := s.calculateTotalPayloads(req)

	// Create task
	now := time.Now()
	result, err := s.db.Exec(`
		INSERT INTO brute_tasks (name, request_id, type, status, total_payloads, sent_payloads,
			success_count, failure_count, started_at, completed_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, req.Name, req.RequestID, req.Type, "pending", totalPayloads, 0, 0, 0, nil, nil, now, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	taskID, _ := result.LastInsertId()

	// Save parameters
	for _, param := range req.Parameters {
		_, err := s.db.Exec(`
			INSERT INTO brute_parameters (task_id, name, type, position, payload_set_id, created_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`, taskID, param.Name, param.Type, 0, param.PayloadSetID, now)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    gin.H{"id": taskID},
	})
}

// calculateTotalPayloads calculates total payloads based on task type
func (s *BruteService) calculateTotalPayloads(req models.CreateBruteTaskRequest) int {
	switch req.Type {
	case "single":
		// Single parameter: count of payload set
		if len(req.Parameters) > 0 && req.Parameters[0].PayloadSetID > 0 {
			count, _ := s.getPayloadSetCount(req.Parameters[0].PayloadSetID)
			return count
		}
		return 0
	case "multi-pitchfork":
		// Pitchfork: max of all payload sets
		maxCount := 0
		for _, param := range req.Parameters {
			if param.PayloadSetID > 0 {
				count, _ := s.getPayloadSetCount(param.PayloadSetID)
				if count > maxCount {
					maxCount = count
				}
			}
		}
		return maxCount
	case "multi-cluster":
		// Cluster bomb: product of all payload sets
		total := 1
		for _, param := range req.Parameters {
			if param.PayloadSetID > 0 {
				count, _ := s.getPayloadSetCount(param.PayloadSetID)
				total *= count
			}
		}
		return total
	default:
		return 0
	}
}

// getPayloadSetCount returns the count of payloads in a set
func (s *BruteService) getPayloadSetCount(setID int) (int, error) {
	var count int
	err := s.db.QueryRow("SELECT COUNT(*) FROM brute_payloads WHERE set_id = ?", setID).Scan(&count)
	return count, err
}

// StartBruteTask starts a brute force task
func (s *BruteService) StartBruteTask(c *gin.Context) {
	id := c.Param("id")

	// Update status to running
	now := time.Now()
	_, err := s.db.Exec(`
		UPDATE brute_tasks
		SET status = 'running', started_at = ?, updated_at = ?
		WHERE id = ?
	`, now, now, id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Run in background
	go s.executeBruteTask(context.Background(), id)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// executeBruteTask executes the brute force task
func (s *BruteService) executeBruteTask(ctx context.Context, taskID string) {
	// Get task details
	var task models.BruteTask
	err := s.db.QueryRow(`
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
			success_count, failure_count, started_at, completed_at, created_at, updated_at
		FROM brute_tasks WHERE id = ?
	`, taskID).Scan(
		&task.ID, &task.Name, &task.RequestID, &task.Type, &task.Status, &task.TotalPayloads,
		&task.SentPayloads, &task.SuccessCount, &task.FailureCount, &task.StartedAt,
		&task.CompletedAt, &task.CreatedAt, &task.UpdatedAt,
	)

	if err != nil {
		return
	}

	// Get base request
	var httpReq models.HTTPRequest
	var headersStr, tagsStr string

	err = s.db.QueryRow(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests WHERE id = ?
	`, task.RequestID).Scan(
		&httpReq.ID, &httpReq.Name, &httpReq.Method, &httpReq.URL, &headersStr,
		&httpReq.Body, &httpReq.ContentType, &tagsStr, &httpReq.CreatedAt, &httpReq.UpdatedAt,
	)

	if err != nil {
		s.markTaskFailed(taskID, err.Error())
		return
	}

	httpReq.ScanHeaders(headersStr)
	httpReq.ScanTags(tagsStr)

	// Get parameters
	params, err := s.getTaskParameters(task.ID)
	if err != nil {
		s.markTaskFailed(taskID, err.Error())
		return
	}

	// Execute based on type
	switch task.Type {
	case "single":
		s.executeSingleBrute(ctx, &task, &httpReq, params)
	case "multi-pitchfork":
		s.executePitchforkBrute(ctx, &task, &httpReq, params)
	case "multi-cluster":
		s.executeClusterBrute(ctx, &task, &httpReq, params)
	}

	// Mark as completed
	s.markTaskCompleted(taskID)
}

// executeSingleBrute executes single parameter brute force
func (s *BruteService) executeSingleBrute(ctx context.Context, task *models.BruteTask, httpReq *models.HTTPRequest, params []models.BruteParameter) {
	if len(params) == 0 {
		return
	}

	// Get payloads
	payloads, err := s.getPayloads(params[0].PayloadSetID)
	if err != nil {
		s.markTaskFailed(strconv.Itoa(task.ID), err.Error())
		return
	}

	// Execute each payload
	for _, payload := range payloads {
		select {
		case <-ctx.Done():
			return
		default:
			// Replace parameter in URL and body
			modifiedReq := s.replaceParameter(httpReq, params[0].Name, params[0].Type, params[0].Position, payload.Value)

			// Send request
			resp, err := s.sendBruteRequest(modifiedReq)
			if err != nil {
				s.saveBruteResult(task.ID, params[0].Name, payload.Value, nil, err)
				s.incrementFailureCount(strconv.Itoa(task.ID))
			} else {
				s.saveBruteResult(task.ID, params[0].Name, payload.Value, resp, nil)
				s.incrementSuccessCount(strconv.Itoa(task.ID))
			}
			s.incrementSentCount(strconv.Itoa(task.ID))
		}
	}
}

// executePitchforkBrute executes pitchfork mode (synchronized multi-parameter)
func (s *BruteService) executePitchforkBrute(ctx context.Context, task *models.BruteTask, httpReq *models.HTTPRequest, params []models.BruteParameter) {
	if len(params) == 0 {
		return
	}

	// Get all payloads
	allPayloads := make([][]models.BrutePayload, len(params))
	maxLen := 0

	for i, param := range params {
		payloads, err := s.getPayloads(param.PayloadSetID)
		if err != nil {
			s.markTaskFailed(strconv.Itoa(task.ID), err.Error())
			return
		}
		allPayloads[i] = payloads
		if len(payloads) > maxLen {
			maxLen = len(payloads)
		}
	}

	// Execute in pitchfork mode (use same index for all parameters)
	for i := 0; i < maxLen; i++ {
		select {
		case <-ctx.Done():
			return
		default:
			modifiedReq := httpReq

			// Replace all parameters
			for j, param := range params {
				if i < len(allPayloads[j]) {
					modifiedReq = s.replaceParameter(modifiedReq, param.Name, param.Type, param.Position, allPayloads[j][i].Value)
				}
			}

			// Send request
			resp, err := s.sendBruteRequest(modifiedReq)
			if err != nil {
				s.saveBruteResult(task.ID, "multi", "", nil, err)
				s.incrementFailureCount(strconv.Itoa(task.ID))
			} else {
				s.saveBruteResult(task.ID, "multi", "", resp, nil)
				s.incrementSuccessCount(strconv.Itoa(task.ID))
			}
			s.incrementSentCount(strconv.Itoa(task.ID))
		}
	}
}

// executeClusterBrute executes cluster bomb mode (cartesian product)
func (s *BruteService) executeClusterBrute(ctx context.Context, task *models.BruteTask, httpReq *models.HTTPRequest, params []models.BruteParameter) {
	if len(params) < 2 {
		return
	}

	// Get all payloads
	allPayloads := make([][]models.BrutePayload, len(params))

	for i, param := range params {
		payloads, err := s.getPayloads(param.PayloadSetID)
		if err != nil {
			s.markTaskFailed(strconv.Itoa(task.ID), err.Error())
			return
		}
		allPayloads[i] = payloads
	}

	// Generate cartesian product and execute
	s.generateCartesianProduct(ctx, task, httpReq, params, allPayloads, 0, make(map[string]string))
}

// generateCartesianProduct recursively generates combinations
func (s *BruteService) generateCartesianProduct(ctx context.Context, task *models.BruteTask, httpReq *models.HTTPRequest, params []models.BruteParameter, allPayloads [][]models.BrutePayload, index int, current map[string]string) {
	if index >= len(params) {
		// Execute with current combination
		modifiedReq := httpReq
		for _, param := range params {
			value := current[param.Name]
			modifiedReq = s.replaceParameter(modifiedReq, param.Name, param.Type, param.Position, value)
		}

		resp, err := s.sendBruteRequest(modifiedReq)
		if err != nil {
			s.saveBruteResult(task.ID, "cluster", "", nil, err)
			s.incrementFailureCount(strconv.Itoa(task.ID))
		} else {
			s.saveBruteResult(task.ID, "cluster", "", resp, nil)
			s.incrementSuccessCount(strconv.Itoa(task.ID))
		}
		s.incrementSentCount(strconv.Itoa(task.ID))
		return
	}

	for _, payload := range allPayloads[index] {
		select {
		case <-ctx.Done():
			return
		default:
			current[params[index].Name] = payload.Value
			s.generateCartesianProduct(ctx, task, httpReq, params, allPayloads, index+1, current)
		}
	}
}

// replaceParameter replaces a parameter in the request
func (s *BruteService) replaceParameter(req *models.HTTPRequest, paramName string, paramType string, position int, value string) *models.HTTPRequest {
	result := *req

	switch paramType {
	case "query":
		// Replace in query string
		parsedURL, _ := url.Parse(req.URL)
		query := parsedURL.Query()
		query.Set(paramName, value)
		parsedURL.RawQuery = query.Encode()
		result.URL = parsedURL.String()
	case "body":
		// Replace in body (supports JSON and form data)
		if strings.Contains(req.ContentType, "application/json") {
			// JSON body replacement
			var bodyMap map[string]interface{}
			json.Unmarshal([]byte(req.Body), &bodyMap)
			bodyMap[paramName] = value
			newBody, _ := json.Marshal(bodyMap)
			result.Body = string(newBody)
		} else {
			// Form data replacement
			bodyValues, _ := url.ParseQuery(req.Body)
			bodyValues.Set(paramName, value)
			result.Body = bodyValues.Encode()
		}
	case "header":
		// Replace in headers
		var headers []models.Header
		json.Unmarshal([]byte(req.Headers), &headers)
		found := false
		for i, h := range headers {
			if h.Key == paramName {
				headers[i].Value = value
				found = true
				break
			}
		}
		if !found {
			headers = append(headers, models.Header{Key: paramName, Value: value})
		}
		newHeaders, _ := json.Marshal(headers)
		result.Headers = string(newHeaders)
	case "path":
		// Replace in path (e.g., /api/users/{id})
		result.URL = strings.Replace(result.URL, "{"+paramName+"}", value, -1)
		result.URL = strings.Replace(result.URL, ":"+paramName, value, -1)
	}

	return &result
}

// sendBruteRequest sends a brute force request
func (s *BruteService) sendBruteRequest(req *models.HTTPRequest) (*http.Response, error) {
	// Parse headers
	var headers []models.Header
	json.Unmarshal([]byte(req.Headers), &headers)

	// Create HTTP request
	httpReq, err := http.NewRequest(req.Method, req.URL, strings.NewReader(req.Body))
	if err != nil {
		return nil, err
	}

	// Set headers
	for _, h := range headers {
		if strings.ToLower(h.Key) == "host" {
			httpReq.Host = h.Value
		} else if strings.ToLower(h.Key) == "content-length" {
			continue
		} else {
			httpReq.Header.Set(h.Key, h.Value)
		}
	}

	if req.ContentType != "" {
		httpReq.Header.Set("Content-Type", req.ContentType)
	}

	return s.client.Do(httpReq)
}

// saveBruteResult saves a brute force result
func (s *BruteService) saveBruteResult(taskID int, paramName string, payload string, resp *http.Response, err error) {
	now := time.Now()

	if err != nil {
		// Save failed result
		_, dbErr := s.db.Exec(`
			INSERT INTO brute_results (task_id, param_name, payload, status, error, created_at)
			VALUES (?, ?, ?, 'failed', ?, ?)
		`, taskID, paramName, payload, err.Error(), now)
		if dbErr != nil {
			fmt.Printf("Failed to save brute result: %v\n", dbErr)
		}
		return
	}

	// Read response body
	bodyBytes, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	// Save successful result
	_, dbErr := s.db.Exec(`
		INSERT INTO brute_results (task_id, param_name, payload, status, status_code,
			response_length, response_time, body, created_at)
		VALUES (?, ?, ?, 'success', ?, ?, ?, ?, ?)
	`, taskID, paramName, payload, resp.StatusCode, len(bodyBytes), 0, string(bodyBytes), now)

	if dbErr != nil {
		fmt.Printf("Failed to save brute result: %v\n", dbErr)
	}
}

// getTaskParameters retrieves parameters for a task
func (s *BruteService) getTaskParameters(taskID int) ([]models.BruteParameter, error) {
	rows, err := s.db.Query(`
		SELECT id, task_id, name, type, position, payload_set_id, created_at
		FROM brute_parameters WHERE task_id = ?
	`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var params []models.BruteParameter
	for rows.Next() {
		var param models.BruteParameter
		err := rows.Scan(&param.ID, &param.TaskID, &param.Name, &param.Type, &param.Position, &param.PayloadSetID, &param.CreatedAt)
		if err != nil {
			return nil, err
		}
		params = append(params, param)
	}

	return params, nil
}

// getPayloads retrieves payloads for a set
func (s *BruteService) getPayloads(setID int) ([]models.BrutePayload, error) {
	rows, err := s.db.Query(`
		SELECT id, set_id, value, created_at
		FROM brute_payloads WHERE set_id = ?
	`, setID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payloads []models.BrutePayload
	for rows.Next() {
		var payload models.BrutePayload
		err := rows.Scan(&payload.ID, &payload.SetID, &payload.Value, &payload.CreatedAt)
		if err != nil {
			return nil, err
		}
		payloads = append(payloads, payload)
	}

	return payloads, nil
}

// incrementSentCount increments the sent payloads count
func (s *BruteService) incrementSentCount(taskID string) {
	s.db.Exec("UPDATE brute_tasks SET sent_payloads = sent_payloads + 1, updated_at = ? WHERE id = ?", time.Now(), taskID)
}

// incrementSuccessCount increments the success count
func (s *BruteService) incrementSuccessCount(taskID string) {
	s.db.Exec("UPDATE brute_tasks SET success_count = success_count + 1, updated_at = ? WHERE id = ?", time.Now(), taskID)
}

// incrementFailureCount increments the failure count
func (s *BruteService) incrementFailureCount(taskID string) {
	s.db.Exec("UPDATE brute_tasks SET failure_count = failure_count + 1, updated_at = ? WHERE id = ?", time.Now(), taskID)
}

// markTaskCompleted marks a task as completed
func (s *BruteService) markTaskCompleted(taskID string) {
	now := time.Now()
	s.db.Exec("UPDATE brute_tasks SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?", now, now, taskID)
}

// markTaskFailed marks a task as failed
func (s *BruteService) markTaskFailed(taskID string, errorMsg string) {
	now := time.Now()
	s.db.Exec("UPDATE brute_tasks SET status = 'failed', completed_at = ?, updated_at = ? WHERE id = ?", now, now, taskID)
	fmt.Printf("Task %s failed: %s\n", taskID, errorMsg)
}

// CreatePayloadSet creates a new payload set
func (s *BruteService) CreatePayloadSet(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Type        string `json:"type" binding:"required"` // dictionary, number, charset, date
		Config      string `json:"config"`                  // JSON config based on type
		Payloads    []string `json:"payloads"`              // For dictionary type
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	result, err := s.db.Exec(`
		INSERT INTO brute_payload_sets (name, type, config, created_at)
		VALUES (?, ?, ?, ?)
	`, req.Name, req.Type, req.Config, now)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	setID, _ := result.LastInsertId()

	// Add payloads if provided
	if req.Type == "dictionary" && len(req.Payloads) > 0 {
		stmt, _ := s.db.Prepare(`INSERT INTO brute_payloads (set_id, value, created_at) VALUES (?, ?, ?)`)
		defer stmt.Close()

		for _, payload := range req.Payloads {
			_, err := stmt.Exec(setID, payload, now)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	} else {
		// Generate payloads based on type
		s.generateAndStorePayloads(setID, req.Type, req.Config)
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    gin.H{"id": setID},
	})
}

// generateAndStorePayloads generates payloads based on type
func (s *BruteService) generateAndStorePayloads(setID int64, payloadType string, config string) {
	now := time.Now()
	stmt, _ := s.db.Prepare(`INSERT INTO brute_payloads (set_id, value, created_at) VALUES (?, ?, ?)`)
	defer stmt.Close()

	switch payloadType {
	case "number":
		// Generate number sequence
		var cfg struct {
			Start int `json:"start"`
			End   int `json:"end"`
			Step  int `json:"step"`
		}
		json.Unmarshal([]byte(config), &cfg)

		for i := cfg.Start; i <= cfg.End; i += cfg.Step {
			stmt.Exec(setID, strconv.Itoa(i), now)
		}

	case "charset":
		// Generate character combinations
		var cfg struct {
			Charset  string `json:"charset"`
			MinLen   int    `json:"min_length"`
			MaxLen   int    `json:"max_length"`
		}
		json.Unmarshal([]byte(config), &cfg)

		s.generateCharsetCombinations(setID, cfg.Charset, cfg.MinLen, cfg.MaxLen, now)

	case "date":
		// Generate date sequence
		var cfg struct {
			StartDate string `json:"start_date"`
			EndDate   string `json:"end_date"`
			Format    string `json:"format"`
		}
		json.Unmarshal([]byte(config), &cfg)

		layout := "2006-01-02"
		if cfg.Format != "" {
			layout = cfg.Format
		}

		start, _ := time.Parse(layout, cfg.StartDate)
		end, _ := time.Parse(layout, cfg.EndDate)

		for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
			stmt.Exec(setID, d.Format(layout), now)
		}
	}
}

// generateCharsetCombinations generates all combinations of charset
func (s *BruteService) generateCharsetCombinations(setID int64, charset string, minLen, maxLen int, now time.Time) {
	stmt, _ := s.db.Prepare(`INSERT INTO brute_payloads (set_id, value, created_at) VALUES (?, ?, ?)`)
	defer stmt.Close()

	var generate func(current string, length int)
	generate = func(current string, length int) {
		if len(current) == length {
			stmt.Exec(setID, current, now)
			return
		}
		for _, c := range charset {
			generate(current+string(c), length)
		}
	}

	for length := minLen; length <= maxLen; length++ {
		generate("", length)
	}
}

// ListPayloadSets lists all payload sets
func (s *BruteService) ListPayloadSets(c *gin.Context) {
	rows, err := s.db.Query(`
		SELECT id, name, type, config, created_at
		FROM brute_payload_sets
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	sets := []models.BrutePayloadSet{}
	for rows.Next() {
		var set models.BrutePayloadSet
		err := rows.Scan(&set.ID, &set.Name, &set.Type, &set.Config, &set.CreatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		sets = append(sets, set)
	}

	c.JSON(http.StatusOK, gin.H{"data": sets})
}

// GetBruteTask retrieves a brute force task
func (s *BruteService) GetBruteTask(c *gin.Context) {
	id := c.Param("id")
	var task models.BruteTask

	err := s.db.QueryRow(`
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
			success_count, failure_count, started_at, completed_at, created_at, updated_at
		FROM brute_tasks WHERE id = ?
	`, id).Scan(
		&task.ID, &task.Name, &task.RequestID, &task.Type, &task.Status, &task.TotalPayloads,
		&task.SentPayloads, &task.SuccessCount, &task.FailureCount, &task.StartedAt,
		&task.CompletedAt, &task.CreatedAt, &task.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": task})
}

// ListBruteTasks lists all brute force tasks
func (s *BruteService) ListBruteTasks(c *gin.Context) {
	rows, err := s.db.Query(`
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads,
			success_count, failure_count, started_at, completed_at, created_at, updated_at
		FROM brute_tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	tasks := []models.BruteTask{}
	for rows.Next() {
		var task models.BruteTask
		err := rows.Scan(
			&task.ID, &task.Name, &task.RequestID, &task.Type, &task.Status, &task.TotalPayloads,
			&task.SentPayloads, &task.SuccessCount, &task.FailureCount, &task.StartedAt,
			&task.CompletedAt, &task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		tasks = append(tasks, task)
	}

	c.JSON(http.StatusOK, gin.H{"data": tasks})
}

// GetBruteResults retrieves results for a brute force task
func (s *BruteService) GetBruteResults(c *gin.Context) {
	id := c.Param("id")

	rows, err := s.db.Query(`
		SELECT id, task_id, param_name, payload, status, status_code, response_length,
			response_time, body, error, created_at
		FROM brute_results
		WHERE task_id = ?
		ORDER BY created_at DESC
		LIMIT 1000
	`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	results := []models.BruteResult{}
	for rows.Next() {
		var result models.BruteResult
		err := rows.Scan(
			&result.ID, &result.TaskID, &result.ParamName, &result.Payload, &result.Status,
			&result.StatusCode, &result.ResponseLength, &result.ResponseTime, &result.Body,
			&result.Error, &result.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		results = append(results, result)
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// ImportPayloads imports payloads from a file
func (s *BruteService) ImportPayloads(c *gin.Context) {
	var req struct {
		SetID int    `json:"set_id" binding:"required"`
		File  string `json:"file" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Open file
	file, err := os.Open(req.File)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	// Read payloads
	scanner := bufio.NewScanner(file)
	now := time.Now()
	stmt, _ := s.db.Prepare(`INSERT INTO brute_payloads (set_id, value, created_at) VALUES (?, ?, ?)`)
	defer stmt.Close()

	count := 0
	for scanner.Scan() {
		payload := strings.TrimSpace(scanner.Text())
		if payload != "" {
			_, err := stmt.Exec(req.SetID, payload, now)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			count++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"imported": count},
	})
}

// CancelBruteTask cancels a running brute force task
func (s *BruteService) CancelBruteTask(c *gin.Context) {
	id := c.Param("id")

	_, err := s.db.Exec(`
		UPDATE brute_tasks SET status = 'cancelled', completed_at = ?, updated_at = ?
		WHERE id = ?
	`, time.Now(), time.Now(), id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DeleteBruteTask deletes a brute force task
func (s *BruteService) DeleteBruteTask(c *gin.Context) {
	id := c.Param("id")

	_, err := s.db.Exec("DELETE FROM brute_results WHERE task_id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = s.db.Exec("DELETE FROM brute_parameters WHERE task_id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err = s.db.Exec("DELETE FROM brute_tasks WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// AnalyzeResults analyzes brute force results
func (s *BruteService) AnalyzeResults(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		FilterKeyword    string `json:"filter_keyword"`
		FilterStatusCode int    `json:"filter_status_code"`
		FilterLength     int    `json:"filter_length"`
		FilterOperator   string `json:"filter_operator"` // eq, ne, gt, lt
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build query
	query := `
		SELECT id, task_id, param_name, payload, status, status_code, response_length,
			response_time, body, error, created_at
		FROM brute_results
		WHERE task_id = ?
	`
	args := []interface{}{id}

	if req.FilterKeyword != "" {
		query += " AND body LIKE ?"
		args = append(args, "%"+req.FilterKeyword+"%")
	}

	if req.FilterStatusCode > 0 {
		query += " AND status_code = ?"
		args = append(args, req.FilterStatusCode)
	}

	if req.FilterLength > 0 {
		switch req.FilterOperator {
		case "eq":
			query += " AND response_length = ?"
		case "ne":
			query += " AND response_length != ?"
		case "gt":
			query += " AND response_length > ?"
		case "lt":
			query += " AND response_length < ?"
		default:
			query += " AND response_length = ?"
		}
		args = append(args, req.FilterLength)
	}

	query += " ORDER BY created_at DESC LIMIT 1000"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	results := []models.BruteResult{}
	for rows.Next() {
		var result models.BruteResult
		err := rows.Scan(
			&result.ID, &result.TaskID, &result.ParamName, &result.Payload, &result.Status,
			&result.StatusCode, &result.ResponseLength, &result.ResponseTime, &result.Body,
			&result.Error, &result.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		results = append(results, result)
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}
