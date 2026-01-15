package migrations

import "database/sql"

func init() {
	Register(&Core_002_Indexes{})
}

type Core_002_Indexes struct{}

func (m *Core_002_Indexes) Version() int { return 2025011502 }
func (m *Core_002_Indexes) Description() string { return "Core: Add performance indexes" }
func (m *Core_002_Indexes) Module() string { return "core" }

func (m *Core_002_Indexes) Up(tx *sql.Tx) error {
	indexes := `
	-- 漏洞表的复合索引（常用查询组合）
	CREATE INDEX IF NOT EXISTS idx_vulnerabilities_severity_created_at ON vulnerabilities(severity, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_vulnerabilities_task_id_severity ON vulnerabilities(task_id, severity);
	CREATE INDEX IF NOT EXISTS idx_vulnerabilities_template_id ON vulnerabilities(template_id);

	-- 扫描任务表的时间索引
	CREATE INDEX IF NOT EXISTS idx_scan_tasks_created_at ON scan_tasks(created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_scan_tasks_status_created_at ON scan_tasks(status, created_at DESC);

	-- 目标表的索引
	CREATE INDEX IF NOT EXISTS idx_targets_created_at ON targets(created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_targets_url ON targets(url);

	-- HTTP 相关表的索引
	CREATE INDEX IF NOT EXISTS idx_http_requests_task_id ON http_requests(task_id);
	CREATE INDEX IF NOT EXISTS idx_http_responses_task_id ON http_responses(task_id);

	-- 端口扫描相关索引
	CREATE INDEX IF NOT EXISTS idx_port_scans_target_id ON port_scans(target_id);
	CREATE INDEX IF NOT EXISTS idx_port_scans_status ON port_scans(status);

	-- 域名爆破相关索引
	CREATE INDEX IF NOT EXISTS idx_domain_brutes_target_id ON domain_brutes(target_id);
	CREATE INDEX IF NOT EXISTS idx_domain_brutes_status ON domain_brutes(status);

	-- 密码爆破相关索引
	CREATE INDEX IF NOT EXISTS idx_brutes_target_id ON brutes(target_id);
	CREATE INDEX IF NOT EXISTS idx_brutes_status ON brutes(status);
	`
	_, err := tx.Exec(indexes)
	return err
}

func (m *Core_002_Indexes) Down(tx *sql.Tx) error {
	drops := `
	DROP INDEX IF EXISTS idx_vulnerabilities_severity_created_at;
	DROP INDEX IF EXISTS idx_vulnerabilities_task_id_severity;
	DROP INDEX IF EXISTS idx_vulnerabilities_template_id;
	DROP INDEX IF EXISTS idx_scan_tasks_created_at;
	DROP INDEX IF EXISTS idx_scan_tasks_status_created_at;
	DROP INDEX IF EXISTS idx_targets_created_at;
	DROP INDEX IF EXISTS idx_targets_url;
	DROP INDEX IF EXISTS idx_http_requests_task_id;
	DROP INDEX IF EXISTS idx_http_responses_task_id;
	DROP INDEX IF EXISTS idx_port_scans_target_id;
	DROP INDEX IF EXISTS idx_port_scans_status;
	DROP INDEX IF EXISTS idx_domain_brutes_target_id;
	DROP INDEX IF EXISTS idx_domain_brutes_status;
	DROP INDEX IF EXISTS idx_brutes_target_id;
	DROP INDEX IF EXISTS idx_brutes_status;
	`
	_, err := tx.Exec(drops)
	return err
}
