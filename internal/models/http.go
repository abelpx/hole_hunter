package models

// HttpRequest represents an HTTP request
type HttpRequest struct {
	ID          int               `json:"id"`
	Name        string            `json:"name"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	ContentType string            `json:"content_type"`
	Tags        []string          `json:"tags"`
	CreatedAt   string            `json:"created_at"`
	UpdatedAt   string            `json:"updated_at"`
}

// HttpResponse represents an HTTP response
type HttpResponse struct {
	ID         int               `json:"id"`
	RequestID  int               `json:"request_id"`
	StatusCode int               `json:"status_code"`
	StatusText string            `json:"status_text"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	BodySize   int               `json:"body_size"`
	HeaderSize int               `json:"header_size"`
	Duration   int               `json:"duration"`
	Timestamp  string            `json:"timestamp"`
	CreatedAt  string            `json:"created_at"`
}
