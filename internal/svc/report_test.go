package svc

import (
	"context"
	"database/sql"
	"testing"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
	_ "github.com/mattn/go-sqlite3"
)

// TestReportService_Create 测试创建报告
func TestReportService_Create(t *testing.T) {
	db := setupReportTestDB(t)
	defer db.Close()

	reportRepo := repo.NewReportRepository(db)
	scanRepo := repo.NewScanRepository(db, nil)
	vulnRepo := repo.NewVulnerabilityRepository(db)
	svc := NewReportService(reportRepo, scanRepo, vulnRepo, "/tmp")

	ctx := context.Background()

	// 创建一个完成的扫描
	scanID := createCompletedScan(t, db, 1)

	// 测试创建报告
	id, err := svc.Create(ctx, "Test Report", scanID, "summary", "json")
	if err != nil {
		t.Fatalf("Create() failed: %v", err)
	}
	if id == 0 {
		t.Error("Create() did not return valid ID")
	}

	// 验证报告已创建
	report, err := svc.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("GetByID() failed: %v", err)
	}
	if report.Name != "Test Report" {
		t.Errorf("Create() Name = %s, want Test Report", report.Name)
	}
}

// TestReportService_Create_InvalidInput 测试创建报告的无效输入
func TestReportService_Create_InvalidInput(t *testing.T) {
	db := setupReportTestDB(t)
	defer db.Close()

	reportRepo := repo.NewReportRepository(db)
	scanRepo := repo.NewScanRepository(db, nil)
	vulnRepo := repo.NewVulnerabilityRepository(db)
	svc := NewReportService(reportRepo, scanRepo, vulnRepo, "/tmp")

	ctx := context.Background()

	// 先创建一个完成的扫描
	scanID := createCompletedScan(t, db, 1)

	tests := []struct {
		name       string
		scanID     int
		reportName string
		wantErr    bool
	}{
		{"空名称", scanID, "", true},
		{"无效scanID", -1, "Test", true},
		{"scanID为0", 0, "Test", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.Create(ctx, tt.reportName, tt.scanID, "summary", "json")
			if (err != nil) != tt.wantErr {
				t.Errorf("Create() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// TestReportService_GetAll 测试获取所有报告
func TestReportService_GetAll(t *testing.T) {
	db := setupReportTestDB(t)
	defer db.Close()

	reportRepo := repo.NewReportRepository(db)
	scanRepo := repo.NewScanRepository(db, nil)
	vulnRepo := repo.NewVulnerabilityRepository(db)
	svc := NewReportService(reportRepo, scanRepo, vulnRepo, "/tmp")

	ctx := context.Background()

	// 创建扫描和报告
	scanID := createCompletedScan(t, db, 1)
	svc.Create(ctx, "Report 1", scanID, "summary", "json")
	svc.Create(ctx, "Report 2", scanID, "summary", "json")

	// 获取所有报告
	reports, err := svc.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() failed: %v", err)
	}
	if len(reports) != 2 {
		t.Errorf("GetAll() returned %d reports, want 2", len(reports))
	}
}

// TestReportService_Delete 测试删除报告
func TestReportService_Delete(t *testing.T) {
	db := setupReportTestDB(t)
	defer db.Close()

	reportRepo := repo.NewReportRepository(db)
	scanRepo := repo.NewScanRepository(db, nil)
	vulnRepo := repo.NewVulnerabilityRepository(db)
	svc := NewReportService(reportRepo, scanRepo, vulnRepo, "/tmp")

	ctx := context.Background()

	scanID := createCompletedScan(t, db, 1)
	id, _ := svc.Create(ctx, "Test Report", scanID, "summary", "json")

	// 删除报告
	err := svc.Delete(ctx, id)
	if err != nil {
		t.Fatalf("Delete() failed: %v", err)
	}

	// 验证已删除
	_, err = svc.GetByID(ctx, id)
	if err == nil {
		t.Error("Delete() report should not exist after deletion")
	}
}

// TestReportService_CalculateSummary 测试计算漏洞摘要
func TestReportService_CalculateSummary(t *testing.T) {
	db := setupReportTestDB(t)
	defer db.Close()

	reportRepo := repo.NewReportRepository(db)
	scanRepo := repo.NewScanRepository(db, nil)
	vulnRepo := repo.NewVulnerabilityRepository(db)
	svc := NewReportService(reportRepo, scanRepo, vulnRepo, "/tmp")

	// 准备测试数据
	vulns := []*models.Vulnerability{
		{Severity: "critical", FalsePositive: false},
		{Severity: "high", FalsePositive: false},
		{Severity: "high", FalsePositive: false},
		{Severity: "medium", FalsePositive: true}, // 误报
	}

	// 使用反射访问私有方法进行测试
	summary := svc.calculateSummary(vulns)

	if summary["total"] != 4 {
		t.Errorf("calculateSummary() total = %v, want 4", summary["total"])
	}
	if summary["false_positive"] != 1 {
		t.Errorf("calculateSummary() false_positive = %v, want 1", summary["false_positive"])
	}

	severityCounts := summary["severity_counts"].(map[string]int)
	if severityCounts["critical"] != 1 {
		t.Errorf("calculateSummary() critical count = %v, want 1", severityCounts["critical"])
	}
	if severityCounts["high"] != 2 {
		t.Errorf("calculateSummary() high count = %v, want 2", severityCounts["high"])
	}
}

// setupReportTestDB 创建测试数据库
func setupReportTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	// 创建测试表结构
	schema := `
	CREATE TABLE targets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		url TEXT NOT NULL,
		description TEXT,
		tags TEXT,
		created_at TEXT,
		updated_at TEXT
	);

	CREATE TABLE scan_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		target_id INTEGER NOT NULL,
		status TEXT NOT NULL,
		strategy TEXT,
		templates_used TEXT,
		started_at TEXT,
		completed_at TEXT,
		total_templates INTEGER,
		executed_templates INTEGER,
		progress INTEGER DEFAULT 0,
		current_template TEXT,
		error TEXT,
		created_at TEXT
	);

	CREATE TABLE vulnerabilities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		template_id TEXT NOT NULL,
		severity TEXT,
		name TEXT,
		description TEXT,
		url TEXT,
		matched_at TEXT,
		tags TEXT,
		reference TEXT,
		request_response TEXT,
		false_positive BOOLEAN DEFAULT 0,
		notes TEXT,
		cve TEXT,
		cvss REAL,
		created_at TEXT
	);

	CREATE TABLE reports (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		scan_id INTEGER,
		type TEXT,
		format TEXT,
		file_path TEXT,
		file_size INTEGER,
		status TEXT,
		config TEXT,
		created_at TEXT,
		generated_at TEXT
	);
	`

	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create test schema: %v", err)
	}

	return db
}

// createCompletedScan 创建一个已完成的扫描
func createCompletedScan(t *testing.T, db *sql.DB, _ int) int {
	t.Helper()

	// 先创建目标
	targetResult, err := db.Exec("INSERT INTO targets (name, url, created_at) VALUES (?, ?, datetime('now'))",
		"Test Target", "https://example.com")
	if err != nil {
		t.Fatalf("failed to create target: %v", err)
	}

	targetID, err := getLastInsertID(targetResult)
	if err != nil {
		t.Fatalf("failed to get target id: %v", err)
	}

	// 创建扫描任务 - 添加更多字段避免 NULL
	result, err := db.Exec(`
		INSERT INTO scan_tasks (target_id, name, status, strategy, started_at, completed_at, created_at)
		VALUES (?, ?, 'completed', 'deep', datetime('now'), datetime('now'), datetime('now'))
	`, targetID, "Test Scan")
	if err != nil {
		t.Fatalf("failed to create scan: %v", err)
	}

	id, _ := result.LastInsertId()
	return int(id)
}

// getLastInsertId 获取最后插入的 ID
func getLastInsertID(r sql.Result) (int, error) {
	id, err := r.LastInsertId()
	if err != nil {
		return 0, err
	}
	return int(id), nil
}
