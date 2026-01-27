# HoleHunter 构建和打包指南

## 概述

HoleHunter 由以下组件组成：
- **HoleHunter.exe** - 主程序（Wails 应用）
- **nuclei.exe** - 扫描引擎（127MB）
- **nuclei-templates/** - 漏洞模板（约 12000+ 个 YAML 文件）

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发模式（自动使用 build/bin 下的资源）
wails dev
```

## 生产构建

### Windows

```powershell
# 1. 构建
wails build

# 2. 运行打包脚本（自动复制资源）
.\build\copy-binaries.ps1

# 3. 输出目录
build\bin\
├── HoleHunter.exe
├── nuclei.exe
└── nuclei-templates/
```

### Linux/macOS

```bash
# 1. 构建
wails build

# 2. 运行打包脚本
chmod +x ./build/copy-binaries.sh
./build/copy-binaries.sh

# 3. 输出目录
build/bin/
├── HoleHunter
├── nuclei
└── nuclei-templates/
```

## 分发

### 方式 1：直接分发（推荐）

将整个输出目录打包成 zip：
```powershell
# Windows
Compress-Archive -Path build\bin\* -DestinationPath HoleHunter-Windows.zip

# 或手动打包 build/bin/ 目录
```

用户解压后直接运行 `HoleHunter.exe` 即可。

### 方式 2：安装程序（可选）

使用 NSIS、Inno Setup 等工具创建安装程序：

```nsis
; 示例 NSIS 脚本
!define APP_NAME "HoleHunter"
!define APP_VERSION "2.0.0"

OutFile "HoleHunter-Setup.exe"
InstallDir "$PROGRAMFILES\${APP_NAME}"

Section "Main Files"
    SetOutPath $INSTDIR
    File /r "build\bin\*"

    CreateShortcut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\HoleHunter.exe"
SectionEnd
```

## 资源说明

### nuclei-templates

- **来源**: https://github.com/projectdiscovery/nuclei-templates
- **大小**: 约 300MB（压缩后约 100MB）
- **包含**: 12000+ 个漏洞检测模板
- **更新**: 通过 git submodule 更新

```bash
# 更新模板
git submodule update --remote --merge

# 清理不需要的文件（可选）
cd nuclei-templates
rm -rf .github .git *.md tests/
```

### nuclei.exe

- **来源**: https://github.com/projectdiscovery/nuclei/releases
- **版本**: v3.6.2
- **大小**: 约 127MB
- **更新**: 下载最新版本替换 `build/bin/nuclei.exe`

## 自动化构建

### GitHub Actions

创建 `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm install
          go install github.com/wailsapp/wails/v2/cmd/wails@latest

      - name: Download nuclei
        run: |
          Invoke-WebRequest -Uri "https://github.com/projectdiscovery/nuclei/releases/download/v3.6.2/nuclei_3.6.2_windows_amd64.zip" -OutFile nuclei.zip
          Expand-Archive nuclei.zip -DestinationPath build/bin/

      - name: Build
        run: wails build

      - name: Package
        run: .\build\copy-binaries.ps1

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: HoleHunter-Windows
          path: build/bin/
```

## 文件结构

```
HoleHunter/
├── build/
│   ├── bin/                    # 开发资源和输出
│   │   ├── nuclei.exe          # 扫描引擎
│   │   ├── nuclei-templates/   # 漏洞模板
│   │   └── HoleHunter.exe      # 构建输出
│   ├── copy-binaries.ps1       # Windows 打包脚本
│   └── copy-binaries.sh        # Linux/macOS 打包脚本
├── nuclei-templates/            # Git 子模块
└── wails.json                   # Wails 配置
```

## 常见问题

### Q: 为什么不使用 embed 打包资源？

A: nuclei-templates 有 12000+ 个文件，约 300MB，使用 embed 会导致：
- 编译时间增加 5-10 分钟
- exe 文件体积增加到 400MB+
- 内存占用增加

### Q: 能否只打包核心模板？

A: 可以，选择性复制模板目录：

```powershell
# 只保留高危漏洞模板
robocopy nuclei-templates build\nuclei-templates /E /XD "technologies" "osint" ...
```

### Q: 如何减少分发体积？

A:
1. 使用 7-zip 或类似工具压缩（比 zip 小 30-50%）
2. 只保留必要的模板分类
3. 在首次运行时让应用自动下载模板

## 下一步

- [ ] 创建安装程序（NSIS/Inno Setup）
- [ ] 配置 GitHub Actions 自动构建
- [ ] 添加自动更新功能
- [ ] 优化模板大小
