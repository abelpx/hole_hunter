package models

// ScanTask represents a scan task
type ScanTask struct {
	ID                int       `json:"id"`
	Name              *string   `json:"name,omitempty"`
	TargetID          int       `json:"target_id"`
	Status            string    `json:"status"`
	Strategy          string    `json:"strategy"`
	TemplatesUsed     []string  `json:"templates_used"`
	StartedAt         *string   `json:"started_at,omitempty"`
	CompletedAt       *string   `json:"completed_at,omitempty"`
	TotalTemplates    *int      `json:"total_templates,omitempty"`
	ExecutedTemplates *int      `json:"executed_templates,omitempty"`
	Progress          int       `json:"progress"`
	CurrentTemplate   *string   `json:"current_template,omitempty"`
	Error             *string   `json:"error,omitempty"`
	CreatedAt         string    `json:"created_at"`
}

// ScanProgress represents the progress of a scan
type ScanProgress struct {
	TaskID          int       `json:"task_id"`
	Status          string    `json:"status"`
	TotalTemplates  int       `json:"total_templates"`
	Executed        int       `json:"executed_templates"`
	Progress        int       `json:"progress"`
	CurrentTemplate string    `json:"current_template"`
	VulnCount       int       `json:"vuln_count"`
	Error           string    `json:"error,omitempty"`
}
