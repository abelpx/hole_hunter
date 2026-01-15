package utils

// PtrString 返回字符串指针的辅助函数
func PtrString(s string) *string {
	return &s
}

// DerefString 安全地解引用字符串指针，如果为 nil 则返回空字符串
func DerefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// DerefInt 安全地解引用 int 指针，如果为 nil 则返回 0
func DerefInt(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}

// DerefBool 安全地解引用 bool 指针，如果为 nil 则返回 false
func DerefBool(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}
