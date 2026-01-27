package migrations

import "database/sql"

func init() {
	Register(&Vuln_002_AddRequestResponse{})
}

type Vuln_002_AddRequestResponse struct{}

func (m *Vuln_002_AddRequestResponse) Version() int        { return 2025012702 }
func (m *Vuln_002_AddRequestResponse) Description() string { return "Vulnerabilities: Add request_response column" }
func (m *Vuln_002_AddRequestResponse) Module() string      { return "core" }

func (m *Vuln_002_AddRequestResponse) Up(tx *sql.Tx) error {
	// 添加 request_response 列（合并 request 和 response）
	_, err := tx.Exec(`
		ALTER TABLE vulnerabilities ADD COLUMN request_response TEXT
	`)
	return err
}

func (m *Vuln_002_AddRequestResponse) Down(tx *sql.Tx) error {
	// SQLite 不支持 DROP COLUMN，所以这个迁移不可逆
	return nil
}
