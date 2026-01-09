package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/holehunter/backend/internal/models"
	"github.com/holehunter/backend/pkg/config"
)

// ReportService handles report generation and export
type ReportService struct {
	db    *sql.DB
	cfg   *config.Config
}

// NewReportService creates a new report service instance
func NewReportService(db *sql.DB, cfg *config.Config) *ReportService {
	return &ReportService{
		db:  db,
		cfg: cfg,
	}
}

// ReportFormat represents the export format
type ReportFormat string

const (
	FormatJSON ReportFormat = "json"
	FormatHTML ReportFormat = "html"
	FormatCSV  ReportFormat = "csv"
)

// ReportRequest represents a report generation request
type ReportRequest struct {
	TaskID    *int       `json:"task_id,omitempty"`
	TargetID  *int       `json:"target_id,omitempty"`
	Severity  []string   `json:"severity,omitempty"`
	StartDate *time.Time `json:"start_date,omitempty"`
	EndDate   *time.Time `json:"end_date,omitempty"`
	Format    ReportFormat `json:"format" binding:"required,oneof=json html csv"`
}

// ExportReport exports vulnerabilities in the specified format
func (s *ReportService) ExportReport(c *gin.Context) {
	var req ReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Query vulnerabilities based on filters
	vulns, err := s.queryVulnerabilities(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Export in the requested format
	switch req.Format {
	case FormatJSON:
		s.exportJSON(c, vulns)
	case FormatCSV:
		s.exportCSV(c, vulns)
	case FormatHTML:
		s.exportHTML(c, vulns)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported format"})
	}
}

// queryVulnerabilities queries vulnerabilities based on filters
func (s *ReportService) queryVulnerabilities(req ReportRequest) ([]models.Vulnerability, error) {
	query := `
		SELECT v.id, v.task_id, v.template_id, v.severity, v.name, v.description,
		       v.url, v.matched_at, v.false_positive, v.cve, v.cvss, v.created_at,
		       t.name as target_name, st.strategy as scan_strategy
		FROM vulnerabilities v
		INNER JOIN scan_tasks st ON v.task_id = st.id
		INNER JOIN targets t ON st.target_id = t.id
		WHERE 1=1
	`
	args := []interface{}{}

	// Filter by task ID
	if req.TaskID != nil {
		query += " AND v.task_id = ?"
		args = append(args, *req.TaskID)
	}

	// Filter by target ID
	if req.TargetID != nil {
		query += " AND st.target_id = ?"
		args = append(args, *req.TargetID)
	}

	// Filter by severity
	if len(req.Severity) > 0 {
		query += " AND v.severity IN ("
		for i, sev := range req.Severity {
			if i > 0 {
				query += ","
			}
			query += "?"
			args = append(args, sev)
		}
		query += ")"
	}

	// Filter by date range
	if req.StartDate != nil {
		query += " AND v.created_at >= ?"
		args = append(args, req.StartDate)
	}
	if req.EndDate != nil {
		query += " AND v.created_at <= ?"
		args = append(args, req.EndDate)
	}

	// Exclude false positives
	query += " AND v.false_positive = 0"

	// Order by severity and date
	query += " ORDER BY CASE v.severity"
	query += " WHEN 'critical' THEN 1"
	query += " WHEN 'high' THEN 2"
	query += " WHEN 'medium' THEN 3"
	query += " WHEN 'low' THEN 4"
	query += " WHEN 'info' THEN 5"
	query += " ELSE 6"
	query += " END, v.created_at DESC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query vulnerabilities: %w", err)
	}
	defer rows.Close()

	var vulns []models.Vulnerability
	for rows.Next() {
		var vuln models.Vulnerability
		var targetName, scanStrategy string

		err := rows.Scan(
			&vuln.ID, &vuln.TaskID, &vuln.TemplateID, &vuln.Severity, &vuln.Name,
			&vuln.Description, &vuln.URL, &vuln.MatchedAt, &vuln.FalsePositive,
			&vuln.CVE, &vuln.CVSS, &vuln.CreatedAt,
			&targetName, &scanStrategy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vulnerability row: %w", err)
		}

		// Add metadata
		vuln.Notes = fmt.Sprintf("Target: %s, Scan Strategy: %s", targetName, scanStrategy)
		vulns = append(vulns, vuln)
	}

	return vulns, nil
}

// exportJSON exports vulnerabilities as JSON
func (s *ReportService) exportJSON(c *gin.Context, vulns []models.Vulnerability) {
	// Create report structure
	report := map[string]interface{}{
		"generated_at": time.Now(),
		"total":        len(vulns),
		"summary": s.generateSummary(vulns),
		"vulnerabilities": vulns,
	}

	// Marshal to JSON
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate JSON"})
		return
	}

	// Set headers and write response
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=holehunter-report-%s.json", time.Now().Format("20060102-150405")))
	c.Data(http.StatusOK, "application/json", data)
}

// exportCSV exports vulnerabilities as CSV
func (s *ReportService) exportCSV(c *gin.Context, vulns []models.Vulnerability) {
	// Create CSV writer
	records := [][]string{
		{"ID", "Severity", "Name", "URL", "CVE", "CVSS", "Description", "Created At"},
	}

	for _, vuln := range vulns {
		records = append(records, []string{
			strconv.Itoa(vuln.ID),
			vuln.Severity,
			vuln.Name,
			vuln.URL,
			vuln.CVE,
			fmt.Sprintf("%.1f", vuln.CVSS),
			vuln.Description,
			vuln.CreatedAt.Format(time.RFC3339),
		})
	}

	// Generate CSV data
	var csvData string
	for _, record := range records {
		csvData += fmt.Sprintf("\"%s\"\n", strings.Join(record, "\",\""))
	}

	// Set headers and write response
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=holehunter-report-%s.csv", time.Now().Format("20060102-150405")))
	c.String(http.StatusOK, csvData)
}

// exportHTML exports vulnerabilities as HTML
func (s *ReportService) exportHTML(c *gin.Context, vulns []models.Vulnerability) {
	summary := s.generateSummary(vulns)

	// Generate HTML report
	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HoleHunter 安全扫描报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #f8fafc; margin-bottom: 10px; }
        .subtitle { color: #94a3b8; margin-bottom: 40px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
        .summary-card h3 { color: #94a3b8; font-size: 14px; margin-bottom: 8px; }
        .summary-card .value { font-size: 32px; font-weight: bold; }
        .critical { color: #f87171; }
        .high { color: #fbbf24; }
        .medium { color: #38bdf8; }
        .low { color: #94a3b8; }
        .info { color: #64748b; }
        .vulnerabilities { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; }
        .vulnerability { border-bottom: 1px solid #334155; padding: 20px 0; }
        .vulnerability:last-child { border-bottom: none; }
        .vuln-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
        .vuln-title { font-size: 18px; font-weight: 600; color: #f8fafc; }
        .vuln-severity { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .severity-critical { background: #dc2626; color: white; }
        .severity-high { background: #f59e0b; color: white; }
        .severity-medium { background: #0ea5e9; color: white; }
        .severity-low { background: #64748b; color: white; }
        .severity-info { background: #475569; color: white; }
        .vuln-meta { display: flex; gap: 20px; margin-bottom: 12px; font-size: 14px; color: #94a3b8; }
        .vuln-description { color: #cbd5e1; line-height: 1.6; }
        .vuln-url { color: #38bdf8; word-break: break-all; }
        .footer { text-align: center; margin-top: 40px; color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>HoleHunter 安全扫描报告</h1>
        <p class="subtitle">生成时间: %s | 总计: %d 个漏洞</p>

        <div class="summary">
            <div class="summary-card">
                <h3>严重</h3>
                <div class="value critical">%d</div>
            </div>
            <div class="summary-card">
                <h3>高危</h3>
                <div class="value high">%d</div>
            </div>
            <div class="summary-card">
                <h3>中危</h3>
                <div class="value medium">%d</div>
            </div>
            <div class="summary-card">
                <h3>低危</h3>
                <div class="value low">%d</div>
            </div>
            <div class="summary-card">
                <h3>信息</h3>
                <div class="value info">%d</div>
            </div>
        </div>

        <div class="vulnerabilities">
            <h2 style="margin-bottom: 20px;">漏洞详情</h2>
            %s
        </div>

        <div class="footer">
            <p>Generated by HoleHunter - 基于 Nuclei 引擎的现代化 Web 安全测试工具</p>
        </div>
    </div>
</body>
</html>`,
		time.Now().Format("2006-01-02 15:04:05"),
		len(vulns),
		summary["critical"], summary["high"], summary["medium"], summary["low"], summary["info"],
		s.generateVulnerabilityHTML(vulns),
	)

	// Set headers and write response
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=holehunter-report-%s.html", time.Now().Format("20060102-150405")))
	c.Data(http.StatusOK, "text/html", []byte(html))
}

// generateSummary generates vulnerability summary statistics
func (s *ReportService) generateSummary(vulns []models.Vulnerability) map[string]int {
	summary := map[string]int{
		"critical": 0,
		"high":     0,
		"medium":   0,
		"low":      0,
		"info":     0,
	}

	for _, vuln := range vulns {
		summary[vuln.Severity]++
	}

	return summary
}

// generateVulnerabilityHTML generates HTML for vulnerabilities list
func (s *ReportService) generateVulnerabilityHTML(vulns []models.Vulnerability) string {
	html := ""
	for _, vuln := range vulns {
		html += fmt.Sprintf(`
            <div class="vulnerability">
                <div class="vuln-header">
                    <div class="vuln-title">%s</div>
                    <span class="vuln-severity severity-%s">%s</span>
                </div>
                <div class="vuln-meta">
                    <span>CVSS: %.1f</span>
                    <span>%s</span>
                </div>
                %s
                <div class="vuln-description">%s</div>
            </div>`,
			vuln.Name,
			vuln.Severity,
			vuln.Severity,
			vuln.CVSS,
			vuln.CreatedAt.Format("2006-01-02 15:04"),
			fmt.Sprintf(`<div class="vuln-url">%s</div>`, vuln.URL),
			vuln.Description,
		)
	}
	return html
}
