# HoleHunter

<div align="center">

**基于 Nuclei 引擎的现代化 Web 安全测试套件**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-28+-47848F?logo=electron)](https://www.electronjs.org/)

[English](./README_EN.md) | 简体中文

</div>

## 简介

HoleHunter 是一款面向安全研究人员和渗透测试工程师的轻量化安全测试工具，基于 Nuclei 引擎驱动，提供简洁高效的漏洞发现与验证能力。

### 核心特性

- **漏洞扫描** - 基于 Nuclei 6000+ POC 模板
- **现代化 UI** - 暗色主题 + 毛玻璃效果
- **本地化存储** - SQLite 数据库，保护隐私
- **跨平台支持** - macOS / Windows / Linux
- **实时监控** - 扫描进度实时更新
- **结果导出** - 支持 JSON/HTML/CSV 格式

## 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **Go** >= 1.21
- **Nuclei** >= 3.0

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/hole_hunter.git
cd hole_hunter

# 安装前端依赖
cd frontend
npm install

# 安装 Nuclei
brew install nuclei  # macOS
# 或
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# 更新模板
nuclei -update-templates
```

### 开发

```bash
# 前端开发
cd frontend && npm run dev

# 后端开发
cd backend && go run cmd/server/main.go

# 桌面版开发
cd frontend && npm run dev:electron
```

### 构建

```bash
# 构建前端
cd frontend && npm run build

# 编译后端
cd backend && go build -o bin/holehunter-server cmd/server/main.go

# 交叉编译所有平台
make cross-compile-all

# 打包桌面版
npm run dist:mac
```

## 技术架构

| 层级 | 技术栈 |
|------|--------|
| 前端 | React 18 + TypeScript + Tailwind CSS |
| 状态管理 | Zustand |
| 桌面框架 | Electron |
| 后端 | Go 1.21+ + Gin |
| 数据库 | SQLite |
| 扫描引擎 | Nuclei CLI |

## 项目结构

```
hole_hunter/
├── frontend/           # React 前端 + Electron
│   ├── src/
│   │   ├── main/      # Electron 主进程
│   │   └── renderer/  # React 渲染进程
│   ├── package.json
│   └── electron-builder.yml
├── backend/            # Go 后端
│   ├── cmd/server/    # 服务器入口
│   ├── internal/      # 内部模块
│   └── go.mod
├── build/              # 构建脚本和输出
└── docs/               # 项目文档
```

## 配置

配置文件位于 `~/.holehunter/config.yaml`：

```yaml
server:
  port: "8888"
  read_timeout: 30
  write_timeout: 30

database:
  path: "./holehunter.db"

nuclei:
  binary_path: "nuclei"
  templates_dir: "./templates"

scan:
  default_rate_limit: 150
  default_timeout: 10
  max_concurrent: 5
  default_retries: 1
```

## 文档

- [完整产品需求文档 (PRD)](./docs/COMPLETE_PRD.md)
- [构建和部署指南](./docs/BUILD_AND_DEPLOYMENT.md)
- [API 文档](./docs/API.md)
- [UI 功能测试指南](./docs/UI_FUNCTIONALITY_TEST.md)

## 贡献

欢迎贡献代码、报告 Bug 或提出新功能建议！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

<div align="center">

Made with ❤️ by HoleHunter Team

</div>
