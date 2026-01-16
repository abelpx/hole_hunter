package migrations

import (
	"database/sql"
	"fmt"
)

func init() {
	Register(&Template_001_Unified{})
}

type Template_001_Unified struct{}

func (m *Template_001_Unified) Version() int {
	return 2025011601
}

func (m *Template_001_Unified) Description() string {
	return "Template: Unified templates table for builtin and custom templates"
}

func (m *Template_001_Unified) Module() string {
	return "template"
}

func (m *Template_001_Unified) Up(tx *sql.Tx) error {
	query := `
	CREATE TABLE IF NOT EXISTS templates (
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

	CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_source_template_id
		ON templates(source, template_id)
		WHERE source = 'builtin';

	CREATE INDEX IF NOT EXISTS idx_templates_source ON templates(source);
	CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
	CREATE INDEX IF NOT EXISTS idx_templates_severity ON templates(severity);
	CREATE INDEX IF NOT EXISTS idx_templates_enabled ON templates(enabled);
	`

	_, err := tx.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create templates table: %w", err)
	}

	seedQuery := `
	INSERT INTO templates (
		source, template_id, name, severity, category, author,
		content, enabled, description, tags
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = tx.Exec(seedQuery,
		"custom", "custom-example-1", "Example Custom Template", "info", "examples", "user",
		`id: custom-example-1
info:
  name: Example Custom Template
  severity: info
  description: This is an example custom template
  author: user
  tags:
    - example
    - custom
http:
  - method: GET
    path:
      - "{{BaseURL}}"
    matchers:
      - type: status
        status:
          - 200
`,
		1, "This is an example custom template", `["example","custom"]`,
	)
	if err != nil {
		return fmt.Errorf("failed to seed example template: %w", err)
	}

	return nil
}

func (m *Template_001_Unified) Down(tx *sql.Tx) error {
	_, err := tx.Exec("DROP TABLE IF EXISTS templates")
	return err
}
