package errors

import (
	"fmt"
	"regexp"
	"strings"
)

// ErrorCode 错误码类型
type ErrorCode string

const (
	ErrCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrCodeInvalidInput ErrorCode = "INVALID_INPUT"
	ErrCodeInternal     ErrorCode = "INTERNAL_ERROR"
	ErrCodeConflict     ErrorCode = "CONFLICT"
	ErrCodeScanFailed   ErrorCode = "SCAN_FAILED"
	ErrCodeDBError      ErrorCode = "DB_ERROR"
)

// AppError 应用错误
type AppError struct {
	Code    ErrorCode
	Message string
	Cause   error
}

func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Cause
}

// 便捷构造函数

// NotFound 资源未找到
func NotFound(message string) *AppError {
	return &AppError{Code: ErrCodeNotFound, Message: message}
}

// InvalidInput 无效输入
func InvalidInput(message string) *AppError {
	return &AppError{Code: ErrCodeInvalidInput, Message: message}
}

// Internal 内部错误
func Internal(message string, cause error) *AppError {
	return &AppError{Code: ErrCodeInternal, Message: message, Cause: cause}
}

// Conflict 冲突错误
func Conflict(message string) *AppError {
	return &AppError{Code: ErrCodeConflict, Message: message}
}

// ScanFailed 扫描失败
func ScanFailed(message string, cause error) *AppError {
	return &AppError{Code: ErrCodeScanFailed, Message: message, Cause: cause}
}

// DBError 数据库错误
func DBError(message string, cause error) *AppError {
	return &AppError{Code: ErrCodeDBError, Message: message, Cause: cause}
}

// Is 检查错误类型
func Is(err error, code ErrorCode) bool {
	if appErr, ok := err.(*AppError); ok {
		return appErr.Code == code
	}
	return false
}

// Wrap 包装错误
func Wrap(err error, message string) *AppError {
	if err == nil {
		return nil
	}
	if appErr, ok := err.(*AppError); ok {
		return &AppError{
			Code:    appErr.Code,
			Message: message + ": " + appErr.Message,
			Cause:   appErr,
		}
	}
	return Internal(message, err)
}

// SanitizeUserError 脱敏用户可见的错误信息
// 移除可能包含敏感信息的路径、IP地址等
func SanitizeUserError(err error) string {
	if err == nil {
		return ""
	}

	errMsg := err.Error()

	// 移除文件路径（跨平台）
	pathPattern := regexp.MustCompile(`[a-zA-Z]:\\[^\s:]+|[a-zA-Z]:/[^\s:]+|/[^\s:]+/[^\s]+`)
	errMsg = pathPattern.ReplaceAllString(errMsg, "[path]")

	// 移除IP地址
	ipPattern := regexp.MustCompile(`\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`)
	errMsg = ipPattern.ReplaceAllString(errMsg, "[ip]")

	// 移除可能的密码、token等
	errMsg = regexp.MustCompile(`(password|token|secret|key|auth)=["\'][^"\']*["\']`).ReplaceAllString(errMsg, "$1=[redacted]")

	// 限制长度
	if len(errMsg) > 200 {
		errMsg = errMsg[:200] + "..."
	}

	return strings.TrimSpace(errMsg)
}
