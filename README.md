# HoleHunter

<div align="center">

基于 Nuclei 引擎的现代化 Web 安全扫描工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![Wails](https://img.shields.io/badge/Wails-v2-41b883?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjEuMiAxMjEuMiI+PHBhdGggZmlsbD0iIzQxYjg4MyIgZD0iTTAgMGgxMjEuMnYxMjEuMkgwVjB6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTM3LjMgODMuOGMwIC41LjIuOS41IDEuNGwtOC44IDguOGMtMS4xIDEuMS0zIDEuMS00LjEgMEw5LjkgODAuMmMtMS4xLTEuMS0xLjEtMyAwLTQuMWw4LjgtOC44Yy41LS41IDEuMS0uNSAxLjQgMGw4LjggOC44Yy42LjYuNiAxLjYgMCAyLjItLjlsNy4yLTcuMmMuNi0uNi42LTEuNi0uMS0yLjJMMzguMiA2N2MtMS4xLTEuMS0xLjEtMyAwLTQuMWw4LjgtOC44Yy41LS41IDEuMS0uNSAxLjQgMGw4LjggOC44Yy42LjYuNiAxLjYgMCAyLjItLjlsNy4yLTcuMmMuNi0uNi42LTEuNi0uMS0yLjFMNDEuOCAzOS41Yy0xLjEtMS4xLTEuMS0zIDAtNC4xTDUwLjYgMjdjLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM2Ni4xIDE5LjkgNjUuNSAxOS41IDY1LjEgMTlsLTguOC04LjhjLTEuMS0xLjEtMS4xLTMgMC00LjFMNzUuOCAyLjljLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM3Mi4zIDkuMiA3MS43IDguOCA3MS4zIDguMUw1Mi40IDI3LjljLTEuMS0xLjEtMS4xLTMgMC00LjFsOC44LTguOGMuNS0uNSAxLjEtLjUgMS40IDBsOC44IDguOGMuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMmwtOC44LTguOGMtMS4xLTEuMS0xLjEgMyAwIDQuMWw4LjggOC44Yy41LjUuNSAxLjEgMCAxLjRsLTguOCA4LjhjLS42LjYtMS42LjYtMi4yLS4xbC03LjItNy4yYy0uNi0uNi0uNi0xLjYuMS0yLjJsOC44LTguOGMxLjEtMS4xIDEuMS0zIDAtNC4xbC04LjgtOC44Yy0uNS0uNS0xLjEtLjUtMS40IDBsLTguOCA4LjhjLS42LjYtMS42LS42LTIuMi0uMWwtNy4yIDcuMmMtLjYuNi0uNi0xLjYtLjEtMi4yLjFMNDAuOSA1NS41YzEuMSAxLjEgMS4xIDMgMCA0LjFMLzIgNzkuMmMtMS4xIDEuMS0xLjEgMyAwIDQuMWwtOC44IDguOGMtLjYuNi0xLjYtLjYtMi4yLS4xLTcuMiA3LjItLjYuNi0uNi0xLjYtLjEtMi4yLjFMNDAuOSA5Ni4xYzEuMSAxLjEgMS4xIDMgMCA0LjFMLzIgMTE5LjJjLTEuMSAxLjEtMyAxLjEtNC4xIDBMMCA5Ni4xYy0xLjEtMS4xLTEuMS0zIDAtNC4xbDguOC04LjhjLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMmwtOC44LTguOGMtMS4xLTEuMS0xLjEtMyAwLTQuMWw4LjgtOC44Yy41LS41IDEuMS0uNSAxLjQgMGw4LjggOC44Yy42LjYuNiAxLjYgMCAyLjItLjlsNy4yLTcuMmMuNi0uNi42LTEuNi0uMS0yLjFMNDAuOSAzOS41Yy0xLjEtMS4xLTEuMS0zIDAtNC4xTDUwLjYgMjdjLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM2Ni4xIDE5LjkgNjUuNSAxOS41IDY1LjEgMTlsLTguOC04LjhjLTEuMS0xLjEtMS4xLTMgMC00LjFMNzUuOCAyLjljLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM3Mi4zIDkuMiA3MS43IDguOCA3MS4zIDguMUw1Mi40IDI3LjljLTEuMS0xLjEtMS4xLTMgMC00LjFsOC44LTguOGMuNS0uNSAxLjEtLjUgMS40IDBsOC44IDguOGMuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMmwtOC44LTguOGMtMS4xLTEuMS0xLjEgMyAwIDQuMWw4LjggOC44Yy41LjUuNSAxLjEgMCAxLjRsLTguOCA4LjhjLS42LjYtMS42LjYtMi4yLS4xbC03LjItNy4yYy0uNi0uNi0uNi0xLjYuMS0yLjJsOC44LTguOGMxLjEtMS4xIDEuMS0zIDAtNC4xbC04LjgtOC44Yy0uNS0uNS0xLjEtLjUtMS14Ii8+PC9zdmc+)](https://wails.io/)

</div>

## 简介

HoleHunter 是一款基于 Wails v2 构建的跨平台桌面应用，集成 Nuclei 漏洞扫描引擎，为安全研究人员提供简洁高效的漏洞发现工具。

### 核心特性

- **完全离线** - 内置 Nuclei v3.6.2 + 12000+ 扫描模板
- **跨平台** - 支持 macOS (ARM64/AMD64)、Linux、Windows
- **零配置** - 首次运行自动初始化，无需手动设置
- **本地化** - SQLite 存储，数据完全本地化
- **现代 UI** - React 18 + Tailwind CSS，暗色主题

## 快速开始

### 环境要求

- **Go** >= 1.25
- **Node.js** >= 18.0
- **Wails CLI** >= v2.11

### 安装 Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### 开发模式

```bash
# 启动开发模式（热重载）
make dev
```

### 构建应用

#### 1. 交叉编译 Nuclei（首次构建）

```bash
# 一次性交叉编译所有平台的 nuclei
make nuclei-compile-all
```

#### 2. 构建桌面应用

```bash
# 调试构建（包含开发者工具）
make build-debug

# 生产构建（优化）
make build
```

#### 3. 运行应用

```bash
make run
```

### 构建产物

| 平台 | 架构 | 产物 |
|------|------|------|
| macOS | ARM64/AMD64 | `HoleHunter.app` |
| Linux | ARM64/AMD64 | `HoleHunter` |
| Windows | AMD64 | `HoleHunter.exe` |

应用大小约 300MB（含 Nuclei 二进制和模板）。

## 项目结构

```
hole_hunter/
├── app.go                  # Wails 应用入口
├── internal/
│   ├── nuclei/            # Nuclei 集成
│   └── offline/           # 离线扫描器
├── frontend/              # React 前端
│   ├── src/
│   │   └── renderer/      # React 组件
│   └── wailsjs/           # Wails 生成的绑定
├── scripts/               # 构建脚本
│   ├── build-nuclei-all.sh    # Nuclei 交叉编译
│   └── download-nuclei.sh     # Nuclei 下载
├── build/                 # 构建输出
│   ├── nuclei-binaries/   # 交叉编译的 nuclei
│   └── nuclei-templates/  # 官方模板库
├── Makefile
├── wails.json
└── README.md
```

## 文档

- [构建指南](./BUILD.md) - 详细的构建和打包说明
- [API 文档](./docs/API.md) - 应用 API 参考

## 工作原理

1. **Nuclei 管理** - 通过子项目方式管理 Nuclei 源码，交叉编译各平台二进制
2. **离线运行** - 首次启动时自动复制 Nuclei 和模板到用户目录 `~/.holehunter/`
3. **扫描执行** - 调用内置 Nuclei 执行扫描，结果存入 SQLite

## 许可证

MIT License

---

<div align="center">

Made with ❤️ by HoleHunter Team

</div>
