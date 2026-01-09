# HoleHunter 项目规则

本项目遵循全局开发规则，并在此基础上添加项目特定的约定。

## 全局规则

所有通用规则定义在 `~/.claude/RULES.md`，包括：

1. Git Commit Message 规范
2. 代码风格要求（避免 AI 风格）
3. 文件创建规则
4. 技术架构要求
5. 性能与质量要求
6. 并发/多线程与资源管理
7. 错误处理规范
8. 安全规范
9. 代码审查标准

**核心理念：简单、实用、直接**

---

## 项目特定规则

### 1. 目录结构

```
hole_hunter/
├── backend/          # Go 后端
├── frontend/         # React 前端
├── main/            # Electron 主进程
├── build/           # 构建脚本和配置
├── shared/          # 共享类型和工具
├── docs/            # 项目文档
└── tests/           # 测试文件
```

### 2. 构建规则

- 前端构建产物：`frontend/dist/` (被 .gitignore 忽略)
- 后端构建产物：`build/binaries/` (被 .gitignore 忽略)
- 最终发布包：`releases/` (被 .gitignore 忽略)
- 打包调试文件：`artifacts/` (被 .gitignore 忽略)

### 3. 依赖管理

- Go: 使用 go.mod
- Node.js: 使用 package.json
- 定期更新依赖，修复安全漏洞
- 锁定重要依赖版本

### 4. 常用命令

**开发：**
```bash
make dev              # 启动开发模式
make dev-server       # 启动服务版
make lint             # 代码检查
```

**构建：**
```bash
make build-desktop    # 构建桌面版
make build-server     # 构建服务版
make cross-compile    # 跨平台编译
```

**打包：**
```bash
make package-mac      # 打包 macOS 版本
make package-win      # 打包 Windows 版本
make package-linux    # 打包 Linux 版本
```

**清理：**
```bash
make clean            # 清理构建产物
make clean-all        # 清理所有缓存
```

### 5. 项目特定约定

#### 5.1 桌面版通信

- 使用 Unix Socket 而不是 TCP 端口
- Socket 路径：`~/Library/Application Support/HoleHunter/holehunter.sock`
- Go 后端启动参数：`--socket <path>`

#### 5.2 服务版通信

- 使用 HTTP API
- 默认端口：8080
- Go 后端启动参数：`--port <port>`

#### 5.3 扫描器管理

- Nuclei 二进制文件使用 Git LFS 存储
- 模板路径：`templates/` 或 `nuclei-templates/`
- 扫描结果存储在本地数据库

---

**查看全局规则**: `cat ~/.claude/RULES.md`
