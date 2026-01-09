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
	FormatPDF  ReportFormat = "pdf"
	FormatWord ReportFormat = "word"
)

// ReportRequest represents a report generation request
type ReportRequest struct {
	TaskID    *int       `json:"task_id,omitempty"`
	TargetID  *int       `json:"target_id,omitempty"`
	Severity  []string   `json:"severity,omitempty"`
	StartDate *time.Time `json:"start_date,omitempty"`
	EndDate   *time.Time `json:"end_date,omitempty"`
	Format    ReportFormat `json:"format" binding:"required,oneof=json html csv pdf word"`
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
		s.exportHTML(c, vulns, false)
	case FormatPDF:
		// PDF is generated as printable HTML
		s.exportHTML(c, vulns, true)
	case FormatWord:
		s.exportRTF(c, vulns)
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
		"summary":      s.generateSummary(vulns),
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
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=hunter-report-%s.json", time.Now().Format("20060102-150405")))
	c.Data(http.StatusOK, "application/json", data)
}

// exportCSV exports vulnerabilities as CSV
func (s *ReportService) exportCSV(c *gin.Context, vulns []models.Vulnerability) {
	// Create CSV records
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
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=hunter-report-%s.csv", time.Now().Format("20060102-150405")))
	c.String(http.StatusOK, csvData)
}

// exportHTML exports vulnerabilities as HTML
// printable: if true, generates print-friendly HTML for PDF conversion
func (s *ReportService) exportHTML(c *gin.Context, vulns []models.Vulnerability, printable bool) {
	summary := s.generateSummary(vulns)

	var styles string
	var filename string
	var contentType string

	if printable {
		// Print-friendly styles for PDF
		styles = `
        <style>
            @page { margin: 2cm; size: A4; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Microsoft YaHei', 'SimSun', Arial, sans-serif;
                font-size: 10pt;
                color: #333;
                line-height: 1.6;
            }
            .container { max-width: 100%; margin: 0 auto; }
            h1 { color: #1a1a1a; font-size: 20pt; margin-bottom: 8pt; page-break-after: avoid; }
            .subtitle { color: #666; font-size: 10pt; margin-bottom: 20pt; }
            .summary {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 15px;
                margin-bottom: 30px;
                page-break-inside: avoid;
            }
            .summary-card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
            }
            .summary-card h3 {
                color: #666;
                font-size: 9pt;
                margin-bottom: 5pt;
                font-weight: normal;
            }
            .summary-card .value { font-size: 24pt; font-weight: bold; }
            .critical { color: #dc2626; }
            .high { color: #f59e0b; }
            .medium { color: #0ea5e9; }
            .low { color: #64748b; }
            .info { color: #6b7280; }
            .vulnerabilities {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 20px;
            }
            .vulnerability {
                border-bottom: 1px solid #eee;
                padding: 15px 0;
                page-break-inside: avoid;
            }
            .vulnerability:last-child { border-bottom: none; }
            .vuln-header {
                display: flex;
                justify-content: space-between;
                align-items: start;
                margin-bottom: 8pt;
            }
            .vuln-title {
                font-size: 12pt;
                font-weight: 600;
                color: #1a1a1a;
                flex: 1;
            }
            .vuln-severity {
                padding: 2px 10px;
                border-radius: 4px;
                font-size: 8pt;
                font-weight: 600;
                text-transform: uppercase;
                margin-left: 10px;
            }
            .severity-critical { background: #fee; color: #dc2626; border: 1px solid #dc2626; }
            .severity-high { background: #fef3c7; color: #f59e0b; border: 1px solid #f59e0b; }
            .severity-medium { background: #e0f2fe; color: #0ea5e9; border: 1px solid #0ea5e9; }
            .severity-low { background: #f3f4f6; color: #64748b; border: 1px solid #64748b; }
            .severity-info { background: #f9fafb; color: #6b7280; border: 1px solid #6b7280; }
            .vuln-meta {
                display: flex;
                gap: 20px;
                margin-bottom: 8pt;
                font-size: 9pt;
                color: #666;
            }
            .vuln-description {
                color: #444;
                line-height: 1.6;
                font-size: 10pt;
                margin-bottom: 8pt;
            }
            .vuln-url {
                color: #2563eb;
                word-break: break-all;
                font-size: 9pt;
            }
            .footer {
                text-align: center;
                margin-top: 30pt;
                color: #999;
                font-size: 8pt;
                page-break-before: always;
            }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .vulnerability, .summary, .vulnerabilities { page-break-inside: avoid; }
            }
        </style>`
		filename = fmt.Sprintf("hunter-report-%s.pdf", time.Now().Format("20060102-150405"))
		contentType = "text/html; charset=utf-8"
	} else {
		// Dark theme for screen viewing
		styles = `
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
        </style>`
		filename = fmt.Sprintf("hunter-report-%s.html", time.Now().Format("20060102-150405"))
		contentType = "text/html; charset=utf-8"
	}

	// Generate HTML report
	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HoleHunter 安全扫描报告</title>
    %s
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
            %s
        </div>
    </div>
</body>
</html>`,
		styles,
		time.Now().Format("2006-01-02 15:04:05"),
		len(vulns),
		summary["critical"], summary["high"], summary["medium"], summary["low"], summary["info"],
		s.generateVulnerabilityHTML(vulns),
		func() string {
			if printable {
				return "<p>打印提示: 使用浏览器的打印功能，选择'另存为 PDF'即可获得 PDF 文件</p>"
			}
			return ""
		}(),
	)

	// Set headers and write response
	c.Header("Content-Type", contentType)
	if printable {
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	} else {
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	}
	c.Data(http.StatusOK, contentType, []byte(html))
}

// exportRTF exports vulnerabilities as RTF (Rich Text Format)
// RTF is natively supported by Microsoft Word
func (s *ReportService) exportRTF(c *gin.Context, vulns []models.Vulnerability) {
	summary := s.generateSummary(vulns)

	// RTF header
	rtf := "{\\rtf1\\ansi\\ansicpg936\\deff0\\deflang1033\\deflangfe2052"
	rtf += "{\\fonttbl{\\f0\\fnil\\fcharset134 SimSun;}}"
	rtf += "{\\colortbl ;\\red220\\green38\\blue38;\\red245\\green158\\blue11;\\red14\\green165\\blue233;\\red100\\green115\\blue139;}"

	// Document settings
	rtf += "\\viewkind4\\uc1\\pard\\f0\\fs24"

	// Title
	rtf += "\\fs36\\b HoleHunter 安全扫描报告\\b0\\fs24\\par"
	rtf += "\\par"
	rtf += fmt.Sprintf("\\i 生成时间: %s\\i0\\par", time.Now().Format("2006-01-02 15:04:05"))
	rtf += fmt.Sprintf("\\i 总计: %d 个漏洞\\i0\\par", len(vulns))
	rtf += "\\par\\par"

	// Summary
	rtf += "\\fs28\\b 漏洞统计\\b0\\fs24\\par"
	rtf += "\\par"
	rtf += fmt.Sprintf("\\cf1\\b 严重:\\b0\\cf0 %d\\par", summary["critical"])
	rtf += fmt.Sprintf("\\cf2\\b 高危:\\b0\\cf0 %d\\par", summary["high"])
	rtf += fmt.Sprintf("\\cf3\\b 中危:\\b0\\cf0 %d\\par", summary["medium"])
	rtf += fmt.Sprintf("\\cf4\\b 低危:\\b0\\cf0 %d\\par", summary["low"])
	rtf += fmt.Sprintf("\\b 信息:\\b0 %d\\par", summary["info"])
	rtf += "\\cf0"
	rtf += "\\par\\par"

	// Vulnerabilities list
	rtf += "\\fs28\\b 漏洞详情\\b0\\fs24\\par"
	rtf += "\\par"

	for i, vuln := range vulns {
		// Number
		rtf += fmt.Sprintf("%d. ", i+1)

		// Title with severity
		severityColor := ""
		switch vuln.Severity {
		case "critical":
			severityColor = "\\cf1"
		case "high":
			severityColor = "\\cf2"
		case "medium":
			severityColor = "\\cf3"
		case "low":
			severityColor = "\\cf4"
		}

		rtf += fmt.Sprintf("%s\\b [%s]\\b0\\cf0\\par %s\\par\\par",
			severityColor, strings.ToUpper(vuln.Severity), vuln.Name)

		// CVSS and Date
		if vuln.CVSS > 0 {
			rtf += fmt.Sprintf("\\b CVSS 评分:\\b0 %.1f\\par", vuln.CVSS)
		}
		rtf += fmt.Sprintf("\\b 发现时间:\\b0 %s\\par", vuln.CreatedAt.Format("2006-01-02 15:04"))
		rtf += "\\par"

		// URL
		rtf += fmt.Sprintf("\\b URL:\\b0\\par %s\\par\\par", vuln.URL)

		// Description
		if vuln.Description != "" {
			rtf += fmt.Sprintf("\\b 描述:\\b0\\par %s\\par\\par", vuln.Description)
		}

		// CVE
		if vuln.CVE != "" {
			rtf += fmt.Sprintf("\\b CVE:\\b0 %s\\par\\par", vuln.CVE)
		}

		rtf += "\\par"
	}

	// Footer
	rtf += "\\par"
	rtf += "\\i Generated by HoleHunter - 基于 Nuclei 引擎的现代化 Web 安全测试工具\\i0\\par"
	rtf += "}"

	// Set headers and write response
	c.Header("Content-Type", "application/rtf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=hunter-report-%s.rtf", time.Now().Format("20060102-150405")))
	c.Data(http.StatusOK, "application/rtf", []byte(rtf))
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
