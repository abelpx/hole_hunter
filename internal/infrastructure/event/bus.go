package event

import (
	"context"
	"sync"
)

// Event 事件
type Event struct {
	Type string
	Data interface{}
}

// Handler 事件处理器
type Handler func(ctx context.Context, e Event) error

// Bus 事件总线
type Bus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

// NewBus 创建新的事件总线
func NewBus() *Bus {
	return &Bus{
		handlers: make(map[string][]Handler),
	}
}

// Subscribe 订阅事件
func (b *Bus) Subscribe(eventType string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	// copy-on-write: 创建新的切片避免并发问题
	handlers := make([]Handler, len(b.handlers[eventType])+1)
	copy(handlers, b.handlers[eventType])
	handlers[len(handlers)-1] = handler
	b.handlers[eventType] = handlers
}

// Publish 同步发布事件
func (b *Bus) Publish(ctx context.Context, e Event) error {
	b.mu.RLock()
	handlers := b.handlers[e.Type]
	b.mu.RUnlock()

	for _, handler := range handlers {
		if err := handler(ctx, e); err != nil {
			return err
		}
	}
	return nil
}

// PublishAsync 异步发布事件
func (b *Bus) PublishAsync(ctx context.Context, e Event) {
	go func() {
		_ = b.Publish(ctx, e)
	}()
}

// 事件类型常量
const (
	EventScanStarted   = "scan.started"
	EventScanProgress  = "scan.progress"
	EventScanCompleted = "scan.completed"
	EventScanFailed    = "scan.failed"
	EventScanStopped   = "scan.stopped"
	EventVulnFound     = "vulnerability.found"
	EventTargetCreated = "target.created"
	EventTargetDeleted = "target.deleted"

	// Brute 事件
	EventBruteStarted   = "brute.started"
	EventBruteProgress  = "brute.progress"
	EventBruteCompleted = "brute.completed"
	EventBruteFailed    = "brute.failed"
)
