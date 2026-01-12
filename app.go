package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	stdruntime "runtime"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/holehunter/holehunter/internal/offline"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx               context.Context
	db                *sql.DB
	dbMutex           sync.RWMutex
	dbPath            string
	userDataDir       string
	nucleiBinary      string
	nucleiEmbedded    bool
	nucleiVersion     string
	offlineScanner    *offline.OfflineScanner
	runningScans      map[int]*exec.Cmd
	runningScansMu    sync.Mutex
	scanProgress      map[int]ScanProgress
	scanProgressMu    sync.RWMutex
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

// NucleiOutput represents the JSON output from Nuclei scanner
type NucleiOutput struct {
	TemplateID   string                 `json:"template-id"`
	TemplatePath string                 `json:"template-path"`
	Info         map[string]interface{} `json:"info"`
	Severity     string                 `json:"severity"`
	Name         string                 `json:"name"`
	MatcherName  string                 `json:"matcher-name,omitempty"`
	Type         string                 `json:"type,omitempty"`
	Host         string                 `json:"host,omitempty"`
	Port         string                 `json:"port,omitempty"`
	Scheme       string                 `json:"scheme,omitempty"`
	URL          string                 `json:"url,omitempty"`
	MatchedAt    string                 `json:"matched-at,omitempty"`
	Extraction   []string               `json:"extraction,omitempty"`
	Request      string                 `json:"request,omitempty"`
	Response     string                 `json:"response,omitempty"`
	CURLCommand  string                 `json:"curl-command,omitempty"`
	Timestamp    time.Time              `json:"timestamp"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		runningScans: make(map[int]*exec.Cmd),
		scanProgress: make(map[int]ScanProgress),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 获取用户数据目录
	userDataDir := "."
	if homeDir, err := os.UserHomeDir(); err == nil {
		// 使用用户主目录下的 .holehunter 文件夹
		userDataDir = filepath.Join(homeDir, ".holehunter")
	}

	// 确保目录存在
	if err := os.MkdirAll(userDataDir, 0755); err != nil {
		println("Failed to create user data directory:", err.Error())
		println("Falling back to current directory")
		userDataDir = "."
	}

	a.userDataDir = userDataDir

	// 设置数据库路径
	a.dbPath = filepath.Join(userDataDir, "holehunter.db")

	// Initialize database
	if err := a.initDatabase(); err != nil {
		println("Failed to initialize database:", err.Error())
	} else {
		println("Database initialized at:", a.dbPath)
	}

	// 尝试从旧位置迁移数据
	a.migrateOldData(userDataDir)

	// 初始化 Nuclei
	a.initNuclei()
}

// initNuclei 初始化 nuclei 二进制文件（使用离线扫描器）
func (a *App) initNuclei() {
	// 初始化离线扫描器
	a.offlineScanner = offline.NewOfflineScanner(a.userDataDir)

	// 尝试设置离线扫描环境
	if err := a.offlineScanner.Setup(); err != nil {
		println("Warning: Failed to setup offline scanner:", err.Error())
		println("Falling back to system nuclei...")

		// 回退到系统 nuclei
		a.nucleiBinary = a.findNucleiBinary()
		if a.nucleiBinary != "" {
			a.nucleiEmbedded = false
			a.nucleiVersion = "system"
			println("Using system nuclei at:", a.nucleiBinary)
			return
		}

		println("Error: Nuclei binary not found. Scanning will be disabled.")
		println("Platform:", stdruntime.GOOS+"_"+stdruntime.GOARCH)
		return
	}

	// 使用离线扫描器提供的 nuclei
	a.nucleiBinary = a.offlineScanner.GetNucleiBinary()
	a.nucleiEmbedded = true
	a.nucleiVersion = "v3.6.2"

	println("Nuclei setup complete:")
	println("  Binary:", a.nucleiBinary)
	println("  Templates:", a.offlineScanner.GetTemplatesDir())
	println("  Config:", a.offlineScanner.GetConfigPath())
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Close database connection
	if a.db != nil {
		a.db.Close()
		println("Database connection closed")
	}
}

// LogFromFrontend receives log messages from frontend
func (a *App) LogFromFrontend(level string, message string) {
	prefix := ""
	switch level {
	case "error":
		prefix = "[ERROR]"
	case "warn":
		prefix = "[WARN]"
	case "info":
		prefix = "[INFO]"
	case "debug":
		prefix = "[DEBUG]"
	default:
		prefix = "[LOG]"
	}
	println(prefix + " " + message)
}

// migrateOldData 尝试从旧位置迁移数据
func (a *App) migrateOldData(newDataDir string) {
	// 检查新数据库是否已有数据
	var count int
	a.db.QueryRow("SELECT COUNT(*) FROM targets").Scan(&count)
	if count > 0 {
		// 新数据库已有数据，不需要迁移
		return
	}

	// 尝试从项目根目录迁移
	possibleOldPaths := []string{
		"holehunter.db",
		filepath.Join(newDataDir, "..", "holehunter.db"),
	}

	for _, oldPath := range possibleOldPaths {
		if _, err := os.Stat(oldPath); err == nil {
			// 找到旧数据库，尝试迁移
			println("Found old database at:", oldPath)
			println("Attempting migration to:", a.dbPath)

			// 打开旧数据库
			oldDB, err := sql.Open("sqlite3", oldPath)
			if err != nil {
				println("Failed to open old database:", err.Error())
				continue
			}

			// 读取旧数据库数据并导入
			a.migrateDatabase(oldDB, a.db)

			oldDB.Close()
			println("Migration completed")
			return
		}
	}
}

// migrateDatabase 从旧数据库迁移数据到新数据库
func (a *App) migrateDatabase(oldDB, newDB *sql.DB) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	// 迁移 targets
	if rows, err := oldDB.Query("SELECT id, name, url, description, tags, created_at, updated_at FROM targets"); err == nil {
		defer rows.Close()
		for rows.Next() {
			var id int
			var name, url, description, tags, createdAt, updatedAt string
			if rows.Scan(&id, &name, &url, &description, &tags, &createdAt, &updatedAt) == nil {
				newDB.Exec("INSERT OR REPLACE INTO targets (id, name, url, description, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
					id, name, url, description, tags, createdAt, updatedAt)
			}
		}
	}

	// 迁移 scan_tasks
	if rows, err := oldDB.Query("SELECT id, target_id, status, strategy, templates_used, started_at, completed_at, total_templates, executed_templates, progress, current_template, error, created_at FROM scan_tasks"); err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, targetID int
			var status, strategy, templatesUsed, startedAt, completedAt, createdAt string
			var totalTemplates, executedTemplates, progress sql.NullInt64
			var currentTemplate, errorStr *string
			if rows.Scan(&id, &targetID, &status, &strategy, &templatesUsed, &startedAt, &completedAt, &totalTemplates, &executedTemplates, &progress, &currentTemplate, &errorStr, &createdAt) == nil {
				// 处理可能为 NULL 的整数字段
				totalVal := 0
				executedVal := 0
				progressVal := 0
				if totalTemplates.Valid {
					totalVal = int(totalTemplates.Int64)
				}
				if executedTemplates.Valid {
					executedVal = int(executedTemplates.Int64)
				}
				if progress.Valid {
					progressVal = int(progress.Int64)
				}
				// 将指针转换为字符串，NULL 转换为空字符串
				currentVal := ""
				errorVal := ""
				if currentTemplate != nil {
					currentVal = *currentTemplate
				}
				if errorStr != nil {
					errorVal = *errorStr
				}
				newDB.Exec("INSERT OR REPLACE INTO scan_tasks (id, target_id, status, strategy, templates_used, started_at, completed_at, total_templates, executed_templates, progress, current_template, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					id, targetID, status, strategy, templatesUsed, startedAt, completedAt, totalVal, executedVal, progressVal, currentVal, errorVal, createdAt)
			}
		}
	}

	// 迁移 vulnerabilities
	if rows, err := oldDB.Query("SELECT id, task_id, template_id, severity, name, description, url, matched_at, false_positive, notes, cve, cvss, created_at FROM vulnerabilities"); err == nil {
		defer rows.Close()
		for rows.Next() {
			var id, taskID int
			var templateID, severity, name, description, url, matchedAt, notes, cve, createdAt string
			var falsePositive bool
			var cvss float64
			if rows.Scan(&id, &taskID, &templateID, &severity, &name, &description, &url, &matchedAt, &falsePositive, &notes, &cve, &cvss, &createdAt) == nil {
				newDB.Exec("INSERT OR REPLACE INTO vulnerabilities (id, task_id, template_id, severity, name, description, url, matched_at, request_response, false_positive, notes, cve, cvss, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					id, taskID, templateID, severity, name, description, url, matchedAt, "", falsePositive, notes, cve, cvss, createdAt)
			}
		}
	}
}

// initDatabase initializes the SQLite database with all required tables
func (a *App) initDatabase() error {
	var err error
	a.db, err = sql.Open("sqlite3", a.dbPath+"?_journal_mode=WAL")
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Test connection
	if err := a.db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	// Create schema
	schema := `
	CREATE TABLE IF NOT EXISTS targets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		url TEXT NOT NULL UNIQUE,
		description TEXT,
		tags TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS scan_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT,
		target_id INTEGER REFERENCES targets(id),
		status TEXT DEFAULT 'pending',
		strategy TEXT,
		templates_used TEXT,
		started_at DATETIME,
		completed_at DATETIME,
		total_templates INTEGER,
		executed_templates INTEGER,
		progress INTEGER DEFAULT 0,
		current_template TEXT,
		error TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS vulnerabilities (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER REFERENCES scan_tasks(id),
		template_id TEXT,
		severity TEXT,
		name TEXT,
		description TEXT,
		url TEXT,
		matched_at TEXT,
		request_response TEXT,
		false_positive BOOLEAN DEFAULT 0,
		notes TEXT,
		cve TEXT,
		cvss REAL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS configurations (
		key TEXT PRIMARY KEY,
		value TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS custom_templates (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		path TEXT NOT NULL,
		content TEXT,
		enabled BOOLEAN DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS http_requests (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		method TEXT NOT NULL,
		url TEXT NOT NULL,
		headers TEXT,
		body TEXT,
		content_type TEXT,
		tags TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS http_responses (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		request_id INTEGER REFERENCES http_requests(id),
		status_code INTEGER,
		status_text TEXT,
		headers TEXT,
		body TEXT,
		body_size INTEGER,
		header_size INTEGER,
		duration INTEGER,
		timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS brute_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		request_id INTEGER REFERENCES http_requests(id),
		type TEXT NOT NULL,
		status TEXT DEFAULT 'pending',
		total_payloads INTEGER DEFAULT 0,
		sent_payloads INTEGER DEFAULT 0,
		success_count INTEGER DEFAULT 0,
		failure_count INTEGER DEFAULT 0,
		started_at DATETIME,
		completed_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS brute_payload_sets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		config TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS brute_payloads (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		set_id INTEGER REFERENCES brute_payload_sets(id),
		task_id INTEGER REFERENCES brute_tasks(id),
		param_id INTEGER,
		type TEXT NOT NULL,
		source TEXT,
		config TEXT,
		value TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS brute_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER REFERENCES brute_tasks(id),
		request_id INTEGER REFERENCES http_requests(id),
		payload TEXT,
		status_code INTEGER,
		body_length INTEGER,
		response TEXT,
		success BOOLEAN DEFAULT 0,
		notes TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS port_scan_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		target TEXT NOT NULL,
		ports TEXT NOT NULL,
		timeout INTEGER DEFAULT 2000,
		batch_size INTEGER DEFAULT 50,
		status TEXT NOT NULL DEFAULT 'pending',
		started_at DATETIME,
		completed_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS port_scan_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER REFERENCES port_scan_tasks(id),
		port INTEGER NOT NULL,
		status TEXT NOT NULL,
		service TEXT,
		banner TEXT,
		latency INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS domain_brute_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		domain TEXT NOT NULL,
		wordlist TEXT,
		timeout INTEGER DEFAULT 2000,
		batch_size INTEGER DEFAULT 50,
		status TEXT NOT NULL DEFAULT 'pending',
		started_at DATETIME,
		completed_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS domain_brute_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER REFERENCES domain_brute_tasks(id),
		subdomain TEXT NOT NULL,
		resolved BOOLEAN DEFAULT 0,
		ips TEXT,
		latency INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS dns_records (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		domain TEXT NOT NULL,
		type TEXT NOT NULL,
		records TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS scan_reports (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		scan_id INTEGER REFERENCES scan_tasks(id),
		target_name TEXT,
		target_url TEXT,
		status TEXT DEFAULT 'pending',
		format TEXT NOT NULL,
		file_path TEXT,
		vulnerabilities_count INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	if _, err := a.db.Exec(schema); err != nil {
		return fmt.Errorf("failed to create schema: %w", err)
	}

	// 运行数据库迁移
	if err := a.runMigrations(); err != nil {
		println("Migration warning:", err.Error())
	}

	return nil
}

// runMigrations 执行数据库结构迁移
func (a *App) runMigrations() error {
	// 检查 scan_tasks 表是否有 name 字段，如果没有则添加
	var columnName string
	err := a.db.QueryRow("SELECT name FROM pragma_table_info('scan_tasks') WHERE name = 'name'").Scan(&columnName)
	if err == sql.ErrNoRows {
		// name 字段不存在，添加它
		println("Adding 'name' column to scan_tasks table...")
		if _, err := a.db.Exec("ALTER TABLE scan_tasks ADD COLUMN name TEXT"); err != nil {
			return fmt.Errorf("failed to add name column: %w", err)
		}
		println("Successfully added 'name' column to scan_tasks")
	}

	return nil
}

// ============ Target Management ============

// Target represents a scan target
type Target struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	URL         string   `json:"url"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
}

// GetAllTargets returns all targets from the database
func (a *App) GetAllTargets() ([]Target, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, name, url, description, tags, created_at, updated_at
		FROM targets
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var targets []Target
	for rows.Next() {
		var t Target
		var tagsJSON string
		if err := rows.Scan(&t.ID, &t.Name, &t.URL, &t.Description, &tagsJSON, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}

		// Parse tags JSON
		if tagsJSON != "" && tagsJSON != "[]" {
			json.Unmarshal([]byte(tagsJSON), &t.Tags)
		}

		targets = append(targets, t)
	}

	return targets, nil
}

// GetTargetByID returns a single target by ID
func (a *App) GetTargetByID(id int) (Target, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	var t Target
	var tagsJSON string

	err := a.db.QueryRow(`
		SELECT id, name, url, description, tags, created_at, updated_at
		FROM targets
		WHERE id = ?
	`, id).Scan(&t.ID, &t.Name, &t.URL, &t.Description, &tagsJSON, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		return Target{}, err
	}

	// Parse tags JSON
	if tagsJSON != "" && tagsJSON != "[]" {
		json.Unmarshal([]byte(tagsJSON), &t.Tags)
	}

	return t, nil
}

// CreateTarget creates a new target
func (a *App) CreateTarget(name, url, description string, tags []string) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	tagsJSON, _ := json.Marshal(tags)
	result, err := a.db.Exec(
		"INSERT INTO targets (name, url, description, tags) VALUES (?, ?, ?, ?)",
		name, url, description, string(tagsJSON),
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// UpdateTarget updates an existing target
func (a *App) UpdateTarget(id int, name, url, description string, tags []string) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	tagsJSON, _ := json.Marshal(tags)
	_, err := a.db.Exec(
		"UPDATE targets SET name = ?, url = ?, description = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		name, url, description, string(tagsJSON), id,
	)

	return err
}

// DeleteTarget deletes a target by ID
func (a *App) DeleteTarget(id int) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec("DELETE FROM targets WHERE id = ?", id)
	return err
}

// ============ Health Check ============

// HealthCheck returns the application health status
func (a *App) HealthCheck() map[string]interface{} {
	status := map[string]interface{}{
		"status":  "ok",
		"app":     "HoleHunter",
		"version": "2.0.0",
	}

	// Check database
	if a.db != nil {
		if err := a.db.Ping(); err != nil {
			status["database"] = "error: " + err.Error()
			status["status"] = "error"
		} else {
			status["database"] = "connected"
		}
	} else {
		status["database"] = "not initialized"
		status["status"] = "error"
	}

	return status
}

// ============ Scan Task Management ============

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

// GetAllScanTasks returns all scan tasks
func (a *App) GetAllScanTasks() ([]ScanTask, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, name, target_id, status, strategy, templates_used, started_at, completed_at,
		       total_templates, executed_templates, progress, current_template, error, created_at
		FROM scan_tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []ScanTask
	for rows.Next() {
		var t ScanTask
		var templatesStr string
		if err := rows.Scan(
			&t.ID, &t.Name, &t.TargetID, &t.Status, &t.Strategy, &templatesStr,
			&t.StartedAt, &t.CompletedAt, &t.TotalTemplates,
			&t.ExecutedTemplates, &t.Progress, &t.CurrentTemplate,
			&t.Error, &t.CreatedAt,
		); err != nil {
			return nil, err
		}

		// Parse templates JSON
		if templatesStr != "" && templatesStr != "[]" {
			json.Unmarshal([]byte(templatesStr), &t.TemplatesUsed)
		}

		tasks = append(tasks, t)
	}

	return tasks, nil
}

// GetScanTaskByID returns a single scan task by ID
func (a *App) GetScanTaskByID(id int) (ScanTask, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	var t ScanTask
	var templatesStr string

	err := a.db.QueryRow(`
		SELECT id, name, target_id, status, strategy, templates_used, started_at, completed_at,
		       total_templates, executed_templates, progress, current_template, error, created_at
		FROM scan_tasks
		WHERE id = ?
	`, id).Scan(
		&t.ID, &t.Name, &t.TargetID, &t.Status, &t.Strategy, &templatesStr,
		&t.StartedAt, &t.CompletedAt, &t.TotalTemplates,
		&t.ExecutedTemplates, &t.Progress, &t.CurrentTemplate,
		&t.Error, &t.CreatedAt,
	)

	if err != nil {
		return ScanTask{}, err
	}

	// Parse templates JSON
	if templatesStr != "" && templatesStr != "[]" {
		json.Unmarshal([]byte(templatesStr), &t.TemplatesUsed)
	}

	return t, nil
}

// CreateScanTask creates a new scan task
func (a *App) CreateScanTask(name string, targetID int, strategy string, templates []string) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	templatesJSON, _ := json.Marshal(templates)
	result, err := a.db.Exec(
		"INSERT INTO scan_tasks (name, target_id, status, strategy, templates_used) VALUES (?, ?, ?, ?, ?)",
		name, targetID, "pending", strategy, string(templatesJSON),
	)

	if err != nil {
		return 0, err
	}

	id, _ := result.LastInsertId()

	// 异步启动扫描
	go func() {
		// 等待一小段时间确保数据库事务完成
		time.Sleep(100 * time.Millisecond)
		if err := a.StartScan(int(id)); err != nil {
			println("Failed to start scan:", err.Error())
		}
	}()

	return id, nil
}

// UpdateScanTaskStatus updates the status of a scan task
func (a *App) UpdateScanTaskStatus(id int, status string) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	var updateSQL string
	if status == "running" {
		updateSQL = "UPDATE scan_tasks SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?"
	} else if status == "completed" || status == "failed" || status == "cancelled" {
		updateSQL = "UPDATE scan_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?"
	} else {
		updateSQL = "UPDATE scan_tasks SET status = ? WHERE id = ?"
	}

	_, err := a.db.Exec(updateSQL, status, id)
	return err
}

// UpdateScanTaskProgress updates the progress of a scan task
func (a *App) UpdateScanTaskProgress(id int, progress, total, executed int) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec(
		"UPDATE scan_tasks SET progress = ?, total_templates = ?, executed_templates = ? WHERE id = ?",
		progress, total, executed, id,
	)
	return err
}

// DeleteScanTask deletes a scan task by ID
func (a *App) DeleteScanTask(id int) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec("DELETE FROM scan_tasks WHERE id = ?", id)
	return err
}

// ============ Vulnerability Management ============

// Vulnerability represents a found vulnerability
type Vulnerability struct {
	ID             int     `json:"id"`
	TaskID         int     `json:"task_id"`
	TemplateID     string  `json:"template_id"`
	Severity       string  `json:"severity"`
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	URL            string  `json:"url"`
	MatchedAt      string  `json:"matched_at"`
	FalsePositive  bool    `json:"false_positive"`
	Notes          string  `json:"notes"`
	CVE            string  `json:"cve"`
	CVSS           float64 `json:"cvss"`
	CreatedAt      string  `json:"created_at"`
}

// GetAllVulnerabilities returns all vulnerabilities
func (a *App) GetAllVulnerabilities() ([]Vulnerability, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, task_id, template_id, severity, name, description, url, matched_at,
		       false_positive, notes, cve, cvss, created_at
		FROM vulnerabilities
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vulns []Vulnerability
	for rows.Next() {
		var v Vulnerability
		if err := rows.Scan(
			&v.ID, &v.TaskID, &v.TemplateID, &v.Severity, &v.Name, &v.Description,
			&v.URL, &v.MatchedAt, &v.FalsePositive, &v.Notes, &v.CVE, &v.CVSS, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		vulns = append(vulns, v)
	}

	return vulns, nil
}

// GetVulnerabilitiesByTaskID returns vulnerabilities for a specific scan task
func (a *App) GetVulnerabilitiesByTaskID(taskID int) ([]Vulnerability, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, task_id, template_id, severity, name, description, url, matched_at,
		       false_positive, notes, cve, cvss, created_at
		FROM vulnerabilities
		WHERE task_id = ?
		ORDER BY created_at DESC
	`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vulns []Vulnerability
	for rows.Next() {
		var v Vulnerability
		if err := rows.Scan(
			&v.ID, &v.TaskID, &v.TemplateID, &v.Severity, &v.Name, &v.Description,
			&v.URL, &v.MatchedAt, &v.FalsePositive, &v.Notes, &v.CVE, &v.CVSS, &v.CreatedAt,
		); err != nil {
			return nil, err
		}
		vulns = append(vulns, v)
	}

	return vulns, nil
}

// CreateVulnerability creates a new vulnerability record
func (a *App) CreateVulnerability(taskID int, templateID, severity, name, description, url, matchedAt, cve string, cvss float64) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	result, err := a.db.Exec(
		"INSERT INTO vulnerabilities (task_id, template_id, severity, name, description, url, matched_at, cve, cvss) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		taskID, templateID, severity, name, description, url, matchedAt, cve, cvss,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// UpdateVulnerability updates an existing vulnerability
func (a *App) UpdateVulnerability(id int, falsePositive bool, notes string) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec(
		"UPDATE vulnerabilities SET false_positive = ?, notes = ? WHERE id = ?",
		falsePositive, notes, id,
	)

	return err
}

// DeleteVulnerability deletes a vulnerability by ID
func (a *App) DeleteVulnerability(id int) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec("DELETE FROM vulnerabilities WHERE id = ?", id)
	return err
}

// ============ Dashboard Statistics ============

// DashboardStats represents dashboard statistics
type DashboardStats struct {
	TotalTargets       int `json:"total_targets"`
	TotalScans         int `json:"total_scans"`
	RunningScans       int `json:"running_scans"`
	TotalVulnerabilities int `json:"total_vulnerabilities"`
	CriticalVulns      int `json:"critical_vulns"`
	HighVulns          int `json:"high_vulns"`
	MediumVulns        int `json:"medium_vulns"`
	LowVulns           int `json:"low_vulns"`
}

// GetDashboardStats returns dashboard statistics
func (a *App) GetDashboardStats() (DashboardStats, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	var stats DashboardStats

	// Count targets
	a.db.QueryRow("SELECT COUNT(*) FROM targets").Scan(&stats.TotalTargets)

	// Count scans
	a.db.QueryRow("SELECT COUNT(*) FROM scan_tasks").Scan(&stats.TotalScans)

	// Count running scans
	a.db.QueryRow("SELECT COUNT(*) FROM scan_tasks WHERE status = 'running'").Scan(&stats.RunningScans)

	// Count vulnerabilities
	a.db.QueryRow("SELECT COUNT(*) FROM vulnerabilities").Scan(&stats.TotalVulnerabilities)

	// Count by severity
	a.db.QueryRow("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'critical'").Scan(&stats.CriticalVulns)
	a.db.QueryRow("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'high'").Scan(&stats.HighVulns)
	a.db.QueryRow("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'medium'").Scan(&stats.MediumVulns)
	a.db.QueryRow("SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'low'").Scan(&stats.LowVulns)

	return stats, nil
}

// GetDatabaseInfo returns database information for debugging
func (a *App) GetDatabaseInfo() map[string]interface{} {
	info := make(map[string]interface{})
	info["dbPath"] = a.dbPath
	info["databaseExists"] = false

	// 检查数据库文件是否存在
	if _, err := os.Stat(a.dbPath); err == nil {
		info["databaseExists"] = true
		if fileInfo, err := os.Stat(a.dbPath); err == nil {
			info["databaseSize"] = fileInfo.Size()
		}
	}

	// 获取表统计信息
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	tables := map[string]string{
		"targets":      "目标",
		"scan_tasks":   "扫描任务",
		"vulnerabilities": "漏洞",
	}

	tableStats := make(map[string]int)
	for tableName := range tables {
		var count int
		if err := a.db.QueryRow("SELECT COUNT(*) FROM " + tableName).Scan(&count); err == nil {
			tableStats[tableName] = count
		}
	}
	info["tableStats"] = tableStats

	return info
}

// ============ Configuration Management ============

// GetConfig gets a configuration value by key
func (a *App) GetConfig(key string) (string, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	var value string
	err := a.db.QueryRow("SELECT value FROM configurations WHERE key = ?", key).Scan(&value)
	if err != nil {
		return "", err
	}

	return value, nil
}

// SetConfig sets a configuration value
func (a *App) SetConfig(key, value string) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec(
		"INSERT OR REPLACE INTO configurations (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
		key, value,
	)

	return err
}

// GetAllConfigs returns all configurations
func (a *App) GetAllConfigs() (map[string]string, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query("SELECT key, value FROM configurations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	configs := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, err
		}
		configs[key] = value
	}

	return configs, nil
}

// ============ HTTP Request/Reply Management ============

// HttpRequest represents an HTTP request for replay
type HttpRequest struct {
	ID          int               `json:"id"`
	Name        string            `json:"name"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	ContentType string            `json:"content_type"`
	Tags        []string          `json:"tags"`
	CreatedAt   string            `json:"created_at"`
	UpdatedAt   string            `json:"updated_at"`
}

// GetAllHttpRequests returns all HTTP requests
func (a *App) GetAllHttpRequests() ([]HttpRequest, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []HttpRequest
	for rows.Next() {
		var r HttpRequest
		var headersJSON, tagsJSON string
		if err := rows.Scan(
			&r.ID, &r.Name, &r.Method, &r.URL, &headersJSON, &r.Body,
			&r.ContentType, &tagsJSON, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, err
		}

		// Parse JSON fields
		if headersJSON != "" {
			json.Unmarshal([]byte(headersJSON), &r.Headers)
		}
		if tagsJSON != "" && tagsJSON != "[]" {
			json.Unmarshal([]byte(tagsJSON), &r.Tags)
		}

		requests = append(requests, r)
	}

	return requests, nil
}

// GetHttpRequestByID returns a single HTTP request by ID
func (a *App) GetHttpRequestByID(id int) (HttpRequest, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	var r HttpRequest
	var headersJSON, tagsJSON string

	err := a.db.QueryRow(`
		SELECT id, name, method, url, headers, body, content_type, tags, created_at, updated_at
		FROM http_requests
		WHERE id = ?
	`, id).Scan(
		&r.ID, &r.Name, &r.Method, &r.URL, &headersJSON, &r.Body,
		&r.ContentType, &tagsJSON, &r.CreatedAt, &r.UpdatedAt,
	)

	if err != nil {
		return HttpRequest{}, err
	}

	// Parse JSON fields
	if headersJSON != "" {
		json.Unmarshal([]byte(headersJSON), &r.Headers)
	}
	if tagsJSON != "" && tagsJSON != "[]" {
		json.Unmarshal([]byte(tagsJSON), &r.Tags)
	}

	return r, nil
}

// CreateHttpRequest creates a new HTTP request
func (a *App) CreateHttpRequest(name, method, url string, headers map[string]string, body, contentType string, tags []string) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	headersJSON, _ := json.Marshal(headers)
	tagsJSON, _ := json.Marshal(tags)

	result, err := a.db.Exec(
		"INSERT INTO http_requests (name, method, url, headers, body, content_type, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
		name, method, url, string(headersJSON), body, contentType, string(tagsJSON),
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// UpdateHttpRequest updates an existing HTTP request
func (a *App) UpdateHttpRequest(id int, name, method, url string, headers map[string]string, body, contentType string, tags []string) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	headersJSON, _ := json.Marshal(headers)
	tagsJSON, _ := json.Marshal(tags)

	_, err := a.db.Exec(
		"UPDATE http_requests SET name = ?, method = ?, url = ?, headers = ?, body = ?, content_type = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		name, method, url, string(headersJSON), body, contentType, string(tagsJSON), id,
	)

	return err
}

// DeleteHttpRequest deletes an HTTP request by ID
func (a *App) DeleteHttpRequest(id int) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	_, err := a.db.Exec("DELETE FROM http_requests WHERE id = ?", id)
	return err
}

// HttpResponse represents an HTTP response
type HttpResponse struct {
	ID         int               `json:"id"`
	RequestID  int               `json:"request_id"`
	StatusCode int               `json:"status_code"`
	StatusText string            `json:"status_text"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	BodySize   int               `json:"body_size"`
	HeaderSize int               `json:"header_size"`
	Duration   int               `json:"duration"`
	Timestamp  string            `json:"timestamp"`
	CreatedAt  string            `json:"created_at"`
}

// GetHttpResponseHistory returns response history for a request
func (a *App) GetHttpResponseHistory(requestID int) ([]HttpResponse, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, request_id, status_code, status_text, headers, body, body_size, header_size, duration, timestamp, created_at
		FROM http_responses
		WHERE request_id = ?
		ORDER BY created_at DESC
	`, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []HttpResponse
	for rows.Next() {
		var r HttpResponse
		var headersJSON string
		if err := rows.Scan(
			&r.ID, &r.RequestID, &r.StatusCode, &r.StatusText, &headersJSON,
			&r.Body, &r.BodySize, &r.HeaderSize, &r.Duration, &r.Timestamp, &r.CreatedAt,
		); err != nil {
			return nil, err
		}

		if headersJSON != "" {
			json.Unmarshal([]byte(headersJSON), &r.Headers)
		}

		responses = append(responses, r)
	}

	return responses, nil
}

// ============ Port Scan Management ============

// PortScanTask represents a port scan task
type PortScanTask struct {
	ID          int      `json:"id"`
	Target      string   `json:"target"`
	Ports       []int    `json:"ports"`
	Timeout     int      `json:"timeout"`
	BatchSize   int      `json:"batch_size"`
	Status      string   `json:"status"`
	StartedAt   string   `json:"started_at"`
	CompletedAt string   `json:"completed_at"`
	CreatedAt   string   `json:"created_at"`
}

// PortScanResult represents a port scan result
type PortScanResult struct {
	ID       int    `json:"id"`
	TaskID   int    `json:"task_id"`
	Port     int    `json:"port"`
	Status   string `json:"status"`
	Service  string `json:"service"`
	Banner   string `json:"banner"`
	Latency  int    `json:"latency"`
}

// GetAllPortScanTasks returns all port scan tasks
func (a *App) GetAllPortScanTasks() ([]PortScanTask, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, target, ports, timeout, batch_size, status, started_at, completed_at, created_at
		FROM port_scan_tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []PortScanTask
	for rows.Next() {
		var t PortScanTask
		var portsJSON string
		if err := rows.Scan(
			&t.ID, &t.Target, &portsJSON, &t.Timeout, &t.BatchSize,
			&t.Status, &t.StartedAt, &t.CompletedAt, &t.CreatedAt,
		); err != nil {
			return nil, err
		}

		if portsJSON != "" && portsJSON != "[]" {
			json.Unmarshal([]byte(portsJSON), &t.Ports)
		}

		tasks = append(tasks, t)
	}

	return tasks, nil
}

// CreatePortScanTask creates a new port scan task
func (a *App) CreatePortScanTask(target string, ports []int, timeout, batchSize int) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	portsJSON, _ := json.Marshal(ports)
	result, err := a.db.Exec(
		"INSERT INTO port_scan_tasks (target, ports, timeout, batch_size, status) VALUES (?, ?, ?, ?, 'pending')",
		target, string(portsJSON), timeout, batchSize,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetPortScanResults returns results for a port scan task
func (a *App) GetPortScanResults(taskID int) ([]PortScanResult, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, task_id, port, status, service, banner, latency
		FROM port_scan_results
		WHERE task_id = ?
		ORDER BY port ASC
	`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []PortScanResult
	for rows.Next() {
		var r PortScanResult
		if err := rows.Scan(&r.ID, &r.TaskID, &r.Port, &r.Status, &r.Service, &r.Banner, &r.Latency); err != nil {
			return nil, err
		}
		results = append(results, r)
	}

	return results, nil
}

// ============ Domain Brute Management ============

// DomainBruteTask represents a domain brute force task
type DomainBruteTask struct {
	ID          int      `json:"id"`
	Domain      string   `json:"domain"`
	Wordlist    []string `json:"wordlist"`
	Timeout     int      `json:"timeout"`
	BatchSize   int      `json:"batch_size"`
	Status      string   `json:"status"`
	StartedAt   string   `json:"started_at"`
	CompletedAt string   `json:"completed_at"`
	CreatedAt   string   `json:"created_at"`
}

// DomainBruteResult represents a domain brute force result
type DomainBruteResult struct {
	ID       int      `json:"id"`
	TaskID   int      `json:"task_id"`
	Subdomain string  `json:"subdomain"`
	Resolved bool    `json:"resolved"`
	IPs      []string `json:"ips"`
	Latency  int      `json:"latency"`
}

// GetAllDomainBruteTasks returns all domain brute tasks
func (a *App) GetAllDomainBruteTasks() ([]DomainBruteTask, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, domain, wordlist, timeout, batch_size, status, started_at, completed_at, created_at
		FROM domain_brute_tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []DomainBruteTask
	for rows.Next() {
		var t DomainBruteTask
		var wordlistJSON string
		if err := rows.Scan(
			&t.ID, &t.Domain, &wordlistJSON, &t.Timeout, &t.BatchSize,
			&t.Status, &t.StartedAt, &t.CompletedAt, &t.CreatedAt,
		); err != nil {
			return nil, err
		}

		if wordlistJSON != "" && wordlistJSON != "[]" {
			json.Unmarshal([]byte(wordlistJSON), &t.Wordlist)
		}

		tasks = append(tasks, t)
	}

	return tasks, nil
}

// CreateDomainBruteTask creates a new domain brute task
func (a *App) CreateDomainBruteTask(domain string, wordlist []string, timeout, batchSize int) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	wordlistJSON, _ := json.Marshal(wordlist)
	result, err := a.db.Exec(
		"INSERT INTO domain_brute_tasks (domain, wordlist, timeout, batch_size, status) VALUES (?, ?, ?, ?, 'pending')",
		domain, string(wordlistJSON), timeout, batchSize,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetDomainBruteResults returns results for a domain brute task
func (a *App) GetDomainBruteResults(taskID int) ([]DomainBruteResult, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, task_id, subdomain, resolved, ips, latency
		FROM domain_brute_results
		WHERE task_id = ?
		ORDER BY subdomain ASC
	`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []DomainBruteResult
	for rows.Next() {
		var r DomainBruteResult
		var ipsJSON string
		if err := rows.Scan(&r.ID, &r.TaskID, &r.Subdomain, &r.Resolved, &ipsJSON, &r.Latency); err != nil {
			return nil, err
		}

		if ipsJSON != "" && ipsJSON != "[]" {
			json.Unmarshal([]byte(ipsJSON), &r.IPs)
		}

		results = append(results, r)
	}

	return results, nil
}

// ============ Brute Force Management ============

// BruteTask represents a brute force task
type BruteTask struct {
	ID            int      `json:"id"`
	Name          string   `json:"name"`
	RequestID     int      `json:"request_id"`
	Type          string   `json:"type"`
	Status        string   `json:"status"`
	TotalPayloads int      `json:"total_payloads"`
	SentPayloads  int      `json:"sent_payloads"`
	SuccessCount  int      `json:"success_count"`
	FailureCount  int      `json:"failure_count"`
	StartedAt     string   `json:"started_at"`
	CompletedAt   string   `json:"completed_at"`
	CreatedAt     string   `json:"created_at"`
}

// BrutePayloadSet represents a payload set
type BrutePayloadSet struct {
	ID        int              `json:"id"`
	Name      string           `json:"name"`
	Type      string           `json:"type"`
	Config    map[string]interface{} `json:"config"`
	CreatedAt string           `json:"created_at"`
}

// GetAllBruteTasks returns all brute force tasks
func (a *App) GetAllBruteTasks() ([]BruteTask, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, name, request_id, type, status, total_payloads, sent_payloads, success_count, failure_count, started_at, completed_at, created_at
		FROM brute_tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []BruteTask
	for rows.Next() {
		var t BruteTask
		if err := rows.Scan(
			&t.ID, &t.Name, &t.RequestID, &t.Type, &t.Status,
			&t.TotalPayloads, &t.SentPayloads, &t.SuccessCount, &t.FailureCount,
			&t.StartedAt, &t.CompletedAt, &t.CreatedAt,
		); err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}

	return tasks, nil
}

// CreateBruteTask creates a new brute force task
func (a *App) CreateBruteTask(name string, requestID int, taskType string) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	result, err := a.db.Exec(
		"INSERT INTO brute_tasks (name, request_id, type, status) VALUES (?, ?, ?, 'pending')",
		name, requestID, taskType,
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// GetAllBrutePayloadSets returns all payload sets
func (a *App) GetAllBrutePayloadSets() ([]BrutePayloadSet, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, name, type, config, created_at
		FROM brute_payload_sets
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sets []BrutePayloadSet
	for rows.Next() {
		var s BrutePayloadSet
		var configJSON string
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &configJSON, &s.CreatedAt); err != nil {
			return nil, err
		}

		if configJSON != "" && configJSON != "{}" {
			json.Unmarshal([]byte(configJSON), &s.Config)
		}

		sets = append(sets, s)
	}

	return sets, nil
}

// CreateBrutePayloadSet creates a new payload set
func (a *App) CreateBrutePayloadSet(name, setType string, config map[string]interface{}) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	configJSON, _ := json.Marshal(config)
	result, err := a.db.Exec(
		"INSERT INTO brute_payload_sets (name, type, config) VALUES (?, ?, ?)",
		name, setType, string(configJSON),
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}



// ============ Nuclei Scanner ============

// findNucleiBinary 查找 nuclei 可执行文件
func (a *App) findNucleiBinary() string {
	// 优先级：环境变量 > 用户本地安装 > 全局安装 > HOME 安装

	// 1. 检查环境变量
	if path := os.Getenv("NUCLEI_PATH"); path != "" {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	// 2. 检查常见的本地路径
	possiblePaths := []string{
		"nuclei",
		"./nuclei",
		"/usr/local/bin/nuclei",
		filepath.Join(os.Getenv("HOME"), "nuclei"),
		filepath.Join(os.Getenv("HOME"), ".local", "bin", "nuclei"),
		filepath.Join(os.Getenv("HOME"), "go", "bin", "nuclei"),
		"/opt/homebrew/bin/nuclei",
	}

	for _, path := range possiblePaths {
		if path == "" {
			continue
		}
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	return ""
}

// StartScan 启动扫描任务
func (a *App) StartScan(taskID int) error {
	if a.nucleiBinary == "" {
		return fmt.Errorf("nuclei binary not found")
	}

	// 获取任务信息
	var task ScanTask
	var target Target
	var templatesStr string

	err := a.db.QueryRow(`
		SELECT id, name, target_id, status, strategy, templates_used
		FROM scan_tasks WHERE id = ?
	`, taskID).Scan(&task.ID, &task.Name, &task.TargetID, &task.Status, &task.Strategy, &templatesStr)

	if err != nil {
		return fmt.Errorf("scan task not found: %w", err)
	}

	err = a.db.QueryRow(`
		SELECT id, name, url FROM targets WHERE id = ?
	`, task.TargetID).Scan(&target.ID, &target.Name, &target.URL)

	if err != nil {
		return fmt.Errorf("target not found: %w", err)
	}

	// 解析模板
	var templates []string
	if templatesStr != "" && templatesStr != "[]" {
		json.Unmarshal([]byte(templatesStr), &templates)
	}

	// 检查是否已经在运行
	a.runningScansMu.Lock()
	if _, exists := a.runningScans[taskID]; exists {
		a.runningScansMu.Unlock()
		return fmt.Errorf("scan task %d is already running", taskID)
	}
	a.runningScansMu.Unlock()

	// 更新任务状态为 running
	a.UpdateScanTaskStatus(taskID, "running")

	// 推送扫描启动事件
	runtime.EventsEmit(a.ctx, "scan-started", map[string]interface{}{
		"scanId": taskID,
	})

	// 启动扫描
	go a.runScan(task, target, templates)

	return nil
}

// runScan 执行实际的扫描
func (a *App) runScan(task ScanTask, target Target, templates []string) {
	taskID := task.ID

	// 构建命令参数
	args := a.buildNucleiArgs(target.URL, task.Strategy, templates)
	cmd := exec.Command(a.nucleiBinary, args...)

	// 存储命令引用
	a.runningScansMu.Lock()
	a.runningScans[taskID] = cmd
	a.runningScansMu.Unlock()

	// 清理函数
	defer func() {
		a.runningScansMu.Lock()
		delete(a.runningScans, taskID)
		a.runningScansMu.Unlock()
	}()

	// 创建管道
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		a.handleScanError(taskID, fmt.Errorf("failed to create stdout pipe: %w", err))
		return
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		a.handleScanError(taskID, fmt.Errorf("failed to create stderr pipe: %w", err))
		return
	}

	// 启动命令
	if err := cmd.Start(); err != nil {
		a.handleScanError(taskID, fmt.Errorf("failed to start nuclei: %w", err))
		return
	}

	// 解析输出
	go a.parseScanOutput(taskID, stdout)
	go a.parseScanProgress(taskID, stderr)

	// 等待命令完成
	if err := cmd.Wait(); err != nil {
		a.handleScanError(taskID, fmt.Errorf("scan failed: %w", err))
		return
	}

	// 获取漏洞数量
	a.scanProgressMu.Lock()
	vulnCount := 0
	if progress, ok := a.scanProgress[taskID]; ok {
		vulnCount = progress.VulnCount
	}
	a.scanProgressMu.Unlock()

	// 更新状态为完成
	a.UpdateScanTaskStatus(taskID, "completed")

	// 推送扫描完成事件
	runtime.EventsEmit(a.ctx, "scan-completed", map[string]interface{}{
		"scanId":   taskID,
		"status":   "completed",
		"findings": vulnCount,
	})
}

// buildNucleiArgs 构建 nuclei 命令参数
func (a *App) buildNucleiArgs(targetURL, strategy string, templates []string) []string {
	args := []string{
		"-u", targetURL,
		"-json",           // JSON 输出
		"-stats",          // 启用统计信息
		"-silent",         // 静默模式，减少输出
		"-rate-limit", "150",
		"-timeout", "10",
		"-retries", "1",
	}

	// 根据策略设置严重性
	if strategy != "" && strategy != "default" {
		severities := strings.Split(strategy, ",")
		for _, sev := range severities {
			args = append(args, "-severity", strings.TrimSpace(sev))
		}
	}

	// 添加指定模板
	for _, tmpl := range templates {
		args = append(args, "-id", tmpl)
	}

	return args
}

// parseScanProgress 解析 nuclei 的进度输出（从 stderr）
func (a *App) parseScanProgress(taskID int, pipe io.ReadCloser) {
	defer pipe.Close()

	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		line := scanner.Text()

		// nuclei 的进度输出格式示例：
		// [INF] Current template: http/cves/2021/CVE-2021-XXXXX.yaml (0/12035)
		// [INF] [stats] requests: 123, findings: 5, rps: 10, duration: 12s

		// 尝试解析模板进度
		if strings.Contains(line, "Current template:") {
			// 提取模板名称和进度
			parts := strings.Split(line, "(")
			if len(parts) == 2 {
				// 格式: (0/12035)
				progressStr := strings.TrimSuffix(parts[1], ")")
				progressParts := strings.Split(progressStr, "/")
				if len(progressParts) == 2 {
					var current, total int
					fmt.Sscanf(progressParts[0], "%d", &current)
					fmt.Sscanf(progressParts[1], "%d", &total)

					// 提取模板名称
					templateName := strings.TrimSpace(strings.TrimPrefix(parts[0], "[INF] Current template:"))

					a.updateScanProgress(taskID, ScanProgress{
						TaskID:          taskID,
						Status:          "running",
						Executed:        current,
						TotalTemplates:  total,
						Progress:        int(float64(current) / float64(total) * 100),
						CurrentTemplate: templateName,
					})
				}
			}
		}

		// 尝试解析统计信息
		if strings.Contains(line, "[stats]") {
			// 提取发现数
			if strings.Contains(line, "findings:") {
				parts := strings.Split(line, "findings:")
				if len(parts) == 2 {
					var findings int
					fmt.Sscanf(strings.TrimSpace(strings.Fields(parts[1])[0]), "%d", &findings)

					a.scanProgressMu.Lock()
					if existing, ok := a.scanProgress[taskID]; ok {
						existing.VulnCount = findings
						a.scanProgress[taskID] = existing
					}
					a.scanProgressMu.Unlock()
				}
			}
		}
	}
}

// parseScanOutput 解析扫描输出
func (a *App) parseScanOutput(taskID int, pipe io.ReadCloser) {
	defer pipe.Close()

	scanner := bufio.NewScanner(pipe)
	vulnCount := 0
	executedTemplates := 0

	for scanner.Scan() {
		line := scanner.Text()

		// 尝试解析为 JSON
		var output NucleiOutput
		if err := json.Unmarshal([]byte(line), &output); err == nil {
			// 这是一个漏洞发现
			vulnCount++

			// 保存漏洞到数据库
			a.CreateVulnerability(
				taskID,
				output.TemplateID,
				output.Severity,
				output.Name,
				"",
				output.URL,
				output.MatchedAt,
				"",
				0,
			)

			// 推送漏洞发现事件
			runtime.EventsEmit(a.ctx, "scan-finding", map[string]interface{}{
				"scanId":  taskID,
				"finding": output,
			})

			// 更新进度
			a.updateScanProgress(taskID, ScanProgress{
				TaskID:     taskID,
				Status:     "running",
				VulnCount:  vulnCount,
			})
		}
	}

	executedTemplates++
	a.updateScanProgress(taskID, ScanProgress{
		TaskID:   taskID,
		Status:   "running",
		Executed: executedTemplates,
	})
}

// handleScanError 处理扫描错误
func (a *App) handleScanError(taskID int, err error) {
	a.UpdateScanTaskStatus(taskID, "failed")

	a.scanProgressMu.Lock()
	a.scanProgress[taskID] = ScanProgress{
		TaskID: taskID,
		Status: "failed",
		Error:  err.Error(),
	}
	a.scanProgressMu.Unlock()

	// 推送扫描错误事件
	runtime.EventsEmit(a.ctx, "scan-error", map[string]interface{}{
		"scanId": taskID,
		"error":  err.Error(),
	})
}

// updateScanProgress 更新扫描进度
func (a *App) updateScanProgress(taskID int, progress ScanProgress) {
	a.scanProgressMu.Lock()
	defer a.scanProgressMu.Unlock()

	// 合并现有进度
	if existing, ok := a.scanProgress[taskID]; ok {
		if progress.Status != "" {
			existing.Status = progress.Status
		}
		if progress.VulnCount > 0 {
			existing.VulnCount = progress.VulnCount
		}
		if progress.Executed > 0 {
			existing.Executed = progress.Executed
			if existing.TotalTemplates > 0 {
				existing.Progress = int(float64(progress.Executed) / float64(existing.TotalTemplates) * 100)
			}
		}
		if progress.TotalTemplates > 0 {
			existing.TotalTemplates = progress.TotalTemplates
		}
		if progress.CurrentTemplate != "" {
			existing.CurrentTemplate = progress.CurrentTemplate
		}
		a.scanProgress[taskID] = existing
		progress = existing
	} else {
		a.scanProgress[taskID] = progress
	}

	// 更新数据库
	if progress.TotalTemplates > 0 {
		a.UpdateScanTaskProgress(taskID, progress.Executed, progress.TotalTemplates, progress.Progress)
	}

	// 推送事件到前端
	runtime.EventsEmit(a.ctx, "scan-progress", map[string]interface{}{
		"scanId":            taskID,
		"progress":          progress.Progress,
		"currentTemplate":   progress.CurrentTemplate,
		"completedTemplates": progress.Executed,
		"totalTemplates":    progress.TotalTemplates,
		"findings":          progress.VulnCount,
		"status":            progress.Status,
	})
}

// GetScanProgress 获取扫描进度
func (a *App) GetScanProgress(taskID int) (ScanProgress, error) {
	a.scanProgressMu.RLock()
	defer a.scanProgressMu.RUnlock()

	if progress, ok := a.scanProgress[taskID]; ok {
		return progress, nil
	}

	return ScanProgress{}, fmt.Errorf("progress not found for task %d", taskID)
}

// StopScan 停止扫描
func (a *App) StopScan(taskID int) error {
	a.runningScansMu.Lock()
	defer a.runningScansMu.Unlock()

	if cmd, exists := a.runningScans[taskID]; exists {
		if err := cmd.Process.Kill(); err != nil {
			return fmt.Errorf("failed to stop scan: %w", err)
		}
		delete(a.runningScans, taskID)
		a.UpdateScanTaskStatus(taskID, "cancelled")
		return nil
	}

	return fmt.Errorf("scan task %d is not running", taskID)
}

// ============ Nuclei Status ============

// NucleiStatus represents the status of nuclei binary
type NucleiStatus struct {
	Available    bool   `json:"available"`
	Version      string `json:"version"`
	Path         string `json:"path"`
	Embedded     bool   `json:"embedded"`
	Platform     string `json:"platform"`
	Installed    bool   `json:"installed"`
	TemplatesDir string `json:"templates_dir,omitempty"`
	TemplateCount int   `json:"template_count,omitempty"`
	OfflineMode  bool   `json:"offline_mode"`
	Ready        bool   `json:"ready"`
}

// GetNucleiStatus 获取 nuclei 二进制文件状态
func (a *App) GetNucleiStatus() NucleiStatus {
	status := NucleiStatus{
		Available:    a.nucleiBinary != "",
		Version:      a.nucleiVersion,
		Path:         a.nucleiBinary,
		Embedded:     a.nucleiEmbedded,
		Platform:     stdruntime.GOOS + "_" + stdruntime.GOARCH,
		Installed:    false,
		OfflineMode:  a.offlineScanner != nil,
		Ready:        false,
	}

	// 检查文件是否存在
	if a.nucleiBinary != "" {
		if _, err := os.Stat(a.nucleiBinary); err == nil {
			status.Installed = true
		}
	}

	// 获取离线扫描器信息
	if a.offlineScanner != nil {
		status.TemplatesDir = a.offlineScanner.GetTemplatesDir()
		status.Ready = a.offlineScanner.IsReady()

		// 获取模板统计
		if stats, err := a.offlineScanner.GetTemplateStats(); err == nil {
			status.TemplateCount = stats["total"]
		}
	}

	return status
}

// InstallNuclei 安装 nuclei 二进制文件到用户数据目录
func (a *App) InstallNuclei() error {
	// 使用离线扫描器设置
	if a.offlineScanner == nil {
		a.offlineScanner = offline.NewOfflineScanner(a.userDataDir)
	}

	if err := a.offlineScanner.Setup(); err != nil {
		return fmt.Errorf("failed to setup offline scanner: %w", err)
	}

	a.nucleiBinary = a.offlineScanner.GetNucleiBinary()
	a.nucleiEmbedded = true
	a.nucleiVersion = "v3.6.2"

	println("Nuclei installed successfully:")
	println("  Binary:", a.nucleiBinary)
	println("  Templates:", a.offlineScanner.GetTemplatesDir())

	return nil
}

