package svc

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// ReportService 报告服务
type ReportService struct {
	reportRepo *repo.ReportRepository
	scanRepo   *repo.ScanRepository
	vulnRepo   *repo.VulnerabilityRepository
	outputDir  string
}

// NewReportService 创建报告服务
func NewReportService(
	reportRepo *repo.ReportRepository,
	scanRepo *repo.ScanRepository,
	vulnRepo *repo.VulnerabilityRepository,
	outputDir string,
) *ReportService {
	return &ReportService{
		reportRepo: reportRepo,
		scanRepo:   scanRepo,
		vulnRepo:   vulnRepo,
		outputDir:  outputDir,
	}
}

// GetAll 获取所有报告
func (s *ReportService) GetAll(ctx context.Context) ([]*models.Report, error) {
	return s.reportRepo.GetAll(ctx)
}

// GetByID 根据 ID 获取报告
func (s *ReportService) GetByID(ctx context.Context, id int) (*models.Report, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid report id")
	}
	return s.reportRepo.GetByID(ctx, id)
}

// GetByScanID 根据扫描 ID 获取报告
func (s *ReportService) GetByScanID(ctx context.Context, scanID int) ([]*models.Report, error) {
	if scanID <= 0 {
		return nil, errors.InvalidInput("invalid scan id")
	}
	return s.reportRepo.GetByScanID(ctx, scanID)
}

// Create 创建报告记录
func (s *ReportService) Create(ctx context.Context, name string, scanID int, reportType, format string) (int, error) {
	if name == "" {
		return 0, errors.InvalidInput("name is required")
	}
	if scanID <= 0 {
		return 0, errors.InvalidInput("scan id is required")
	}

	// 验证扫描是否存在
	scan, err := s.scanRepo.GetByID(ctx, scanID)
	if err != nil {
		return 0, errors.NotFound("scan not found")
	}

	if scan.Status != "completed" {
		return 0, errors.InvalidInput("scan must be completed before generating report")
	}

	report := &models.Report{
		Name:   name,
		ScanID: scanID,
		Type:   reportType,
		Format: format,
		Status: "pending",
		Config: make(map[string]interface{}),
	}

	if err := s.reportRepo.Create(ctx, report); err != nil {
		return 0, err
	}

	return report.ID, nil
}

// Generate 生成报告文件
func (s *ReportService) Generate(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.InvalidInput("invalid report id")
	}

	report, err := s.reportRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// 获取扫描和漏洞数据
	scan, err := s.scanRepo.GetByID(ctx, report.ScanID)
	if err != nil {
		return err
	}

	vulns, err := s.vulnRepo.GetByTaskID(ctx, report.ScanID)
	if err != nil {
		return err
	}

	// 准备报告数据
	reportData := map[string]interface{}{
		"scan":    scan,
		"vulns":   vulns,
		"report":  report,
		"summary": s.calculateSummary(vulns),
	}

	// 生成文件
	var content []byte
	var filePath string

	switch models.ReportExportFormat(report.Format) {
	case models.ReportFormatJSON:
		content, err = s.generateJSON(reportData)
		filePath = filepath.Join(s.outputDir, fmt.Sprintf("report_%d.json", id))
	case models.ReportFormatHTML:
		content, err = s.generateHTML(reportData)
		filePath = filepath.Join(s.outputDir, fmt.Sprintf("report_%d.html", id))
	case models.ReportFormatPDF:
		content, err = s.generatePDF(reportData)
		filePath = filepath.Join(s.outputDir, fmt.Sprintf("report_%d.pdf", id))
	case models.ReportFormatXLSX:
		content, err = s.generateXLSX(reportData)
		filePath = filepath.Join(s.outputDir, fmt.Sprintf("report_%d.xlsx", id))
	default:
		return errors.InvalidInput("unsupported report format")
	}

	if err != nil {
		return err
	}

	// 写入文件
	if err := os.WriteFile(filePath, content, 0644); err != nil {
		return errors.Internal("failed to write report file", err)
	}

	// 更新报告状态
	report.FilePath = filePath
	report.FileSize = int64(len(content))
	report.Status = "completed"

	return s.reportRepo.Update(ctx, report)
}

// Export 导出报告（兼容前端接口）
func (s *ReportService) Export(ctx context.Context, id int, format string) (string, error) {
	if id <= 0 {
		return "", errors.InvalidInput("invalid report id")
	}

	report, err := s.reportRepo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	// 如果格式不同，重新生成
	if report.Format != format {
		report.Format = format
		report.Status = "pending"
		if err := s.reportRepo.Update(ctx, report); err != nil {
			return "", err
		}
		if err := s.Generate(ctx, id); err != nil {
			return "", err
		}
		// 重新获取更新后的报告
		report, err = s.reportRepo.GetByID(ctx, id)
		if err != nil {
			return "", err
		}
	}

	return report.FilePath, nil
}

// Delete 删除报告
func (s *ReportService) Delete(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.InvalidInput("invalid report id")
	}

	// 删除文件
	report, err := s.reportRepo.GetByID(ctx, id)
	if err == nil && report.FilePath != "" {
		os.Remove(report.FilePath)
	}

	return s.reportRepo.Delete(ctx, id)
}

// calculateSummary 计算漏洞摘要
func (s *ReportService) calculateSummary(vulns []*models.Vulnerability) map[string]interface{} {
	severityCount := make(map[string]int)
	falsePositiveCount := 0

	for _, vuln := range vulns {
		if vuln.FalsePositive {
			falsePositiveCount++
		} else {
			severityCount[vuln.Severity]++
		}
	}

	return map[string]interface{}{
		"total":           len(vulns),
		"false_positive":  falsePositiveCount,
		"severity_counts": severityCount,
	}
}

// generateJSON 生成 JSON 格式报告
func (s *ReportService) generateJSON(data map[string]interface{}) ([]byte, error) {
	return json.MarshalIndent(data, "", "  ")
}

// generateHTML 生成 HTML 格式报告
func (s *ReportService) generateHTML(data map[string]interface{}) ([]byte, error) {
	html := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>扫描报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .vuln { margin: 10px 0; padding: 10px; border-left: 3px solid #ccc; }
        .critical { border-color: #d32f2f; }
        .high { border-color: #f57c00; }
        .medium { border-color: #fbc02d; }
        .low { border-color: #388e3c; }
    </style>
</head>
<body>
    <h1>扫描报告</h1>
    <div class="summary">
        <h2>摘要</h2>
        <p>总漏洞数: ` + fmt.Sprintf("%d", len(data["vulns"].([]*models.Vulnerability))) + `</p>
    </div>
    <div class="vulnerabilities">
        <h2>漏洞列表</h2>
        <!-- 漏洞详情 -->
    </div>
</body>
</html>`
	return []byte(html), nil
}

// generatePDF 生成 PDF 格式报告
func (s *ReportService) generatePDF(data map[string]interface{}) ([]byte, error) {
	// TODO: 实现真正的 PDF 生成
	// 当前返回 JSON 作为占位
	return s.generateJSON(data)
}

// generateXLSX 生成 Excel 格式报告
func (s *ReportService) generateXLSX(data map[string]interface{}) ([]byte, error) {
	// TODO: 实现真正的 XLSX 生成
	// 当前返回 JSON 作为占位
	return s.generateJSON(data)
}
