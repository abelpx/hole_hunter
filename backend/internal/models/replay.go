package models

import (
	"encoding/json"
	"time"
)

// HTTPRequest represents an HTTP request for replay
type HTTPRequest struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Method      string    `json:"method"`
	URL         string    `json:"url"`
	Headers     string    `json:"headers"`     // JSON array of {key, value}
	Body        string    `json:"body"`        // Request body
	ContentType string    `json:"content_type"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// HTTPResponse represents the response from a request
type HTTPResponse struct {
	ID            int       `json:"id"`
	RequestID     int       `json:"request_id"`
	StatusCode    int       `json:"status_code"`
	StatusText    string    `json:"status_text"`
	Headers       string    `json:"headers"`       // JSON array
	Body          string    `json:"body"`          // Response body (can be truncated)
	BodySize      int64     `json:"body_size"`
	HeaderSize    int64     `json:"header_size"`
	Duration      int64     `json:"duration"`      // Response time in milliseconds
	Timestamp     time.Time `json:"timestamp"`
	CreatedAt     time.Time `json:"created_at"`
}

// BruteTask represents a brute force attack task
type BruteTask struct {
	ID              int              `json:"id"`
	Name            string           `json:"name"`
	RequestID       int              `json:"request_id"`
	Type            string           `json:"type"`            // single, multi-pitchfork, multi-cluster
	Status          string           `json:"status"`          // pending, running, paused, completed, failed
	TotalPayloads   int              `json:"total_payloads"`
	SentPayloads    int              `json:"sent_payloads"`
	SuccessCount    int              `json:"success_count"`
	FailureCount    int              `json:"failure_count"`
	StartedAt       *time.Time       `json:"started_at,omitempty"`
	CompletedAt     *time.Time       `json:"completed_at,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

// BruteParameter represents a parameter to brute force
type BruteParameter struct {
	ID           int       `json:"id"`
	TaskID       int       `json:"task_id"`
	Name         string    `json:"name"`         // Parameter name (e.g., username, password)
	Type         string    `json:"type"`         // header, query, body, form, json, cookie
	Position     int       `json:"position"`     // Position in the request
	PayloadSetID int       `json:"payload_set_id"`
	CreatedAt    time.Time `json:"created_at"`
}

// BrutePayloadSet represents a set of payloads for brute force
type BrutePayloadSet struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`    // dictionary, number, charset, date, regex, custom
	Source    string    `json:"source"`  // File content, range definition, etc.
	Config    string    `json:"config"`  // JSON config for the payload type
	CreatedAt time.Time `json:"created_at"`
}

// BrutePayload represents a single payload
type BrutePayload struct {
	ID        int       `json:"id"`
	SetID     int       `json:"set_id"`
	Value     string    `json:"value"`
	CreatedAt time.Time `json:"created_at"`
}

// BruteResult represents a successful brute force result
type BruteResult struct {
	ID             int       `json:"id"`
	TaskID         int       `json:"task_id"`
	ParamName      string    `json:"param_name"`
	Payload        string    `json:"payload"`
	Status         string    `json:"status"`         // success, failed
	StatusCode     int       `json:"status_code"`
	ResponseLength int       `json:"response_length"`
	ResponseTime   int64     `json:"response_time"`
	Body           string    `json:"body"`
	Error          string    `json:"error"`
	CreatedAt      time.Time `json:"created_at"`
}

// CreateReplayRequest represents a request to create a replay request
type CreateReplayRequest struct {
	Name        string                 `json:"name"`
	Method      string                 `json:"method" binding:"required"`
	URL         string                 `json:"url" binding:"required"`
	Headers     []Header               `json:"headers"`
	Body        string                 `json:"body"`
	ContentType string                 `json:"content_type"`
	Tags        []string               `json:"tags"`
}

// Header represents an HTTP header
type Header struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

// CreateBruteTaskRequest represents a request to create a brute force task
type CreateBruteTaskRequest struct {
	Name         string                `json:"name" binding:"required"`
	RequestID    int                   `json:"request_id" binding:"required"`
	Type         string                `json:"type" binding:"required,oneof=single multi-pitchfork multi-cluster"`
	Parameters   []BruteParamConfig    `json:"parameters" binding:"required"`
	Concurrency  int                   `json:"concurrency"`
	Timeout      int                   `json:"timeout"`
	Delay        int                   `json:"delay"`
	RetryCount   int                   `json:"retry_count"`
	SuccessRules []SuccessRule        `json:"success_rules"`
}

// BruteParamConfig represents configuration for a brute force parameter
type BruteParamConfig struct {
	Name         string `json:"name" binding:"required"`
	Type         string `json:"type" binding:"required,oneof=header query body path"`
	Position     int    `json:"position"`
	PayloadSetID int    `json:"payload_set_id" binding:"required"`
}

// BrutePayloadConf represents payload configuration
type BrutePayloadConf struct {
	Type   string `json:"type" binding:"required,oneof=dictionary number charset date regex custom"`
	Source string `json:"source"` // For dictionary: filename or wordlist, for others: range/pattern
	Config string `json:"config"` // Additional config as JSON
}

// SuccessRule defines how to identify a successful attempt
type SuccessRule struct {
	Type      string `json:"type" binding:"required,oneof=keyword status_code length regex"`
	Value     string `json:"value" binding:"required"`
	Negate    bool   `json:"negate"` // If true, match means failure
}

// ReplayRequest stores headers as JSON
func (r *HTTPRequest) ScanHeaders(headers string) error {
	if headers == "" {
		r.Headers = "[]"
		return nil
	}
	return nil
}

func (r *HTTPRequest) HeadersJSON() string {
	if r.Headers == "" {
		return "[]"
	}
	return r.Headers
}

// ReplayRequest stores tags as JSON
func (r *HTTPRequest) ScanTags(tags string) error {
	if tags == "" {
		r.Tags = []string{}
		return nil
	}
	return nil
}

func (r *HTTPRequest) TagsJSON() string {
	if r.Tags == nil {
		return "[]"
	}
	data, _ := json.Marshal(r.Tags)
	return string(data)
}
