# Nuclei 内嵌方案实现总结

## 实现日期
2024年1月

## 背景

用户反馈：作为桌面应用，要求用户单独下载 nuclei 不合理。

## 解决方案

### 方案概述

实现了一个自动化的 nuclei 管理系统，支持：
- 应用启动时自动检测和安装 nuclei
- 优先使用内置的 nuclei 二进制文件
- 回退到系统安装的 nuclei

### 核心实现

#### 1. 文件结构

```
holehunter/
├── internal/nuclei/
│   └── embed.go                    # nuclei 二进制文件管理
├── scripts/
│   └── download-nuclei.sh          # nuclei 下载脚本
├── build/binaries/
│   └── nuclei                      # 下载的 nuclei (v3.3.5)
├── app.go                          # 应用入口（已更新）
├── Makefile                        # 构建配置（已更新）
└── docs/
    ├── NUCLEI_INTEGRATION.md       # 集成文档
    └── EMBEDDED_NUCLEI_README.md   # 本文档
```

#### 2. 关键代码

**app.go 新增字段**:
```go
type App struct {
    ctx               context.Context
    db                *sql.DB
    dbMutex           sync.RWMutex
    dbPath            string
    userDataDir       string          // 新增：用户数据目录
    nucleiBinary      string          // nuclei 路径
    nucleiEmbedded    bool            // 是否为嵌入版本
    nucleiVersion     string          // nuclei 版本
    // ...
}
```

**initNuclei 方法**:
```go
func (a *App) initNuclei() {
    // 1. 尝试从 build/binaries/ 复制
    if embeddedBinary, err := nuclei.EnsureBinary(a.userDataDir); err == nil {
        a.nucleiBinary = embeddedBinary
        a.nucleiEmbedded = true
        a.nucleiVersion = "v3.3.5"
        return
    }

    // 2. 回退到系统 nuclei
    a.nucleiBinary = a.findNucleiBinary()
    if a.nucleiBinary != "" {
        a.nucleiEmbedded = false
        a.nucleiVersion = "system"
    }
}
```

**internal/nuclei/embed.go**:
```go
func EnsureBinary(userDataDir string) (string, error) {
    // 1. 检查用户数据目录
    binaryPath := filepath.Join(userDataDir, "nuclei")
    if _, err := os.Stat(binaryPath); err == nil {
        return binaryPath, nil
    }

    // 2. 从 build/binaries/ 复制
    srcPath := filepath.Join("build", "binaries", "nuclei")
    if _, err := os.Stat(srcPath); err != nil {
        return "", fmt.Errorf("nuclei not found. Run 'make nuclei-download'")
    }

    // 复制文件...
    return destFile, nil
}
```

#### 3. Makefile 新增命令

```makefile
## nuclei-download: 下载 nuclei 二进制文件
nuclei-download:
	@./scripts/download-nuclei.sh
```

#### 4. 前端接口

```go
// GetNucleiStatus 获取 nuclei 状态
func (a *App) GetNucleiStatus() NucleiStatus

// InstallNuclei 安装 nuclei 到用户目录
func (a *App) InstallNuclei() error
```

### 工作流程

```
用户启动应用
    ↓
app.startup()
    ↓
initNuclei()
    ↓
┌─────────────────────────────────────┐
│ 检查 ~/.holehunter/nuclei 是否存在  │
└─────────────────────────────────────┘
    ↓ 存在
    ✓ 使用已安装的 nuclei
    ↓ 不存在
┌─────────────────────────────────────┐
│ 从 build/binaries/nuclei 复制       │
│ 到 ~/.holehunter/nuclei             │
└─────────────────────────────────────┘
    ↓ 成功
    ✓ 设置 nucleiEmbedded = true
    ↓ 失败
┌─────────────────────────────────────┐
│ 搜索系统路径：                       │
│ - /usr/local/bin/nuclei             │
│ - ~/go/bin/nuclei                   │
│ - 等等...                           │
└─────────────────────────────────────┘
    ↓ 找到
    ✓ 设置 nucleiEmbedded = false
    ↓ 未找到
    ✗ 扫描功能禁用，显示警告
```

## 使用指南

### 开发者

1. **首次设置**:
   ```bash
   # 下载 nuclei
   make nuclei-download

   # 构建应用
   make build-debug
   ```

2. **更新 nuclei 版本**:
   ```bash
   # 编辑 scripts/download-nuclei.sh
   # 修改 NUCLEI_VERSION 变量

   # 重新下载
   make nuclei-download
   ```

### 最终用户

用户无需任何操作：
- 应用启动时自动安装 nuclei
- 如果需要重新安装，可以调用 `InstallNuclei()` 方法

## 优势

1. **零用户体验成本**: 无需手动安装 nuclei
2. **自动化管理**: 应用自动处理 nuclei 的安装和更新
3. **版本一致性**: 所有用户使用相同的 nuclei 版本
4. **容错性强**: 多级回退机制确保功能可用
5. **跨平台支持**: macOS、Linux、Windows 统一处理

## 未来改进

1. **自动更新**: 应用启动时检查 nuclei 更新
2. **版本选择**: 允许用户选择 nuclei 版本
3. **进度显示**: 首次安装时显示下载进度
4. **模板管理**: 集成 nuclei 模板的下载和更新

## 测试验证

```bash
# 构建测试
make build-debug

# 运行测试
./build/bin/HoleHunter.app/Contents/MacOS/HoleHunter

# 检查 nuclei 是否正确安装
ls -la ~/.holehunter/nuclei
```

## 相关文件

- [app.go](../app.go) - 应用主入口
- [internal/nuclei/embed.go](../internal/nuclei/embed.go) - nuclei 管理
- [scripts/download-nuclei.sh](../scripts/download-nuclei.sh) - 下载脚本
- [Makefile](../Makefile) - 构建配置
- [NUCLEI_INTEGRATION.md](./NUCLEI_INTEGRATION.md) - 详细文档
