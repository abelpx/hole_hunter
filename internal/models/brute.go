package models

// BruteTask represents a brute force task
type BruteTask struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	RequestID     int    `json:"request_id"`
	Type          string `json:"type"`
	Status        string `json:"status"`
	TotalPayloads int    `json:"total_payloads"`
	SentPayloads  int    `json:"sent_payloads"`
	SuccessCount  int    `json:"success_count"`
	FailureCount  int    `json:"failure_count"`
	StartedAt     string `json:"started_at"`
	CompletedAt   string `json:"completed_at"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

// BrutePayloadSet represents a payload set
type BrutePayloadSet struct {
	ID        int                    `json:"id"`
	Name      string                 `json:"name"`
	Type      string                 `json:"type"`
	Config    map[string]interface{} `json:"config"`
	CreatedAt string                 `json:"created_at"`
}
