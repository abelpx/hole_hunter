package repo

import (
	"context"
	"database/sql"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
)

// DashboardRepository 仪表板仓储
type DashboardRepository struct {
	db *sql.DB
}

// NewDashboardRepository 创建仪表板仓储
func NewDashboardRepository(db *sql.DB) *DashboardRepository {
	return &DashboardRepository{db: db}
}

// GetStats 获取统计数据
func (r *DashboardRepository) GetStats(ctx context.Context) (*Stats, error) {
	stats := &Stats{}

	// 目标总数
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM targets").Scan(&stats.TotalTargets); err != nil {
		return nil, errors.DBError("failed to count targets", err)
	}

	// 扫描任务总数
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM scan_tasks").Scan(&stats.TotalScans); err != nil {
		return nil, errors.DBError("failed to count scan tasks", err)
	}

	// 运行中的扫描任务数
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM scan_tasks WHERE status = 'running'").Scan(&stats.RunningScans); err != nil {
		return nil, errors.DBError("failed to count running scans", err)
	}

	// 漏洞统计
	// 总数
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM vulnerabilities WHERE false_positive = 0").Scan(&stats.TotalVulnerabilities); err != nil {
		return nil, errors.DBError("failed to count vulnerabilities", err)
	}

	// 各级别漏洞数
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'critical' AND false_positive = 0").Scan(&stats.CriticalVulns); err != nil {
		stats.CriticalVulns = 0
	}
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'high' AND false_positive = 0").Scan(&stats.HighVulns); err != nil {
		stats.HighVulns = 0
	}
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'medium' AND false_positive = 0").Scan(&stats.MediumVulns); err != nil {
		stats.MediumVulns = 0
	}
	if err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM vulnerabilities WHERE severity = 'low' AND false_positive = 0").Scan(&stats.LowVulns); err != nil {
		stats.LowVulns = 0
	}

	return stats, nil
}

// HealthCheck 检查数据库健康状态
func (r *DashboardRepository) HealthCheck(ctx context.Context) error {
	return r.db.PingContext(ctx)
}

// GetDatabaseInfo 获取数据库信息
func (r *DashboardRepository) GetDatabaseInfo(ctx context.Context) (*DatabaseInfo, error) {
	info := &DatabaseInfo{}

	// 获取 SQLite 版本
	if err := r.db.QueryRowContext(ctx, "SELECT sqlite_version()").Scan(&info.Version); err != nil {
		return nil, errors.DBError("failed to get sqlite version", err)
	}

	// 获取数据库大小
	var pageSize, pageCount int
	if err := r.db.QueryRowContext(ctx, "PRAGMA page_size").Scan(&pageSize); err != nil {
		return nil, errors.DBError("failed to get page size", err)
	}
	if err := r.db.QueryRowContext(ctx, "PRAGMA page_count").Scan(&pageCount); err != nil {
		return nil, errors.DBError("failed to get page count", err)
	}
	info.Size = int64(pageSize) * int64(pageCount)

	// 获取表统计
	rows, err := r.db.QueryContext(ctx, `
		SELECT name, (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as has_rows
		FROM sqlite_master m
		WHERE type='table' AND name NOT LIKE 'sqlite_%'
		ORDER BY name
	`)
	if err != nil {
		return nil, errors.DBError("failed to get table info", err)
	}
	defer rows.Close()

	info.Tables = []string{}
	for rows.Next() {
		var tableName string
		var hasRows int
		if err := rows.Scan(&tableName, &hasRows); err != nil {
			return nil, err
		}
		info.Tables = append(info.Tables, tableName)
	}
	info.TableCount = len(info.Tables)

	return info, nil
}

// DatabaseInfo 数据库信息
type DatabaseInfo struct {
	Version    string
	Size       int64
	TableCount int
	Tables     []string
}

// Stats 统计数据
type Stats struct {
	TotalTargets         int
	TotalScans           int
	RunningScans         int
	TotalVulnerabilities int
	CriticalVulns        int
	HighVulns            int
	MediumVulns          int
	LowVulns             int
}
