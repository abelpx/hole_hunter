package svc

import (
	"context"
	"database/sql"
	"testing"

	"github.com/holehunter/holehunter/internal/repo"
	_ "github.com/mattn/go-sqlite3"
)

// TestBruteService_StartBruteTask 测试启动暴力破解任务
func TestBruteService_StartBruteTask(t *testing.T) {
	db := setupBruteTestDB(t)
	defer db.Close()

	bruteRepo := repo.NewBruteRepository(db)
	service := NewBruteService(bruteRepo)
	ctx := context.Background()

	// 测试无效 ID
	err := service.StartBruteTask(ctx, -1)
	if err == nil {
		t.Error("StartBruteTask(-1) should return error for invalid ID")
	}

	// 测试不存在的任务
	err = service.StartBruteTask(ctx, 999)
	if err == nil {
		t.Error("StartBruteTask(999) should return error for non-existent task")
	}
}

// TestBruteService_GetBruteTaskResults 测试获取暴力破解任务结果
func TestBruteService_GetBruteTaskResults(t *testing.T) {
	db := setupBruteTestDB(t)
	defer db.Close()

	bruteRepo := repo.NewBruteRepository(db)
	service := NewBruteService(bruteRepo)
	ctx := context.Background()

	// 测试无效 ID
	_, err := service.GetBruteTaskResults(ctx, -1)
	if err == nil {
		t.Error("GetBruteTaskResults(-1) should return error for invalid ID")
	}

	// 测试不存在的任务 - 当前实现返回空数组
	results, err := service.GetBruteTaskResults(ctx, 999)
	if err != nil {
		t.Errorf("GetBruteTaskResults(999) unexpected error: %v", err)
	}
	if results == nil {
		t.Error("GetBruteTaskResults should return empty array, not nil")
	}
}

// TestBruteService_CreateTask 测试创建任务
func TestBruteService_CreateTask(t *testing.T) {
	db := setupBruteTestDB(t)
	defer db.Close()

	bruteRepo := repo.NewBruteRepository(db)
	service := NewBruteService(bruteRepo)
	ctx := context.Background()

	tests := []struct {
		name      string
		taskName  string
		requestID int
		bruteType string
		wantErr   bool
	}{
		{"正常创建", "Test Brute", 1, "form", false},
		{"空名称", "", 1, "form", true},
		{"空类型", "Test", 1, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			id, err := service.CreateTask(ctx, tt.taskName, tt.requestID, tt.bruteType)
			if (err != nil) != tt.wantErr {
				t.Errorf("CreateTask() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && id == 0 {
				t.Error("CreateTask() should return non-zero ID on success")
			}
		})
	}
}

// TestBruteService_GetTaskByID 测试获取任务
func TestBruteService_GetTaskByID(t *testing.T) {
	db := setupBruteTestDB(t)
	defer db.Close()

	bruteRepo := repo.NewBruteRepository(db)
	service := NewBruteService(bruteRepo)
	ctx := context.Background()

	// 先创建一个任务
	taskID, _ := service.CreateTask(ctx, "Test Task", 1, "form")

	// 测试获取存在的任务
	task, err := service.GetTaskByID(ctx, taskID)
	if err != nil {
		t.Errorf("GetTaskByID(%d) failed: %v", taskID, err)
	}
	if task == nil {
		t.Error("GetTaskByID() should return non-nil task")
	}

	// 测试获取不存在的任务
	_, err = service.GetTaskByID(ctx, 999)
	if err == nil {
		t.Error("GetTaskByID(999) should return error for non-existent task")
	}
}

// setupBruteTestDB 创建测试数据库
func setupBruteTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	// 创建测试表结构
	schema := `
	CREATE TABLE brute_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		request_id INTEGER,
		type TEXT,
		status TEXT,
		total_payloads INTEGER DEFAULT 0,
		sent_payloads INTEGER DEFAULT 0,
		success_count INTEGER DEFAULT 0,
		failure_count INTEGER DEFAULT 0,
		started_at TEXT,
		completed_at TEXT,
		created_at TEXT,
		updated_at TEXT
	);

	CREATE TABLE brute_payload_sets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		config TEXT,
		created_at TEXT
	);

	CREATE TABLE brute_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		payload TEXT,
		result TEXT,
		success BOOLEAN DEFAULT 0,
		response_time INTEGER,
		error TEXT,
		timestamp TEXT,
		metadata TEXT
	);
	`

	if _, err := db.Exec(schema); err != nil {
		t.Fatalf("failed to create test schema: %v", err)
	}

	return db
}
