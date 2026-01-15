package svc

import (
	"context"
	"database/sql"
	"testing"

	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
	"github.com/holehunter/holehunter/internal/scanner"
	_ "github.com/mattn/go-sqlite3"
)

// TestScanService_GetAll 测试获取所有扫描任务
func TestScanService_GetAll(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	scanRepo := repo.NewScanRepository(db)
	targetRepo := repo.NewTargetRepository(db)
	eventBus := event.NewBus()

	ctx := context.Background()

	// 创建测试目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create target failed: %v", err)
	}

	// 创建测试任务
	name := "test-scan"
	task := &models.ScanTask{
		Name:     &name,
		TargetID: target.ID,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := scanRepo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create task failed: %v", err)
	}

	service := &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    nil,
		eventBus:   eventBus,
	}

	tasks, err := service.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() failed: %v", err)
	}

	if len(tasks) != 1 {
		t.Errorf("GetAll() returned %d tasks, want 1", len(tasks))
	}
}

// TestScanService_GetByID 测试根据 ID 获取扫描任务
func TestScanService_GetByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	scanRepo := repo.NewScanRepository(db)
	targetRepo := repo.NewTargetRepository(db)
	eventBus := event.NewBus()

	ctx := context.Background()

	// 创建测试数据
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	name := "test-scan"
	task := &models.ScanTask{
		Name:     &name,
		TargetID: target.ID,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := scanRepo.Create(ctx, task); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	service := &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    nil,
		eventBus:   eventBus,
	}

	// 测试有效 ID
	fetched, err := service.GetByID(ctx, int(task.ID))
	if err != nil {
		t.Fatalf("GetByID(%d) failed: %v", task.ID, err)
	}
	if fetched.ID != task.ID {
		t.Errorf("GetByID(%d) returned ID %d, want %d", task.ID, fetched.ID, task.ID)
	}

	// 测试无效 ID
	_, err = service.GetByID(ctx, -1)
	if err == nil {
		t.Error("GetByID(-1) should return error for invalid ID")
	}

	// 测试不存在的 ID
	_, err = service.GetByID(ctx, 999)
	if err == nil {
		t.Error("GetByID(999) should return error for non-existent ID")
	}
}

// TestScanService_GetByTargetID 测试根据目标 ID 获取扫描任务
func TestScanService_GetByTargetID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	scanRepo := repo.NewScanRepository(db)
	targetRepo := repo.NewTargetRepository(db)
	eventBus := event.NewBus()

	ctx := context.Background()

	// 创建测试数据
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	for i := 0; i < 3; i++ {
		name := "test-scan"
		task := &models.ScanTask{
			Name:     &name,
			TargetID: target.ID,
			Status:   "pending",
			Strategy: "fast",
		}
		if err := scanRepo.Create(ctx, task); err != nil {
			t.Fatalf("setup failed: %v", err)
		}
	}

	service := &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    nil,
		eventBus:   eventBus,
	}

	tasks, err := service.GetByTargetID(ctx, int(target.ID))
	if err != nil {
		t.Fatalf("GetByTargetID() failed: %v", err)
	}

	if len(tasks) != 3 {
		t.Errorf("GetByTargetID() returned %d tasks, want 3", len(tasks))
	}

	// 测试无效 ID
	_, err = service.GetByTargetID(ctx, -1)
	if err == nil {
		t.Error("GetByTargetID(-1) should return error")
	}
}

// TestScanService_Create 测试创建扫描任务
func TestScanService_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	scanRepo := repo.NewScanRepository(db)
	targetRepo := repo.NewTargetRepository(db)
	eventBus := event.NewBus()

	ctx := context.Background()

	// 创建测试目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	service := &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    nil,
		eventBus:   eventBus,
	}

	tests := []struct {
		name    string
		req     *CreateScanRequest
		wantErr bool
	}{
		{
			name: "valid request",
			req: &CreateScanRequest{
				Name:     "Test Scan",
				TargetID: int(target.ID),
				Strategy: "fast",
			},
			wantErr: false,
		},
		{
			name: "empty name",
			req: &CreateScanRequest{
				Name:     "",
				TargetID: int(target.ID),
				Strategy: "fast",
			},
			wantErr: true,
		},
		{
			name: "invalid target id",
			req: &CreateScanRequest{
				Name:     "Test Scan",
				TargetID: 0,
				Strategy: "fast",
			},
			wantErr: true,
		},
		{
			name: "empty strategy",
			req: &CreateScanRequest{
				Name:     "Test Scan",
				TargetID: int(target.ID),
				Strategy: "",
			},
			wantErr: true,
		},
		{
			name: "non-existent target",
			req: &CreateScanRequest{
				Name:     "Test Scan",
				TargetID: 999,
				Strategy: "fast",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			task, err := service.Create(ctx, tt.req)

			if tt.wantErr {
				if err == nil {
					t.Error("Create() should return error")
				}
				return
			}

			if err != nil {
				t.Fatalf("Create() failed: %v", err)
			}

			if task.ID == 0 {
				t.Error("Create() did not set task ID")
			}
			if task.Status != "pending" {
				t.Errorf("Create() status = %s, want pending", task.Status)
			}
		})
	}
}

// TestScanService_Delete 测试删除扫描任务
func TestScanService_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	scanRepo := repo.NewScanRepository(db)
	targetRepo := repo.NewTargetRepository(db)
	eventBus := event.NewBus()

	ctx := context.Background()

	// 创建测试数据
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	name := "test-scan"
	task := &models.ScanTask{
		Name:     &name,
		TargetID: target.ID,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := scanRepo.Create(ctx, task); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	service := &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    nil,
		eventBus:   eventBus,
	}

	// 测试删除有效任务
	err := service.Delete(ctx, int(task.ID))
	if err != nil {
		t.Fatalf("Delete() failed: %v", err)
	}

	// 验证删除
	_, err = service.GetByID(ctx, int(task.ID))
	if err == nil {
		t.Error("task should not exist after deletion")
	}

	// 测试删除不存在的任务
	err = service.Delete(ctx, 999)
	if err == nil {
		t.Error("Delete() should return error for non-existent task")
	}

	// 测试无效 ID
	err = service.Delete(ctx, -1)
	if err == nil {
		t.Error("Delete() should return error for invalid ID")
	}
}

// TestScanService_GetStats 测试获取扫描统计
func TestScanService_GetStats(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	scanRepo := repo.NewScanRepository(db)
	targetRepo := repo.NewTargetRepository(db)
	eventBus := event.NewBus()

	ctx := context.Background()

	// 创建测试数据
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	// 创建不同状态的任务
	statuses := []string{"pending", "running", "completed", "failed", "stopped"}
	for _, status := range statuses {
		name := "test-scan"
		task := &models.ScanTask{
			Name:     &name,
			TargetID: target.ID,
			Status:   status,
			Strategy: "fast",
		}
		if err := scanRepo.Create(ctx, task); err != nil {
			t.Fatalf("setup failed: %v", err)
		}
	}

	service := &ScanService{
		scanRepo:   scanRepo,
		targetRepo: targetRepo,
		scanner:    nil,
		eventBus:   eventBus,
	}

	stats, err := service.GetStats(ctx)
	if err != nil {
		t.Fatalf("GetStats() failed: %v", err)
	}

	if stats.Total != 5 {
		t.Errorf("GetStats() Total = %d, want 5", stats.Total)
	}
	if stats.Pending != 1 {
		t.Errorf("GetStats() Pending = %d, want 1", stats.Pending)
	}
	if stats.Running != 1 {
		t.Errorf("GetStats() Running = %d, want 1", stats.Running)
	}
	if stats.Completed != 1 {
		t.Errorf("GetStats() Completed = %d, want 1", stats.Completed)
	}
	if stats.Failed != 1 {
		t.Errorf("GetStats() Failed = %d, want 1", stats.Failed)
	}
	if stats.Stopped != 1 {
		t.Errorf("GetStats() Stopped = %d, want 1", stats.Stopped)
	}
}

// TestScanService_GetNucleiStatus 测试获取 Nuclei 状态
func TestScanService_GetNucleiStatus(t *testing.T) {
	tmpDir := t.TempDir()
	nucleiClient := scanner.NewNucleiClient(tmpDir)
	eventBus := event.NewBus()

	orchestrator := scanner.NewOrchestrator(nucleiClient, eventBus, nil, 5, nil)

	service := &ScanService{
		scanner:  orchestrator,
		eventBus: eventBus,
	}

	status := service.GetNucleiStatus()

	if status == nil {
		t.Error("GetNucleiStatus() should never return nil")
	}
	if status.Path != nucleiClient.GetBinary() {
		t.Errorf("GetNucleiStatus() Path = %s, want %s", status.Path, nucleiClient.GetBinary())
	}
}

// TestSumValues 测试 sumValues 辅助函数
func TestSumValues(t *testing.T) {
	tests := []struct {
		name string
		m    map[string]int
		want int
	}{
		{
			name: "empty map",
			m:    map[string]int{},
			want: 0,
		},
		{
			name: "single value",
			m:    map[string]int{"a": 5},
			want: 5,
		},
		{
			name: "multiple values",
			m:    map[string]int{"a": 1, "b": 2, "c": 3},
			want: 6,
		},
		{
			name: "with zeros",
			m:    map[string]int{"a": 0, "b": 5},
			want: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sumValues(tt.m)
			if got != tt.want {
				t.Errorf("sumValues() = %d, want %d", got, tt.want)
			}
		})
	}
}

// setupTestDB 创建测试数据库
func setupTestDB(t *testing.T) *sql.DB {
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
	`

	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create test schema: %v", err)
	}

	return db
}
