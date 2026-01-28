//go:build !windows

package scanner

import (
	"os/exec"
)

// initProcessCmd Unix 平台的进程初始化（空实现）
func initProcessCmd(cmd *exec.Cmd) {
	// Unix 平台不需要特殊处理
}
