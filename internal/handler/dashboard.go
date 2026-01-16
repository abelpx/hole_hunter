package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// DashboardHandler 仪表板处理器
type DashboardHandler struct {
	service *svc.DashboardService
}

// NewDashboardHandler 创建仪表板处理器
func NewDashboardHandler(service *svc.DashboardService) *DashboardHandler {
	return &DashboardHandler{service: service}
}

// GetStats 获取统计数据
func (h *DashboardHandler) GetStats(ctx context.Context) (*models.DashboardStats, error) {
	return h.service.GetStats(ctx)
}

// HealthCheck 健康检查
func (h *DashboardHandler) HealthCheck(ctx context.Context) error {
	return h.service.HealthCheck(ctx)
}

// GetDatabaseInfo 获取数据库信息
func (h *DashboardHandler) GetDatabaseInfo(ctx context.Context) (map[string]interface{}, error) {
	return h.service.GetDatabaseInfo(ctx)
}
