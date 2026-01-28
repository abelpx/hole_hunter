//go:build windows

package scanner

import (
	"os/exec"
	"syscall"
)

// initProcessCmd 设置 Windows 特定的进程属性
func initProcessCmd(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: 0x08000000, // CREATE_NO_WINDOW
	}
}
