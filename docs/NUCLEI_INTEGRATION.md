# Nuclei 集成方案

## 概述

HoleHunter 桌面应用集成了 Nuclei 漏洞扫描器，支持多种部署方式：

1. **自动模式**：应用启动时自动查找或安装 nuclei
2. **开发模式**：使用系统安装的 nuclei
3. **生产模式**：从 `build/binaries/` 目录复制 nuclei 到用户数据目录

## 架构设计

### 核心组件

- `internal/nuclei/embed.go`: nuclei 二进制文件管理
- `app.go`: 应用启动时初始化 nuclei
- `scripts/download-nuclei.sh`: nuclei 下载脚本

### 工作流程

```
应用启动
    ↓
initNuclei()
    ↓
┌─────────────────────────────┐
│ 1. 检查用户数据目录         │
│    ~/.holehunter/nuclei     │
└─────────────────────────────┘
    ↓ 已存在
    ✓ 返回路径
    ↓ 不存在
┌─────────────────────────────┐
│ 2. 尝试从 build/binaries/   │
│    复制到用户数据目录       │
└─────────────────────────────┘
    ↓ 成功
    ✓ 返回路径
    ↓ 失败
┌─────────────────────────────┐
│ 3. 查找系统安装的 nuclei    │
│    - /usr/local/bin/nuclei  │
│    - ~/go/bin/nuclei        │
│    - 其他常见路径           │
└─────────────────────────────┘
    ↓ 找到
    ✓ 返回路径
    ↓ 未找到
    ✗ 扫描功能禁用
```

## 使用方法

### 1. 下载 Nuclei 二进制文件

```bash
# 使用 Makefile 命令下载
make nuclei-download

# 或直接运行脚本
./scripts/download-nuclei.sh
```

这将下载 nuclei 到 `build/binaries/nuclei`。

### 2. 构建应用

```bash
# 开发模式（使用系统 nuclei）
make dev

# 生产构建
make build
```

### 3. 运行应用

应用启动时会自动处理 nuclei：

1. **首次运行**: 从 `build/binaries/` 复制 nuclei 到 `~/.holehunter/`
2. **后续运行**: 直接使用已安装的 nuclei

## 状态查询

应用提供了 nuclei 状态查询功能：

```go
type NucleiStatus struct {
    Available bool   // 是否可用
    Version   string // 版本号
    Path      string // 路径
    Embedded  bool   // 是否为嵌入版本
    Platform  string // 平台信息
    Installed bool   // 是否已安装
}
```

前端可通过以下方式获取状态：

```typescript
import { GetNucleiStatus } from '../../wailsjs/go/main/App';

const status = await GetNucleiStatus();
console.log(status);
```

## 版本管理

当前集成版本: **v3.3.5**

### 更新 nuclei 版本

1. 修改 `scripts/download-nuclei.sh` 中的 `NUCLEI_VERSION` 变量
2. 运行 `make nuclei-download` 下载新版本
3. 重新构建应用

## 文件结构

```
holehunter/
├── internal/nuclei/
│   └── embed.go           # nuclei 管理
├── scripts/
│   └── download-nuclei.sh # 下载脚本
├── build/binaries/
│   └── nuclei            # 下载的 nuclei 二进制
├── app.go                 # 应用入口
└── Makefile               # 构建配置
```

## 优势

1. **零配置**: 用户无需手动安装 nuclei
2. **自动回退**: 如果内置版本不可用，自动使用系统版本
3. **跨平台**: 支持 macOS、Linux、Windows
4. **版本固定**: 使用固定版本确保稳定性
5. **易于更新**: 通过修改脚本即可更新版本

## 故障排查

### 问题: 扫描功能不可用

**原因**: nuclei 二进制文件未找到

**解决方案**:

1. 检查 nuclei 状态:
   ```bash
   # 查看应用日志
   tail -f ~/Library/Logs/holehunter.log
   ```

2. 手动下载 nuclei:
   ```bash
   make nuclei-download
   ```

3. 安装系统 nuclei:
   ```bash
   go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
   ```

### 问题: 扫描进度不更新

**原因**: nuclei 进程未正常启动

**解决方案**:

1. 检查 nuclei 版本兼容性
2. 查看应用控制台日志
3. 确认目标 URL 可访问

## 开发指南

### 添加新的 nuclei 选项

在 `app.go` 的 `buildNucleiArgs` 函数中添加新的命令行参数：

```go
func (a *App) buildNucleiArgs(targetURL, strategy string, templates []string) []string {
    args := []string{
        "-u", targetURL,
        "-json",
        "-silent",
    }

    // 添加新选项
    if someOption {
        args = append(args, "-new-option", value)
    }

    return args
}
```

### 自定义 nuclei 模板

将自定义模板放置在 `~/.holehunter/templates/` 目录，应用会自动识别。

## 许可证

Nuclei 由 ProjectDiscovery 开发，遵循 MIT 许可证。
https://github.com/projectdiscovery/nuclei
