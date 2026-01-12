# HoleHunter 跨平台打包指南

## 支持平台

| 操作系统 | 架构 | 构建命令 | 产物 |
|----------|------|----------|------|
| macOS | ARM64/AMD64 | `wails build -platform darwin/arm64` | `HoleHunter.app` |
| Linux | ARM64/AMD64 | `wails build -platform linux/amd64` | `HoleHunter` |
| Windows | AMD64 | `wails build -platform windows/amd64` | `HoleHunter.exe` |

## Nuclei 获取方式

### 方式 1: 交叉编译（推荐）

此方式从源码编译 nuclei，确保版本一致性和离线可用性。

```bash
# 一次性交叉编译所有平台的 nuclei（约 5 分钟）
make nuclei-compile-all

# 输出位置：
# build/nuclei-binaries/darwin-arm64/nuclei
# build/nuclei-binaries/darwin-amd64/nuclei
# build/nuclei-binaries/linux-arm64/nuclei
# build/nuclei-binaries/linux-amd64/nuclei
# build/nuclei-binaries/windows-amd64/nuclei.exe
```

**优势**：
- 完全离线，不依赖网络
- 版本可追溯（指定源码 tag）
- 适合 CI/CD 集成

### 方式 2: 下载预编译版本（备用）

如果交叉编译目录不存在，自动从 GitHub Releases 下载。

```bash
make build-debug
```

**优先级**：交叉编译目录 > GitHub Releases > 系统路径

## 目录结构

### macOS
```
HoleHunter.app/
└── Contents/
    └── MacOS/
        ├── HoleHunter    # 主应用
        └── nuclei        # 扫描器 (123MB)
```

### Linux/Windows
```
build/bin/
├── HoleHunter          # 主应用
└── nuclei              # 扫描器
```

## 首次运行

应用启动时自动配置 nuclei 到 `~/.holehunter/`：

1. 复制 nuclei 二进制到用户目录
2. 提取内嵌的扫描模板
3. 创建离线配置文件

## 环境变量

自定义 nuclei 版本：

```bash
# 默认版本：v3.6.2
NUCLEI_VERSION=v3.7.0 make nuclei-compile-all
```
