package event

import (
	"context"

	"github.com/holehunter/holehunter/internal/infrastructure/logger"
)

// EventHandler 事件处理器接口
type EventHandler interface {
	HandleEventVulnFound(ctx context.Context, data map[string]interface{}) error
}

// EventHandlerImpl 事件处理器实现
type EventHandlerImpl struct {
	vulnSvc VulnService
	logger  *logger.Logger
}

// VulnService 漏洞服务接口（避免循环依赖）
type VulnService interface {
	HandleEventVulnFound(ctx context.Context, data map[string]interface{}) error
}

// NewEventHandler 创建事件处理器
func NewEventHandler(vulnSvc VulnService, logger *logger.Logger) *EventHandlerImpl {
	return &EventHandlerImpl{
		vulnSvc: vulnSvc,
		logger:  logger,
	}
}

// HandleEventVulnFound 处理漏洞发现事件
func (h *EventHandlerImpl) HandleEventVulnFound(ctx context.Context, data map[string]interface{}) error {
	if err := h.vulnSvc.HandleEventVulnFound(ctx, data); err != nil {
		h.logger.Error("Failed to handle vuln found: %v", err)
		return err
	}
	return nil
}
