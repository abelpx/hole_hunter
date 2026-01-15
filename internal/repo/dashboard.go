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
