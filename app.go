package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	_ "github.com/mattn/go-sqlite3"
)

// App struct
type App struct {
	ctx      context.Context
	db       *sql.DB
	dbMutex  sync.RWMutex
	dbPath   string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
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
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	// Close database connection
	if a.db != nil {
		a.db.Close()
		println("Database connection closed")
	}
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
	ID                int      `json:"id"`
	TargetID          int      `json:"target_id"`
	Status            string   `json:"status"`
	Strategy          string   `json:"strategy"`
	TemplatesUsed     []string `json:"templates_used"`
	StartedAt         string   `json:"started_at"`
	CompletedAt       string   `json:"completed_at"`
	TotalTemplates    int      `json:"total_templates"`
	ExecutedTemplates int      `json:"executed_templates"`
	Progress          int      `json:"progress"`
	CurrentTemplate   string   `json:"current_template"`
	Error             string   `json:"error"`
	CreatedAt         string   `json:"created_at"`
}

// GetAllScanTasks returns all scan tasks
func (a *App) GetAllScanTasks() ([]ScanTask, error) {
	a.dbMutex.RLock()
	defer a.dbMutex.RUnlock()

	rows, err := a.db.Query(`
		SELECT id, target_id, status, strategy, templates_used, started_at, completed_at,
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
			&t.ID, &t.TargetID, &t.Status, &t.Strategy, &templatesStr,
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
		SELECT id, target_id, status, strategy, templates_used, started_at, completed_at,
		       total_templates, executed_templates, progress, current_template, error, created_at
		FROM scan_tasks
		WHERE id = ?
	`, id).Scan(
		&t.ID, &t.TargetID, &t.Status, &t.Strategy, &templatesStr,
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
func (a *App) CreateScanTask(targetID int, strategy string, templates []string) (int64, error) {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()

	templatesJSON, _ := json.Marshal(templates)
	result, err := a.db.Exec(
		"INSERT INTO scan_tasks (target_id, status, strategy, templates_used) VALUES (?, ?, ?, ?)",
		targetID, "pending", strategy, string(templatesJSON),
	)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
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
