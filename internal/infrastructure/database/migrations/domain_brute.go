package migrations

import "database/sql"

func init() {
	Register(&DomainBrute_001_Initial{})
}

type DomainBrute_001_Initial struct{}

func (m *DomainBrute_001_Initial) Version() int { return 2025011506 }
func (m *DomainBrute_001_Initial) Description() string { return "DomainBrute: Initial schema" }
func (m *DomainBrute_001_Initial) Module() string { return "domain_brute" }

func (m *DomainBrute_001_Initial) Up(tx *sql.Tx) error {
	schema := `
	CREATE TABLE domain_brute_tasks (
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

	CREATE TABLE domain_brute_results (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		subdomain TEXT NOT NULL,
		resolved INTEGER DEFAULT 0,
		ips TEXT DEFAULT '[]',
		latency INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES domain_brute_tasks(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_domain_brute_results_task_id ON domain_brute_results(task_id);
	CREATE INDEX IF NOT EXISTS idx_domain_brute_results_subdomain ON domain_brute_results(subdomain);
	`
	_, err := tx.Exec(schema)
	return err
}

func (m *DomainBrute_001_Initial) Down(tx *sql.Tx) error {
	tx.Exec("DROP TABLE IF EXISTS domain_brute_results")
	tx.Exec("DROP TABLE IF EXISTS domain_brute_tasks")
	return nil
}
