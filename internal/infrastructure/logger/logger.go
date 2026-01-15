package logger

import (
	"fmt"
	"io"
	"log"
	"os"
	"sync"
)

// LogLevel 日志级别
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

var (
	levelNames = map[LogLevel]string{
		DEBUG: "DEBUG",
		INFO:  "INFO",
		WARN:  "WARN",
		ERROR: "ERROR",
	}
)

// Logger 日志记录器
type Logger struct {
	mu      sync.Mutex
	level   LogLevel
	logger  *log.Logger
	file    *os.File
	output  io.Writer
	useFile bool
}

// New 创建新的日志记录器
func New(levelStr string, logFile string) *Logger {
	level := parseLevel(levelStr)

	l := &Logger{
		level:  level,
		output: os.Stdout,
	}

	// 如果指定了日志文件，尝试打开
	if logFile != "" {
		file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			l.file = file
			l.useFile = true
			l.output = io.MultiWriter(os.Stdout, file)
		}
	}

	l.logger = log.New(l.output, "", log.LstdFlags)
	return l
}

func parseLevel(levelStr string) LogLevel {
	switch levelStr {
	case "DEBUG", "debug":
		return DEBUG
	case "INFO", "info":
		return INFO
	case "WARN", "warn":
		return WARN
	case "ERROR", "error":
		return ERROR
	default:
		return INFO
	}
}

// Debug 记录 DEBUG 日志
func (l *Logger) Debug(format string, args ...interface{}) {
	l.log(DEBUG, format, args...)
}

// Info 记录 INFO 日志
func (l *Logger) Info(format string, args ...interface{}) {
	l.log(INFO, format, args...)
}

// Warn 记录 WARN 日志
func (l *Logger) Warn(format string, args ...interface{}) {
	l.log(WARN, format, args...)
}

// Error 记录 ERROR 日志
func (l *Logger) Error(format string, args ...interface{}) {
	l.log(ERROR, format, args...)
}

func (l *Logger) log(level LogLevel, format string, args ...interface{}) {
	if level < l.level {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	msg := fmt.Sprintf("[%s] %s", levelNames[level], fmt.Sprintf(format, args...))
	l.logger.Println(msg)
}

// Close 关闭日志记录器
func (l *Logger) Close() error {
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

// 全局日志记录器
var std = New("info", "")

// SetLevel 设置全局日志级别
func SetLevel(level LogLevel) {
	std.mu.Lock()
	defer std.mu.Unlock()
	std.level = level
}

// Debug 记录 DEBUG 日志（全局）
func Debug(format string, args ...interface{}) {
	std.Debug(format, args...)
}

// Info 记录 INFO 日志（全局）
func Info(format string, args ...interface{}) {
	std.Info(format, args...)
}

// Warn 记录 WARN 日志（全局）
func Warn(format string, args ...interface{}) {
	std.Warn(format, args...)
}

// Error 记录 ERROR 日志（全局）
func Error(format string, args ...interface{}) {
	std.Error(format, args...)
}
