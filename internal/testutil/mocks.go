package testutil

import (
	"context"
	"database/sql"
	"errors"

	"github.com/holehunter/holehunter/internal/infrastructure/event"
	"github.com/holehunter/holehunter/internal/infrastructure/logger"
)

// MockEventBus 模拟事件总线
type MockEventBus struct {
	PublishFunc      func(ctx context.Context, evt event.Event) error
	SubscribeFunc    func(eventType string, handler event.Handler) error
	PublishAsyncFunc func(ctx context.Context, evt event.Event)
	events           []event.Event
}

func (m *MockEventBus) Publish(ctx context.Context, evt event.Event) error {
	m.events = append(m.events, evt)
	if m.PublishFunc != nil {
		return m.PublishFunc(ctx, evt)
	}
	return nil
}

func (m *MockEventBus) Subscribe(eventType string, handler event.Handler) error {
	if m.SubscribeFunc != nil {
		return m.SubscribeFunc(eventType, handler)
	}
	return nil
}

func (m *MockEventBus) PublishAsync(ctx context.Context, evt event.Event) {
	m.events = append(m.events, evt)
	if m.PublishAsyncFunc != nil {
		m.PublishAsyncFunc(ctx, evt)
	}
}

func (m *MockEventBus) GetEvents() []event.Event {
	return m.events
}

func (m *MockEventBus) Clear() {
	m.events = nil
}

// MockNucleiClient 模拟 Nuclei 客户端接口
// 注意：这里只模拟接口方法，实际返回类型可能需要根据 scanner 包调整
type MockNucleiClient struct {
	IsAvailableFunc func() bool
	GetVersionFunc  func() string
	GetBinaryFunc   func() string
}

func (m *MockNucleiClient) IsAvailable() bool {
	if m.IsAvailableFunc != nil {
		return m.IsAvailableFunc()
	}
	return true
}

func (m *MockNucleiClient) GetVersion() string {
	if m.GetVersionFunc != nil {
		return m.GetVersionFunc()
	}
	return "v3.6.2"
}

func (m *MockNucleiClient) GetBinary() string {
	if m.GetBinaryFunc != nil {
		return m.GetBinaryFunc()
	}
	return "/usr/local/bin/nuclei"
}

// NewMockLogger 创建模拟日志记录器
func NewMockLogger() *logger.Logger {
	return logger.New("info", "")
}

// MockDB 模拟数据库连接
type MockDB struct {
	OpenFunc     func(path string) (*sql.DB, error)
	CloseFunc    func() error
	ExecFunc     func(query string, args ...interface{}) (sql.Result, error)
	QueryFunc    func(query string, args ...interface{}) (*sql.Rows, error)
	QueryRowFunc func(query string, args ...interface{}) *sql.Row
}

func (m *MockDB) Open(path string) (*sql.DB, error) {
	if m.OpenFunc != nil {
		return m.OpenFunc(path)
	}
	return nil, errors.New("not implemented")
}

func (m *MockDB) Close() error {
	if m.CloseFunc != nil {
		return m.CloseFunc()
	}
	return nil
}

func (m *MockDB) Exec(query string, args ...interface{}) (sql.Result, error) {
	if m.ExecFunc != nil {
		return m.ExecFunc(query, args...)
	}
	return nil, errors.New("not implemented")
}

func (m *MockDB) Query(query string, args ...interface{}) (*sql.Rows, error) {
	if m.QueryFunc != nil {
		return m.QueryFunc(query, args...)
	}
	return nil, errors.New("not implemented")
}

func (m *MockDB) QueryRow(query string, args ...interface{}) *sql.Row {
	if m.QueryRowFunc != nil {
		return m.QueryRowFunc(query, args...)
	}
	return nil
}
