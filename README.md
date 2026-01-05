# HoleHunter

<div align="center">

**🛡️ 基于 Nuclei 引擎的现代化 Web 安全测试套件**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-28+-47848F?logo=electron)](https://www.electronjs.org/)

[English](./README_EN.md) | 简体中文

</div>

---

## ✨ 项目简介

HoleHunter 是一款面向安全研究人员和渗透测试工程师的轻量化安全测试工具，基于 **Nuclei** 引擎驱动，提供简洁高效的漏洞发现与验证能力。

### 核心特性

- 🔍 **强大的漏洞扫描** - 基于 Nuclei 6000+ POC 模板
- 🎨 **现代化 UI** - 暗色主题 + 毛玻璃效果
- ⚡ **高性能** - Go 并发 + React 优化
- 💾 **本地化存储** - SQLite 数据库，保护隐私
- 🔧 **高度可扩展** - 支持自定义 Nuclei 模板
- 🚀 **跨平台支持** - macOS / Windows / Linux

---

## 📚 文档

- [完整产品需求文档 (PRD)](./docs/COMPLETE_PRD.md) - 产品规格、技术架构、功能需求
- [构建和部署指南](./docs/BUILD_AND_DEPLOYMENT.md) - 桌面版打包、服务版部署
- [UI 功能测试指南](./docs/UI_FUNCTIONALITY_TEST.md) - 功能测试步骤、已知问题

---

## 🚀 快速开始

### 环境要求

#### 桌面版开发
- **Node.js** >= 18.0.0
- **npm** 或 **pnpm**
- **Nuclei CLI** >= 3.0

#### 服务版部署
- **Go** >= 1.21
- **MySQL** 8.0+ 或 **PostgreSQL** 14+
- **Docker** (可选)

### 桌面版开发

1. **克隆项目**

```bash
git clone https://github.com/yourusername/hole_hunter.git
cd hole_hunter
```

2. **安装依赖**

```bash
cd frontend
npm install
```

3. **安装 Nuclei**

```bash
# macOS
brew install nuclei

# Linux
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# 更新模板
nuclei -update-templates
```

4. **启动开发服务器**

```bash
cd frontend
npm run dev
```

5. **访问应用**

打开浏览器访问 `http://localhost:5173`

### 桌面版打包

```bash
# macOS (Intel + ARM)
npm run dist:mac

# Windows
npm run dist:win

# Linux
npm run dist:linux
```

详见 [构建和部署指南](./docs/BUILD_AND_DEPLOYMENT.md)。

---

## 🛠️ 技术架构

### 技术栈

| 层级 | 桌面版 | 服务版 |
|------|--------|--------|
| **前端框架** | React 18 + TypeScript | React 18 + TypeScript |
| **状态管理** | Zustand | Zustand |
| **样式方案** | Tailwind CSS | Tailwind CSS |
| **桌面框架** | Electron | - |
| **后端语言** | Electron Main Process | Go 1.21+ |
| **Web 框架** | - | Gin |
| **数据库** | SQLite (better-sqlite3) | MySQL / PostgreSQL |
| **扫描引擎** | Nuclei CLI | Nuclei CLI |

---

## 📖 使用指南

### 1. 添加目标

点击"添加目标"按钮，输入目标 URL 和相关信息：

```
名称: Example Site
URL: https://example.com
标签: production, web
```

### 2. 配置扫描

选择扫描预设：

- **快速扫描** - 仅扫描高危漏洞
- **深度扫描** - 全面扫描所有漏洞
- **CVE 扫描** - 仅扫描已知 CVE
- **配置错误** - 检测配置问题
- **技术探测** - 探测使用的技术
- **面板扫描** - 扫描管理面板
- **自定义** - 完全自定义扫描

### 3. 查看结果

扫描完成后，查看发现的漏洞：

- 🔴 **Critical** - 严重漏洞，需立即修复
- 🟠 **High** - 高危漏洞，建议尽快修复
- 🟡 **Medium** - 中危漏洞，计划修复
- 🔵 **Low** - 低危漏洞，可选修复
- ⚪ **Info** - 信息收集，无风险

### 4. 导出报告

支持多种格式导出：

- JSON - 用于程序化处理
- HTML - 可读性强的报告
- CSV - 用于数据分析

---

## 📊 项目结构

```
hole_hunter/
├── frontend/           # Electron + React 前端
│   ├── src/
│   │   ├── main/      # Electron 主进程
│   │   └── renderer/  # React 渲染进程
│   ├── package.json
│   └── electron-builder.yml
├── backend/            # Go 后端服务
│   ├── cmd/
│   ├── internal/
│   ├── deployments/
│   └── go.mod
├── docs/               # 项目文档
│   ├── COMPLETE_PRD.md
│   ├── BUILD_AND_DEPLOYMENT.md
│   └── UI_FUNCTIONALITY_TEST.md
└── README.md
```

---

## 🤝 贡献指南

欢迎贡献代码、报告 Bug 或提出新功能建议！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范提交信息。

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

- [Nuclei](https://github.com/projectdiscovery/nuclei) - 强大的漏洞扫描引擎
- [ProjectDiscovery](https://github.com/projectdiscovery) - 安全工具开发团队
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://react.dev/) - 用户界面库

---

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/yourusername/hole_hunter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/hole_hunter/discussions)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ by HoleHunter Team

</div>
