package handler

import (
	"context"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// ReportHandler 报告处理器
type ReportHandler struct {
	service *svc.ReportService
}

// NewReportHandler 创建报告处理器
func NewReportHandler(service *svc.ReportService) *ReportHandler {
	return &ReportHandler{service: service}
}

// GetAll 获取所有报告
func (h *ReportHandler) GetAll(ctx context.Context) ([]*models.Report, error) {
	return h.service.GetAll(ctx)
}

// GetByID 根据 ID 获取报告
func (h *ReportHandler) GetByID(ctx context.Context, id int) (*models.Report, error) {
	return h.service.GetByID(ctx, id)
}

// GetByScanID 根据扫描 ID 获取报告
func (h *ReportHandler) GetByScanID(ctx context.Context, scanID int) ([]*models.Report, error) {
	return h.service.GetByScanID(ctx, scanID)
}

// Create 创建报告
func (h *ReportHandler) Create(ctx context.Context, name string, scanID int, reportType, format string) (int, error) {
	return h.service.Create(ctx, name, scanID, reportType, format)
}

// Generate 生成报告
func (h *ReportHandler) Generate(ctx context.Context, id int) error {
	return h.service.Generate(ctx, id)
}

// Export 导出报告
func (h *ReportHandler) Export(ctx context.Context, id int, format string) (string, error) {
	return h.service.Export(ctx, id, format)
}

// Delete 删除报告
func (h *ReportHandler) Delete(ctx context.Context, id int) error {
	return h.service.Delete(ctx, id)
}
