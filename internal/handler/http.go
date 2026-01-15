package handler

import (
	"context"
	"time"

	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/svc"
)

// HTTPHandler HTTP 处理器
type HTTPHandler struct {
	service *svc.HTTPService
}

// NewHTTPHandler 创建 HTTP 处理器
func NewHTTPHandler(service *svc.HTTPService) *HTTPHandler {
	return &HTTPHandler{service: service}
}

// GetAllRequests 获取所有 HTTP 请求
func (h *HTTPHandler) GetAllRequests(ctx context.Context) ([]*models.HttpRequest, error) {
	return h.service.GetAllRequests(ctx)
}

// GetRequestByID 根据 ID 获取 HTTP 请求
func (h *HTTPHandler) GetRequestByID(ctx context.Context, id int) (*models.HttpRequest, error) {
	return h.service.GetRequestByID(ctx, id)
}

// CreateRequest 创建 HTTP 请求
func (h *HTTPHandler) CreateRequest(ctx context.Context, name, method, url string, headers map[string]string, body, contentType string, tags []string) (*models.HttpRequest, error) {
	return h.service.CreateRequest(ctx, &svc.CreateHTTPRequest{
		Name:        name,
		Method:      method,
		URL:         url,
		Headers:     headers,
		Body:        body,
		ContentType: contentType,
		Tags:        tags,
	})
}

// UpdateRequest 更新 HTTP 请求
func (h *HTTPHandler) UpdateRequest(ctx context.Context, id int, name, method, url *string, headers map[string]string, body, contentType *string, tags []string) error {
	return h.service.UpdateRequest(ctx, id, &svc.UpdateHTTPRequest{
		Name:        name,
		Method:      method,
		URL:         url,
		Headers:     headers,
		Body:        body,
		ContentType: contentType,
		Tags:        tags,
	})
}

// DeleteRequest 删除 HTTP 请求
func (h *HTTPHandler) DeleteRequest(ctx context.Context, id int) error {
	return h.service.DeleteRequest(ctx, id)
}

// GetResponseByRequestID 根据请求 ID 获取响应
func (h *HTTPHandler) GetResponseByRequestID(ctx context.Context, requestID int) (*models.HttpResponse, error) {
	return h.service.GetResponseByRequestID(ctx, requestID)
}

// SendRequest 发送 HTTP 请求
func (h *HTTPHandler) SendRequest(ctx context.Context, requestID int, timeoutSec int) (*models.HttpResponse, error) {
	timeout := time.Duration(timeoutSec) * time.Second
	if timeout == 0 {
		timeout = 30 * time.Second
	}
	return h.service.SendRequest(ctx, requestID, timeout)
}
