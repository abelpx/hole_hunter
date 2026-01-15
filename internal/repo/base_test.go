package repo

import (
	"database/sql"
	"testing"

	_ "github.com/mattn/go-sqlite3"
)

// SetupTestDB 创建测试用的内存数据库（导出供其他包使用）
func SetupTestDB(t *testing.T) *sql.DB {
	t.Helper()
	return setupTestDB(t)
}

// setupTestDB 创建测试用的内存数据库
func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	// 创建测试表结构
	initSchema(t, db)

	return db
}

// initSchema 初始化测试数据库表结构
func initSchema(t *testing.T, db *sql.DB) {
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

	_, err := db.Exec(schema)
	if err != nil {
		t.Fatalf("failed to create test schema: %v", err)
	}
}
