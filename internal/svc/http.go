package svc

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	nethttp "net/http"
	neturl "net/url"
	"strings"
	"time"

	"github.com/holehunter/holehunter/internal/infrastructure/errors"
	"github.com/holehunter/holehunter/internal/models"
	"github.com/holehunter/holehunter/internal/repo"
)

const (
	maxResponseBodySize = 10 * 1024 * 1024 // 10MB
)

// 允许的HTTP方法
var allowedMethods = map[string]bool{
	"GET":     true,
	"POST":    true,
	"PUT":     true,
	"DELETE":  true,
	"PATCH":   true,
	"HEAD":    true,
	"OPTIONS": true,
}

// 私有IP地址范围
var privateIPBlocks = []string{
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"127.0.0.0/8",
	"169.254.0.0/16",
}

// isValidURL 验证URL是否安全
func isValidURL(urlStr string) bool {
	u, err := neturl.Parse(urlStr)
	if err != nil {
		return false
	}

	// 只允许http和https协议
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	// 检查主机名是否为内网地址
	host := u.Hostname()
	if isPrivateIP(host) {
		return false
	}

	return true
}

// isPrivateIP 检查是否为私有IP地址
func isPrivateIP(host string) bool {
	// 解析端口号
	hostname, _, err := net.SplitHostPort(host)
	if err != nil {
		hostname = host
	}

	// 检查IP地址
	ip := net.ParseIP(hostname)
	if ip == nil {
		// 如果不是IP地址，可能是域名，这里简单检查localhost
		if strings.Contains(strings.ToLower(hostname), "localhost") {
			return true
		}
		return false
	}

	for _, block := range privateIPBlocks {
		_, ipNet, _ := net.ParseCIDR(block)
		if ipNet != nil && ipNet.Contains(ip) {
			return true
		}
	}

	return false
}

// HTTPService HTTP 请求服务
type HTTPService struct {
	requestRepo  *repo.HTTPRequestRepository
	responseRepo *repo.HTTPResponseRepository
}

// NewHTTPService 创建 HTTP 请求服务
func NewHTTPService(requestRepo *repo.HTTPRequestRepository, responseRepo *repo.HTTPResponseRepository) *HTTPService {
	return &HTTPService{
		requestRepo:  requestRepo,
		responseRepo: responseRepo,
	}
}

// GetAllRequests 获取所有 HTTP 请求
func (s *HTTPService) GetAllRequests(ctx context.Context) ([]*models.HttpRequest, error) {
	return s.requestRepo.GetAll(ctx)
}

// GetRequestByID 根据 ID 获取 HTTP 请求
func (s *HTTPService) GetRequestByID(ctx context.Context, id int) (*models.HttpRequest, error) {
	if id <= 0 {
		return nil, errors.InvalidInput("invalid request id")
	}
	return s.requestRepo.GetByID(ctx, id)
}

// CreateRequest 创建 HTTP 请求
func (s *HTTPService) CreateRequest(ctx context.Context, req *CreateHTTPRequest) (*models.HttpRequest, error) {
	if req.Method == "" {
		return nil, errors.InvalidInput("method is required")
	}
	if req.URL == "" {
		return nil, errors.InvalidInput("url is required")
	}

	request := &models.HttpRequest{
		Name:        req.Name,
		Method:      req.Method,
		URL:         req.URL,
		Headers:     req.Headers,
		Body:        req.Body,
		ContentType: req.ContentType,
		Tags:        req.Tags,
	}

	if err := s.requestRepo.Create(ctx, request); err != nil {
		return nil, errors.Wrap(err, "failed to create http request")
	}

	return request, nil
}

// UpdateRequest 更新 HTTP 请求
func (s *HTTPService) UpdateRequest(ctx context.Context, id int, req *UpdateHTTPRequest) error {
	if id <= 0 {
		return errors.InvalidInput("invalid request id")
	}

	existing, err := s.requestRepo.GetByID(ctx, id)
	if err != nil {
		return errors.Wrap(err, "failed to get http request")
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Method != nil {
		existing.Method = *req.Method
	}
	if req.URL != nil {
		existing.URL = *req.URL
	}
	if req.Headers != nil {
		existing.Headers = req.Headers
	}
	if req.Body != nil {
		existing.Body = *req.Body
	}
	if req.ContentType != nil {
		existing.ContentType = *req.ContentType
	}
	if req.Tags != nil {
		existing.Tags = req.Tags
	}

	if err := s.requestRepo.Update(ctx, existing); err != nil {
		return errors.Wrap(err, "failed to update http request")
	}
	return nil
}

// DeleteRequest 删除 HTTP 请求
func (s *HTTPService) DeleteRequest(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.InvalidInput("invalid request id")
	}
	return s.requestRepo.Delete(ctx, id)
}

// CreateResponse 创建 HTTP 响应
func (s *HTTPService) CreateResponse(ctx context.Context, resp *models.HttpResponse) error {
	if err := s.responseRepo.Create(ctx, resp); err != nil {
		return errors.Wrap(err, "failed to create http response")
	}
	return nil
}

// GetResponseByRequestID 根据请求 ID 获取响应
func (s *HTTPService) GetResponseByRequestID(ctx context.Context, requestID int) (*models.HttpResponse, error) {
	if requestID <= 0 {
		return nil, errors.InvalidInput("invalid request id")
	}
	resp, err := s.responseRepo.GetByRequestID(ctx, requestID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get http response")
	}
	return resp, nil
}

// SendRequest 发送 HTTP 请求
func (s *HTTPService) SendRequest(ctx context.Context, requestID int, timeout time.Duration) (*models.HttpResponse, error) {
	if requestID <= 0 {
		return nil, errors.InvalidInput("invalid request id")
	}

	// 获取请求配置
	request, err := s.requestRepo.GetByID(ctx, requestID)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get http request")
	}

	// 验证HTTP方法
	if !allowedMethods[request.Method] {
		return nil, errors.InvalidInput(fmt.Sprintf("invalid http method: %s", request.Method))
	}

	// 验证URL安全性
	if !isValidURL(request.URL) {
		return nil, errors.InvalidInput(fmt.Sprintf("invalid or unsafe url: %s", request.URL))
	}

	// 创建 HTTP 客户端
	client := &nethttp.Client{
		Timeout: timeout,
		// 禁止自动跟随重定向
		CheckRedirect: func(req *nethttp.Request, via []*nethttp.Request) error {
			return nethttp.ErrUseLastResponse
		},
	}

	// 构建请求体
	var bodyReader io.Reader
	if request.Body != "" {
		bodyReader = bytes.NewReader([]byte(request.Body))
	}

	// 创建 HTTP 请求
	req, err := nethttp.NewRequestWithContext(ctx, request.Method, request.URL, bodyReader)
	if err != nil {
		return nil, errors.Wrap(err, "failed to create http request")
	}

	// 设置请求头
	for key, value := range request.Headers {
		req.Header.Set(key, value)
	}
	if request.ContentType != "" {
		req.Header.Set("Content-Type", request.ContentType)
	}

	// 记录开始时间
	startTime := time.Now()

	// 发送请求
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.Wrap(err, "failed to send http request")
	}
	defer resp.Body.Close()

	// 计算耗时
	duration := time.Since(startTime)

	// 读取响应体（限制大小防止内存溢出）
	limitedReader := io.LimitReader(resp.Body, maxResponseBodySize)
	responseBody, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read response body")
	}

	// 检查是否达到大小限制
	if int64(len(responseBody)) >= maxResponseBodySize {
		return nil, errors.InvalidInput("response body exceeds maximum size")
	}

	// 构建响应头
	responseHeaders := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			responseHeaders[key] = values[0]
		}
	}

	// 创建响应记录
	response := &models.HttpResponse{
		RequestID:   requestID,
		StatusCode:  resp.StatusCode,
		StatusText:  resp.Status,
		Headers:     responseHeaders,
		Body:        string(responseBody),
		BodySize:    len(responseBody),
		HeaderSize:  0, // 不再计算，字段保留用于兼容
		Duration:    int(duration.Milliseconds()),
		Timestamp:   startTime.Format(time.RFC3339),
	}

	// 保存响应到数据库
	if err := s.responseRepo.Create(ctx, response); err != nil {
		return nil, errors.Wrap(err, "failed to save response")
	}

	return response, nil
}

// CreateHTTPRequest 创建 HTTP 请求
type CreateHTTPRequest struct {
	Name        string            `json:"name"`
	Method      string            `json:"method"`
	URL         string            `json:"url"`
	Headers     map[string]string `json:"headers"`
	Body        string            `json:"body"`
	ContentType string            `json:"content_type"`
	Tags        []string          `json:"tags"`
}

// UpdateHTTPRequest 更新 HTTP 请求
type UpdateHTTPRequest struct {
	Name        *string            `json:"name,omitempty"`
	Method      *string            `json:"method,omitempty"`
	URL         *string            `json:"url,omitempty"`
	Headers     map[string]string  `json:"headers,omitempty"`
	Body        *string            `json:"body,omitempty"`
	ContentType *string            `json:"content_type,omitempty"`
	Tags        []string           `json:"tags,omitempty"`
}
