package database

import (
	"database/sql"
	"fmt"
	"sort"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/database/migrations"
	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	_ "github.com/mattn/go-sqlite3"
)

// Migration 迁移接口（重新导出）
type Migration = migrations.Migration

// migrationRunner 迁移执行器
type migrationRunner struct {
	migrations map[int]Migration
}

// newMigrationRunner 创建迁移执行器
func newMigrationRunner() *migrationRunner {
	return &migrationRunner{
		migrations: make(map[int]Migration),
	}
}

// Register 注册迁移
func (r *migrationRunner) Register(m Migration) {
	r.migrations[m.Version()] = m
}

// Run 执行迁移
func (r *migrationRunner) Run(db *sql.DB) error {
	// 创建迁移记录表
	if err := createSchemaMigrationsTable(db); err != nil {
		return errors.DBError("failed to create migrations table", err)
	}

	// 获取已执行的迁移
	applied, err := getAppliedVersions(db)
	if err != nil {
		return errors.DBError("failed to get applied versions", err)
	}

	// 获取所有待执行的迁移
	pending := r.getPendingMigrations(applied)
	if len(pending) == 0 {
		fmt.Println("[Migration] Database is up to date")
		return nil
	}

	// 按版本号排序
	sort.Slice(pending, func(i, j int) bool {
		return pending[i].Version() < pending[j].Version()
	})

	// 执行迁移
	for _, m := range pending {
		startTime := time.Now()
		fmt.Printf("[Migration] [%s] Applying version %d: %s\n", m.Module(), m.Version(), m.Description())

		// 开启事务
		tx, err := db.Begin()
		if err != nil {
			return errors.DBError("failed to begin transaction", err)
		}

		// 执行迁移
		if err := m.Up(tx); err != nil {
			_ = tx.Rollback()
			return errors.DBError(fmt.Sprintf("migration %d failed", m.Version()), err)
		}

		// 记录迁移
		if err := recordMigration(tx, m); err != nil {
			_ = tx.Rollback()
			return errors.DBError(fmt.Sprintf("failed to record migration %d", m.Version()), err)
		}

		// 提交事务
		if err := tx.Commit(); err != nil {
			return errors.DBError(fmt.Sprintf("failed to commit migration %d", m.Version()), err)
		}

		duration := time.Since(startTime)
		fmt.Printf("[Migration] [%s] Completed version %d in %v\n", m.Module(), m.Version(), duration)
	}

	return nil
}

// getPendingMigrations 获取待执行的迁移
func (r *migrationRunner) getPendingMigrations(applied map[int]bool) []Migration {
	var pending []Migration
	for version, m := range r.migrations {
		if !applied[version] {
			pending = append(pending, m)
		}
	}
	return pending
}

// createSchemaMigrationsTable 创建迁移记录表
func createSchemaMigrationsTable(db *sql.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		module TEXT NOT NULL,
		description TEXT NOT NULL,
		applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := db.Exec(query)
	return err
}

// getAppliedVersions 获取已执行的迁移版本
func getAppliedVersions(db *sql.DB) (map[int]bool, error) {
	query := `SELECT version FROM schema_migrations`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[int]bool)
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

// recordMigration 记录迁移
func recordMigration(tx *sql.Tx, m Migration) error {
	query := `INSERT INTO schema_migrations (version, module, description) VALUES (?, ?, ?)`
	_, err := tx.Exec(query, m.Version(), m.Module(), m.Description())
	return err
}

// initSchema 内部初始化函数（由 db.go.InitSchema 调用）
func initSchema(db *sql.DB) error {
	runner := newMigrationRunner()

	// 自动注册所有迁移（通过 init() 函数）
	for _, m := range migrations.All {
		runner.Register(m)
	}

	// 执行迁移
	return runner.Run(db)
}
