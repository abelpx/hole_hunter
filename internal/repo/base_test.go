package repo

import (
	"database/sql"
	"fmt"
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

// CreateInMemoryDB 创建内存数据库（不依赖 testing.T，用于基准测试）
func CreateInMemoryDB() (*sql.DB, error) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		return nil, fmt.Errorf("failed to open test database: %w", err)
	}

	// 创建测试表结构
	if err := initSchemaDB(db); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to init schema: %w", err)
	}

	return db, nil
}

// initSchema 初始化测试数据库表结构
func initSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	if err := initSchemaDB(db); err != nil {
		t.Fatalf("failed to create test schema: %v", err)
	}
}

// initSchemaDB 初始化数据库表结构（不依赖 testing.T）
func initSchemaDB(db *sql.DB) error {
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

	CREATE TABLE templates (
		id              INTEGER PRIMARY KEY AUTOINCREMENT,
		source          TEXT NOT NULL,
		template_id     TEXT,
		name            TEXT NOT NULL,
		severity        TEXT,
		category        TEXT,
		author          TEXT,
		path            TEXT,
		content         TEXT,
		enabled         BOOLEAN DEFAULT 1,
		description     TEXT,
		impact          TEXT,
		remediation     TEXT,
		tags            TEXT,
		reference       TEXT,
		metadata        TEXT,
		nuclei_version  TEXT,
		official_path   TEXT,
		created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err := db.Exec(schema)
	return err
}
