# HoleHunter 构建指南

## 概述

HoleHunter 采用**资源嵌入**方案：
- **HoleHunter.exe** - 主程序（包含嵌入的 nuclei 和 POC 模板）
- 首次运行时自动解压资源到用户数据目录
- 支持所有平台（Windows、macOS、Linux）

## 开发环境

```bash
# 1. 克隆项目（包含子模块）
git clone --recurse-submodules https://github.com/yourusername/holehunter.git
cd holehunter

# 2. 安装依赖
npm install

# 3. 启动开发模式
make dev
# 或
wails dev
```

## 生产构建

### 前置要求

所有平台都需要先初始化子模块：
```bash
git submodule update --init --recursive
```

### Windows

#### 方式一：一键构建（推荐）

```batch
# 自动完成所有步骤
build-and-package.bat
```

#### 方式二：手动构建

```powershell
# 1. 准备嵌入资源（下载 nuclei + 构建模板 zip）
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-embedded.ps1

# 2. 安装前端依赖
npm install

# 3. 构建
wails build

# 4. 输出
# build\bin\HoleHunter.exe (约 150-200MB，包含所有资源)
```

### macOS/Linux

```bash
# 1. 准备嵌入资源
make prepare-embedded

# 2. 安装依赖
make deps

# 3. 构建
make build

# 4. 输出
# macOS: build/bin/HoleHunter.app
# Linux: build/bin/HoleHunter
```

## 嵌入资源说明

### 资源内容

**nuclei 二进制**：
- Windows: `nuclei.exe` (~127MB)
- macOS/Linux: `nuclei` (~100MB)
- 版本: v3.6.2

**POC 模板**：
- 精选核心模板（约 2000+ 个 YAML 文件）
- 压缩后约 2-3MB
- 包含：
  - CVE 模板（2023-2024）
  - 常见漏洞（SQL注入、XSS、RCE、SSRF 等）
  - 暴露面板
  - 技术栈检测
  - 配置错误
  - 信息泄露

### 资源准备脚本

| 平台 | 脚本 | 功能 |
|------|------|------|
| Windows | `scripts/prepare-embedded.ps1` | 下载 nuclei，构建模板 zip |
| macOS/Linux | `make prepare-embedded` | 同上（bash 脚本） |

## 首次运行流程

```
用户启动 HoleHunter.exe
    ↓
检查嵌入资源
    ↓
解压到 %LOCALAPPDATA%\HoleHunter\
    ├── nuclei.exe
    └── nuclei-templates/
    ↓
同步模板到数据库
    ↓
应用就绪
```

## 文件结构

```
HoleHunter/
├── main.go                        # Go 入口（嵌入资源指令）
├── build/
│   ├── poc-templates.zip         # 模板压缩包（生成）
│   └── embedded/
│       └── nuclei                # nuclei 二进制（生成）
├── scripts/
│   ├── prepare-embedded.ps1      # Windows 资源准备
│   └── download-nuclei.sh        # nuclei 下载
├── nuclei-templates/             # Git 子模块（完整模板）
└── wails.json                     # Wails 配置
```

## 常见问题

### Q: 为什么 POC 数量为 0？

A: 构建时没有准备嵌入资源。确保在 `wails build` 之前运行：
- Windows: `scripts/prepare-embedded.ps1`
- macOS/Linux: `make prepare-embedded`

### Q: 如何使用完整模板而不是精选模板？

A: 修改 `build/copy-poc-templates.sh`（或 PowerShell 版本），复制更多模板。

### Q: 如何更新 nuclei 版本？

A: 修改 `scripts/download-nuclei.sh` 中的 `NUCLEI_VERSION` 变量。

### Q: 如何减少 exe 体积？

A:
1. 只使用最小模板集
2. 移除 nuclei 嵌入，改为外部资源模式
3. 使用 UPX 压缩（可能触发杀软误报）

## 更新日志

### 2025-01-29
- 切换到资源嵌入方案
- 添加 Windows PowerShell 构建脚本
- 修复场景功能未启用的问题

### 旧版本文档
- 参考 `docs/BUILD.md` 查看外部资源模式的构建方式
