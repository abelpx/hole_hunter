# HoleHunter 构建指南

## 快速开始

```bash
# 1. 克隆项目（包含子模块）
git clone --recurse-submodules https://github.com/abelpx/holehunter.git
cd holehunter

# 2. 构建
# Windows
build-and-package.bat

# macOS/Linux
make prepare-embedded && make build
```

## 开发模式

```bash
npm install
make dev
# 或
wails dev
```

## 生产构建

### 前置要求

```bash
# 初始化子模块（如果克隆时未加 --recurse-submodules）
git submodule update --init --recursive
```

### Windows

```batch
# 一键构建（推荐）
build-and-package.bat

# 或手动构建
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-embedded.ps1
npm install
wails build

# 输出: build\bin\HoleHunter.exe
```

### macOS/Linux

```bash
make prepare-embedded  # 准备嵌入资源
make build              # 构建

# 输出: build/bin/HoleHunter (Linux) 或 build/bin/HoleHunter.app (macOS)
```

## 构建原理

```
准备嵌入资源
    ├── 下载 nuclei 二进制 (v3.6.2, ~127MB)
    ├── 精选 POC 模板 (CVE、常见漏洞等，~2000 个)
    └── 压缩为 poc-templates.zip (~2MB)

嵌入到 exe
    ├── go:embed build/embedded/nuclei
    └── go:embed build/poc-templates.zip

首次运行
    ├── 解压到用户数据目录
    │   ├── Windows: %LOCALAPPDATA%\HoleHunter\
    │   └── macOS/Linux: ~/.config/HoleHunter/
    └── 同步模板到数据库
```

## 故障排查

### POC 数量为 0

**原因**：构建时未准备嵌入资源

**解决**：
```batch
# Windows
powershell -ExecutionPolicy Bypass -File .\scripts\prepare-embedded.ps1
wails build

# macOS/Linux
make prepare-embedded
make build
```

### 构建失败：找不到子模块

**原因**：nuclei-templates 子模块未初始化

**解决**：
```bash
git submodule update --init --recursive
```

### PowerShell 执行策略错误

**错误**：无法加载文件，因为在此系统上禁止运行脚本

**解决**：脚本已使用 `-ExecutionPolicy Bypass`，如果仍报错：
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 模板同步失败

**检查日志**：`%LOCALAPPDATA%\HoleHunter\app.log`

**常见原因**：
- 嵌入资源为空 → 重新构建并确保运行了 prepare-embedded
- 模板目录权限问题 → 检查用户数据目录权限

## 自定义

### 使用完整模板

修改 `build/copy-poc-templates.sh` 或 `scripts/prepare-embedded.ps1`，移除模板数量限制。

### 更新 nuclei 版本

修改 `scripts/download-nuclei.sh` 中的 `NUCLEI_VERSION` 变量。

### 减少 exe 体积

1. 减少 POC 模板数量
2. 不嵌入 nuclei，改为外部资源模式（需修改代码）

## 项目结构

```
HoleHunter/
├── main.go                     # go:embed 指令
├── build/
│   ├── poc-templates.zip      # 生成（嵌入到 exe）
│   └── embedded/nuclei         # 生成（嵌入到 exe）
├── scripts/
│   ├── prepare-embedded.ps1   # Windows 资源准备
│   └── download-nuclei.sh     # nuclei 下载
├── nuclei-templates/          # Git 子模块
└── wails.json                  # Wails 配置
```
