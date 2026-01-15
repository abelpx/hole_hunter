package svc

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

// DashboardService 仪表板服务
type DashboardService struct {
	repo *repo.DashboardRepository
}

// NewDashboardService 创建仪表板服务
func NewDashboardService(repo *repo.DashboardRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

// GetStats 获取统计数据
func (s *DashboardService) GetStats(ctx context.Context) (*models.DashboardStats, error) {
	stats, err := s.repo.GetStats(ctx)
	if err != nil {
		return nil, err
	}

	return &models.DashboardStats{
		TotalTargets:         stats.TotalTargets,
		TotalScans:           stats.TotalScans,
		RunningScans:         stats.RunningScans,
		TotalVulnerabilities: stats.TotalVulnerabilities,
		CriticalVulns:        stats.CriticalVulns,
		HighVulns:            stats.HighVulns,
		MediumVulns:          stats.MediumVulns,
		LowVulns:             stats.LowVulns,
	}, nil
}
