# HoleHunter 构建指南

## 项目结构

```
hole_hunter/
├── backend/          # Go 后端服务
│   ├── cmd/         # 程序入口
│   ├── internal/    # 内部包
│   ├── pkg/         # 公共包
│   └── bin/         # 编译产物
├── frontend/         # React + Electron 前端
│   ├── src/         # 源代码
│   │   ├── main/    # Electron 主进程（内嵌后端管理）
│   │   └── renderer/# React 渲染进程
│   ├── dist/        # 构建产物
│   ├── build/       # 构建资源和后端二进制
│   │   └── backend/ # Go 后端二进制文件
│   └── public/      # 静态资源
├── docs/            # 文档
├── shared/          # 共享代码
└── Makefile         # 构建脚本
```

**桌面应用架构**：Electron 应用内嵌 Go 后端服务，不占用宿主机端口，所有服务在应用内部运行。

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖（前端 + 后端）
make install

# 或者分别安装
cd frontend && npm install
cd backend && go mod download
```

### 2. 开发模式

#### 后端开发

```bash
# 方式1：使用 Makefile
make backend-run

# 方式2：直接运行
cd backend && go run cmd/server/main.go

# 方式3：运行编译后的二进制文件
cd backend && ./bin/server
```

后端服务默认运行在 `http://localhost:8080`

#### 前端开发

```bash
# 方式1：使用 Makefile
make frontend-dev

# 方式2：直接运行
cd frontend && npm run dev
```

前端开发服务器默认运行在 `http://localhost:5173`

#### 桌面应用开发

```bash
# 启动 Electron 桌面应用（开发模式）
make desktop-dev

# 或直接运行
cd frontend && npm run dev:electron
```

### 3. 生产构建

#### 构建后端

```bash
make backend
# 生成文件: backend/bin/server
```

#### 构建前端

```bash
make frontend
# 生成目录: frontend/dist/
```

#### 构建桌面应用

桌面应用会自动打包内嵌的 Go 后端服务，**不需要占用宿主机端口**。

```bash
# 构建当前平台的桌面应用
make desktop

# 构建特定平台
make desktop-build-win     # Windows (x64)
make desktop-build-mac     # macOS (x64 + arm64)
make desktop-build-linux   # Linux (x64)

# 构建所有平台（交叉编译）
make desktop-build-all
```

**构建产物位置**：`frontend/release/`

**平台特定输出**：
- **Windows**: `HoleHunter-{version}-win.exe` (NSIS 安装程序) 和 `portable.exe` (便携版)
- **macOS**: `HoleHunter-{version}-mac.dmg` (DMG 安装包) 和 `.zip` (压缩包)
- **Linux**: `HoleHunter-{version}-linux.AppImage` (AppImage) 和 `.deb` (Debian 包)

**注意**：首次构建需要编译 Go 后端，可能需要几分钟时间。

### 4. 完整构建

```bash
# 构建前端和后端
make build

# 构建所有（包括桌面应用）
make all
```

### 5. 清理

```bash
make clean
```

## Makefile 命令参考

| 命令 | 说明 |
|------|------|
| `make help` | 显示帮助信息 |
| `make deps` | 安装所有依赖 |
| `make backend` | 构建后端服务 |
| `make backend-run` | 运行后端服务 |
| `make frontend` | 构建前端 |
| `make frontend-dev` | 开发模式运行前端 |
| `make desktop` | 构建桌面应用 |
| `make desktop-dev` | 开发模式运行桌面应用 |
| `make clean` | 清理构建产物 |
| `make install` | 安装项目依赖 |
| `make dev` | 启动开发环境 |
| `make test` | 运行测试 |
| `make lint` | 代码检查 |
| `make format` | 格式化代码 |
| `make build` | 完整构建（前端 + 后端） |
| `make all` | 完整构建并打包桌面应用 |

## 环境要求

### 后端 (Go)

- Go 1.21+
- SQLite3

### 前端 (Node.js)

- Node.js 18+
- npm 9+

### 桌面应用

- 所有前端要求
- Electron (自动安装)

## 配置

### 后端配置

后端配置文件位于 `backend/config/config.yaml`：

```yaml
server:
  port: 8080
  read_timeout: 60
  write_timeout: 60

database:
  path: ./holehunter.db

nuclei:
  binary: ./nuclei
  templates_path: ./templates

scan:
  max_concurrent: 10
  timeout: 300
```

### 前端配置

前端配置文件位于 `frontend/vite.config.ts`。

## 开发工作流

1. **启动后端服务**
   ```bash
   make backend-run
   ```

2. **启动前端开发**（新终端）
   ```bash
   make frontend-dev
   ```

3. **开发桌面应用**（可选）
   ```bash
   make desktop-dev
   ```

4. **测试构建**
   ```bash
   make test
   ```

5. **生产打包**
   ```bash
   make all
   ```

## 故障排查

### 后端构建失败

```bash
# 清理 Go 模块缓存
cd backend
go clean -modcache
go mod download
```

### 前端构建失败

```bash
# 清理 node_modules 并重新安装
cd frontend
rm -rf node_modules
npm install
```

### 桌面应用打包失败

确保已安装 Electron Builder 依赖：
```bash
cd frontend
npm install --save-dev electron-builder
```

## 版本信息

- **当前版本**: v1.0.0-alpha
- **版本规范**: Semantic Versioning 2.0.0
- **构建日期**: 2026-01-09
