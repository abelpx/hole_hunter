# HoleHunter

<div align="center">

现代化 Web 安全扫描工具

[![CI Status](https://github.com/abelpx/hole_hunter/actions/workflows/CI/badge.svg)](https://github.com/abelpx/hole_hunter/actions/workflows/CI.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://go.dev/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![Wails](https://img.shields.io/badge/Wails-v2-41b883?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjEuMiAxMjEuMiI+PHBhdGggZmlsbD0iIzQxYjg4MyIgZD0iTTAgMGgxMjEuMnYxMjEuMkgwVjB6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTM3LjMgODMuOGMwIC41LjIuOS41IDEuNGwtOC44IDguOGMtMS4xIDEuMS0zIDEuMS00LjEgMEw5LjkgODAuMmMtMS4xLTEuMS0xLjEtMyAwLTQuMWw4LjgtOC44Yy41LS41IDEuMS0uNSAxLjQgMGw4LjggOC44Yy42LjYuNiAxLjYgMCAyLjItLjlsNy4yLTcuMmMuNi0uNi42LTEuNi0uMS0yLjJMMzguMiA2N2MtMS4xLTEuMS0xLjEtMyAwLTQuMWw4LjgtOC44Yy41LS41IDEuMS0uNSAxLjQgMGw4LjggOC44Yy42LjYuNiAxLjYgMCAyLjItLjlsNy4yLTcuMmMuNi0uNi42LTEuNi0uMS0yLjFMNDEuOCAzOS41Yy0xLjEtMS4xLTEuMS0zIDAtNC4xTDUwLjYgMjdjLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM2Ni4xIDE5LjkgNjUuNSAxOS41IDY1LjEgMTlsLTguOC04LjhjLTEuMS0xLjEtMS4xLTMgMC00LjFMNzUuOCAyLjljLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM3Mi4zIDkuMiA3MS43IDguOCA3MS4zIDguMUw1Mi40IDI3LjljLTEuMS0xLjEtMS4xLTMgMC00LjlsOC44LTguOGguNS0uNSAxLjEtLjUgMS40IDBsOC44IDguOGMuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMmwtOC44LTguOGMtMS4xLTEuMS0xLjEgMyAwIDQuMWw4LjggOC44Yy41LjUuNSAxLjEgMCAxLjRsLTguOCA4LjhjLS42LjYtMS42LjYtMi4yLS4xbC03LjItNy4yYy0uNi0uNi0uNi0xLjYuMS0yLjJsOC44LTguOGMxLjEtMS4xIDEuMS0zIDAtNC4xbC04LjgtOC44Yy0uNS0uNS0xLjEtLjUtMS40IDBsLTguOCA4LjhjLS42LjYtMS42LS42LTIuMi0uMWwtNy4yIDcuMmMtLjYuNi0uNi0xLjYtLjEtMi4yLjFMNDAuOSA1NS41YzEuMSAxLjEgMS4xIDMgMCA0LjFMLzIgNzkuMmMtMS4xIDEuMS0xLjEgMyAwIDQuMWwtOC44IDguOGMtLjYuNi0xLjYtLjYtMi4yLS4xLTcuMiA3LjItLjYuNi0uNi0xLjYtLjEtMi4yLjNMNDAuOSA5Ni4xYzEuMSAxLjEgMS4xIDMgMCA0LjFMLzIgMTE5LjJjLTEuMSAxLjEtMyAxLjEtNC4xIDBMMCA5Ni4xYy0xLjEtMS4xLTEuMS0zIDAtNC4xbDguOC04LjhjLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuNiAwIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMmwtOC44LTguOGMtMS4xLTEuMS0xLjEtMyAwLTQuMWw4LjgtOC44Yy41LS41IDEuMS0uNSAxLjQgMGw4LjggOC44Yy42LjYuNiAxLjYgMCAyLjItLjlsNy4yLTcuMmMuNi0uNi42LTEuNi0uMS0yLjFMNDAuOSAzOS41Yy0xLjEtMS4xLTEuMS0zIDAtNC4xTDUwLjYgMjdjLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuMi0wIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM2Ni4xIDE5LjkgNjUuNSAxOS41IDY1LjEgMTlsLTguOC04LjhjLTEuMS0xLjEtMS4xLTMgMC00LjFMNzUuOCAyLjljLjUtLjUgMS4xLS41IDEuNCAwbDguOCA4LjhjLjYuNi42IDEuMi0wIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMkM3Mi4zIDkuMiA3MS43IDguOCA3MS4zIDguMUw1Mi40IDI3LjljLTEuMS0xLjEtMS4xLTMgMC00LjlsOC44LTguOGguNS0uNSAxLjEtLjUgMS40IDBsOC44IDguOGMuNi42IDEuMi0wIDIuMi0uOWw3LjItNy4yYy42LS42LjYtMS42LS4xLTIuMmwtOC44LTguOGMtMS4xLTEuMS0xLjEgMyAwIDMuMWw4LjggOC44Yy41LjUuNSAxLjEgMCAxLjRsLTguOCA4LjhjLS42LjYtMS42LjYtMi4yLS4xbC03LjItNy4yYy0uNi0uNi0uNi0xLjYuMS0yLjJsOC44LTguOGMxLjEtMS4xIDEuMS0zIDAtNC4xbC04LjgtOC44Yy0uNS0uNS0xLjEtLjUtMXoiLz48L3N2Zz4=)](https://wails.io/)

</div>

## 简介

HoleHunter 是一款基于 Wails v2 构建的跨平台桌面应用，为安全研究人员提供简洁高效的漏洞发现工具。

### 核心特性

- **完全离线** - 内置扫描引擎 + 丰富扫描模板
- **跨平台** - 支持 macOS (ARM64/AMD64)、Linux、Windows
- **零配置** - 首次运行自动初始化，无需手动设置
- **本地化** - SQLite 存储，数据完全本地化
- **现代 UI** - React 18 + Tailwind CSS，暗色主题

## 架构设计

```
┌─────────────────────────────────────────┐
│         Frontend (React)                │
│  ┌────────┐  ┌────────┐  ┌────────┐     │
│  │ Pages  │  │  Comps │  │ Store  │     │
│  └────────┘  └────────┘  └────────┘     │
└─────────────────────────────────────────┘
              │ Wails IPC
┌─────────────────────────────────────────┐
│         Handler Layer                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Scan │ │Target│ │Template││Vuln │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
              │
┌─────────────────────────────────────────┐
│         Service Layer                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Scan │ │Target│ │Template││Scen.│   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
              │
┌───────────────────┐  ┌─────────────────┐
│  Repository       │  │  Scanner         │
│  ┌──────┐ ┌─────┐ │  │  ┌──────────┐   │
│  │ Scan │ │Base │ │  │  │Orchestr. │   │
│  └──────┘ └─────┘ │  │  └──────────┘   │
└───────────────────┘  └─────────────────┘
```

## 测试

### 运行测试

```bash
# 运行所有测试
make test

# 后端测试
go test -v ./internal/...

# 前端测试（需要配置）
cd frontend && npm test

# 带覆盖率报告
go test -v -coverprofile=coverage.out ./internal/...
go tool cover -html=coverage.out -o coverage.html
```

### 测试覆盖率

| 模块 | 覆盖率 | 状态 |
|------|--------|------|
| Scanner | 46.9% | 已实现 |
| Repository | 21.3% | 已实现 |
| Service (scan) | 7.7% | 已实现 |
| Handler | 2.8% | 已实现 |
| Frontend Store | - | ⏳ 待实现 |

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

#### 1. 交叉编译扫描引擎（首次构建）

```bash
# 一次性交叉编译所有平台的扫描引擎
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

应用大小约 300MB（含扫描引擎二进制和模板）。

## 项目结构

```
hole_hunter/
├── main.go                      # Wails 应用入口
├── internal/
│   ├── app/                     # 应用核心
│   │   ├── app.go               # Wails App 结构体
│   │   └── bindings.go          # Go 方法绑定
│   ├── handler/                 # HTTP 处理器层
│   │   ├── scan.go              # 扫描任务处理
│   │   ├── target.go            # 目标管理
│   │   ├── template.go          # 模板管理
│   │   ├── vulnerability.go     # 漏洞管理
│   │   ├── dashboard.go         # 仪表盘
│   │   ├── brute.go             # 暴力破解
│   │   ├── http.go              # HTTP 扫描
│   │   ├── ports_scan.go        # 端口扫描
│   │   ├── domain_brute.go      # 子域名暴破
│   │   └── scenario.go          # 扫描场景
│   ├── svc/                     # 服务层
│   │   ├── scan.go              # 扫描服务
│   │   ├── target.go            # 目标服务
│   │   ├── template.go          # 模板服务
│   │   ├── vulnerability.go     # 漏洞服务
│   │   ├── dashboard.go         # 仪表盘服务
│   │   ├── brute.go             # 暴力破解服务
│   │   ├── http.go              # HTTP 扫描服务
│   │   ├── ports_scan.go        # 端口扫描服务
│   │   ├── domain_brute.go      # 子域名服务
│   │   └── scenario.go          # 场景服务
│   ├── repo/                    # 数据仓储层
│   │   ├── base.go              # 基础仓储
│   │   ├── scan.go              # 扫描任务仓储
│   │   ├── target.go            # 目标仓储
│   │   ├── template.go          # 模板仓储
│   │   ├── vulnerability.go     # 漏洞仓储
│   │   ├── brute.go             # 暴力破解仓储
│   │   ├── http.go              # HTTP 扫描仓储
│   │   ├── ports_scan.go        # 端口扫描仓储
│   │   ├── domain_brute.go      # 子域名仓储
│   │   ├── scenario.go          # 场景仓储
│   │   └── dashboard.go         # 仪表盘仓储
│   ├── scanner/                 # 扫描引擎集成
│   │   ├── nuclei.go            # 扫描引擎客户端
│   │   ├── orchestrator.go      # 扫描编排器
│   │   ├── output_parser.go     # 输出解析
│   │   └── scan_process.go      # 扫描进程
│   ├── models/                  # 数据模型
│   │   ├── scan.go              # 扫描任务模型
│   │   ├── target.go            # 目标模型
│   │   ├── template.go          # 模板模型
│   │   ├── vulnerability.go     # 漏洞模型
│   │   ├── brute.go             # 暴力破解模型
│   │   ├── http.go              # HTTP 扫描模型
│   │   ├── portscan.go          # 端口扫描模型
│   │   ├── domainbrute.go       # 子域名模型
│   │   ├── scenario.go          # 场景模型
│   │   ├── dashboard.go         # 仪表盘模型
│   │   ├── nuclei.go            # 扫描引擎相关模型
│   │   └── template_filter.go   # 模板过滤
│   ├── infrastructure/          # 基础设施
│   │   ├── config/              # 配置管理
│   │   ├── database/            # 数据库
│   │   │   └── migrations/      # 数据库迁移
│   │   ├── errors/              # 错误处理
│   │   ├── event/               # 事件总线
│   │   └── logger/              # 日志
│   ├── metrics/                 # 指标收集
│   │   ├── metrics.go           # 指标定义
│   │   └── collector.go         # 指标收集器
│   ├── offline/                 # 离线扫描器
│   ├── testutil/                # 测试工具
│   └── utils/                   # 工具函数
├── frontend/                    # React 前端
│   ├── src/renderer/
│   │   ├── pages/               # 页面组件
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ScansPage.tsx
│   │   │   ├── TargetsPage.tsx
│   │   │   ├── TemplatesPage.tsx
│   │   │   ├── VulnPage.tsx
│   │   │   ├── ToolsPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── BrutePage.tsx
│   │   │   ├── ReplayPage.tsx
│   │   │   └── CustomTemplatesPage.tsx
│   │   ├── store/               # 状态管理
│   │   │   ├── scanStore.ts
│   │   │   ├── targetStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   ├── vulnStore.ts
│   │   │   ├── bruteStore.ts
│   │   │   ├── replayStore.ts
│   │   │   └── themeStore.ts
│   │   ├── services/            # API 服务
│   │   ├── components/          # UI 组件
│   │   ├── types/               # TypeScript 类型
│   │   └── App.tsx              # 应用入口
│   ├── wailsjs/                 # Wails 生成的绑定
│   ├── vitest.config.ts         # Vitest 配置
│   └── package.json
├── build/                       # 构建输出
│   ├── nuclei-binaries/         # 交叉编译的 nuclei
│   ├── nuclei-templates/        # 官方模板库
│   └── copy-templates.sh        # 模板复制脚本
├── scripts/                     # 构建脚本
├── .github/workflows/           # CI/CD 配置
│   └── ci.yml                   # 持续集成
├── docs/                        # 文档
├── Makefile
├── wails.json
└── README.md
```

## 文档

- [构建指南](./docs/BUILD.md) - 详细的构建和打包说明
- [API 文档](./docs/API.md) - 应用 API 参考
- [开发进度](./docs/PROGRESS.md) - 功能模块开发状态

## 工作原理

1. **扫描引擎管理** - 通过子项目方式管理扫描引擎源码，交叉编译各平台二进制
2. **离线运行** - 首次启动时自动复制扫描引擎和模板到用户目录 `~/.holehunter/`
3. **扫描执行** - 调用内置扫描引擎执行扫描，结果存入 SQLite

## 许可证

MIT License

---

<div align="center">

Made with ❤️ by HoleHunter Team

</div>
