package migrations

// Registry 迁移注册表，自动发现所有迁移
var All []Migration

// Register 注册迁移（在 init() 中调用）
func Register(m Migration) {
	All = append(All, m)
}
