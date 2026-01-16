package models

// Report represents a scan report
type Report struct {
	ID          int                    `json:"id"`
	Name        string                 `json:"name"`
	ScanID      int                    `json:"scan_id"`
	Type        string                 `json:"type"`
	Format      string                 `json:"format"`
	FilePath    string                 `json:"file_path"`
	FileSize    int64                  `json:"file_size"`
	Status      string                 `json:"status"`
	Config      map[string]interface{} `json:"config"`
	CreatedAt   string                 `json:"created_at"`
	GeneratedAt string                 `json:"generated_at"`
}

// ReportTemplate represents a report template
type ReportTemplate struct {
	ID          int                    `json:"id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Format      string                 `json:"format"`
	Description string                 `json:"description"`
	Template    string                 `json:"template"`
	Config      map[string]interface{} `json:"config"`
	IsDefault   bool                   `json:"is_default"`
	CreatedAt   string                 `json:"created_at"`
	UpdatedAt   string                 `json:"updated_at"`
}

// ReportConfig represents the configuration for generating a report
type ReportConfig struct {
	IncludeSummary     bool     `json:"include_summary"`
	IncludeVulns       bool     `json:"include_vulns"`
	IncludeScanDetails bool     `json:"include_scan_details"`
	SeverityFilter     []string `json:"severity_filter"`
	GroupBySeverity    bool     `json:"group_by_severity"`
	IncludeCharts      bool     `json:"include_charts"`
}

// ReportExportFormat represents supported export formats
type ReportExportFormat string

const (
	ReportFormatJSON ReportExportFormat = "json"
	ReportFormatHTML ReportExportFormat = "html"
	ReportFormatPDF  ReportExportFormat = "pdf"
	ReportFormatXLSX ReportExportFormat = "xlsx"
)
