# HoleHunter 构建与部署指南

## 概述

HoleHunter 支持两种部署模式：
1. **桌面版**：使用 Electron 打包，独立桌面应用程序
2. **服务版**：使用 Go 后端，Web 服务部署

## 前置要求

### 桌面版
- Node.js 18+
- npm 9+
- Python 3 (用于 node-gyp)
- make/c++ 编译工具
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools
- **Linux**: build-essential

### 服务版
- Go 1.21+
- SQLite 3 / MySQL 8+ / PostgreSQL 14+
- Nuclei CLI
- Make

---

## 桌面版构建流程

### 1. 安装依赖

```bash
cd frontend
npm install
```

**注意**: `better-sqlite3` 需要本地编译，如果失败请：

**macOS**:
```bash
xcode-select --install
npm install --build-from-source
```

**Ubuntu/Debian**:
```bash
sudo apt-get install build-essential
npm install
```

**Windows**:
安装 Visual Studio Build Tools，然后:
```bash
npm install --build-from-source
```

### 2. 开发模式运行

```bash
npm run dev
```

这会启动：
- Vite 开发服务器 (热重载)
- Electron 主进程
- 渲染进程

### 3. 生产构建

```bash
npm run build
```

这会：
1. 编译 TypeScript
2. 使用 Vite 打包前端资源
3. 准备 Electron 主进程代码

输出目录: `frontend/dist/`

### 4. 打包桌面应用

#### macOS
```bash
npm run dist:mac

# 或指定架构
npm run dist:mac-arm64  # Apple Silicon
npm run dist:mac-x64    # Intel
```

输出: `frontend/release/HoleHunter-{version}-mac.{dmg|zip}`

#### Windows
```bash
npm run dist:win
```

输出: `frontend/release/HoleHunter-{version}-win.{exe|portable.exe}`

#### Linux
```bash
npm run dist:linux

# 或特定格式
npm run dist:linux-appimage
npm run dist:linux-deb
```

输出: `frontend/release/HoleHunter-{version}-linux.{AppImage|deb}`

### 5. 代码签名 (macOS/Windows)

**macOS**:
```bash
# 导入证书
security import certificate.p12 -k ~/Library/Keychains/login.keychain

# 签名构建
electron-builder --mac --publish never
```

**Windows**:
需要 EV 代码签名证书，配置在 `electron-builder.yml`

---

## 服务版部署流程

### 方式 1: Docker 部署 (推荐)

#### 构建镜像
```bash
cd backend
docker build -f deployments/docker/Dockerfile -t holehunter:latest .
```

#### 运行容器
```bash
cd deployments/docker
docker-compose up -d
```

#### 查看日志
```bash
docker-compose logs -f holehunter
```

#### 停止服务
```bash
docker-compose down
```

### 方式 2: 系统服务部署

#### 1. 编译二进制
```bash
cd backend
go build -o holehunter ./cmd/server
```

#### 2. 运行安装脚本
```bash
chmod +x deployments/install.sh
sudo ./deployments/install.sh
```

这会：
- 安装系统依赖
- 安装 Nuclei
- 创建 holehunter 用户
- 安装二进制到 `/opt/holehunter/bin/`
- 配置 systemd 服务
- 启动服务

#### 3. 管理服务
```bash
# 查看状态
sudo systemctl status holehunter

# 启动服务
sudo systemctl start holehunter

# 停止服务
sudo systemctl stop holehunter

# 重启服务
sudo systemctl restart holehunter

# 查看日志
sudo journalctl -u holehunter -f
```

### 方式 3: 手动部署

#### 1. 编译
```bash
cd backend
go build -o holehunter ./cmd/server
```

#### 2. 创建目录
```bash
sudo mkdir -p /opt/holehunter/bin
sudo mkdir -p /var/lib/holehunter
sudo mkdir -p /var/log/holehunter
```

#### 3. 复制文件
```bash
sudo cp holehunter /opt/holehunter/bin/
sudo chmod +x /opt/holehunter/bin/holehunter
```

#### 4. 安装 Nuclei
```bash
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

#### 5. 配置环境
创建 `/opt/holehunter/.env`:
```bash
HOLEHUNTER_SERVER_PORT=8080
HOLEHUNTER_DB_PATH=/var/lib/holehunter/holehunter.db
HOLEHUNTER_LOG_LEVEL=info
HOLEHUNTER_NUCLEI_PATH=/root/go/bin/nuclei
```

#### 6. 运行
```bash
/opt/holehunter/bin/holehunter
```

---

## 前端 + 后端集成部署

### 选项 1: Nginx 反向代理

1. **构建前端**
```bash
cd frontend
npm run build
```

2. **部署到 Nginx**
```bash
sudo cp -r dist/* /usr/share/nginx/html/
```

3. **配置 Nginx** (使用提供的 `deployments/nginx/nginx.conf`)

4. **启动 Nginx**
```bash
sudo systemctl start nginx
```

### 选项 2: Docker Compose 完整部署

```bash
# 构建并启动所有服务 (backend + nginx + database)
docker-compose --profile nginx up -d
```

---

## 数据库配置

### SQLite (默认)
```bash
# 自动创建，无需配置
# 路径: /var/lib/holehunter/holehunter.db
```

### MySQL
创建 `.env`:
```bash
HOLEHUNTER_DB_TYPE=mysql
HOLEHUNTER_DB_HOST=localhost
HOLEHUNTER_DB_PORT=3306
HOLEHUNTER_DB_NAME=holehunter
HOLEHUNTER_DB_USER=holehunter
HOLEHUNTER_DB_PASSWORD=holehunter_pass
```

初始化数据库:
```bash
mysql -u root -p < deployments/sql/schema.sql
```

### PostgreSQL
创建 `.env`:
```bash
HOLEHUNTER_DB_TYPE=postgresql
HOLEHUNTER_DB_HOST=localhost
HOLEHUNTER_DB_PORT=5432
HOLEHUNTER_DB_NAME=holehunter
HOLEHUNTER_DB_USER=holehunter
HOLEHUNTER_DB_PASSWORD=holehunter_pass
```

---

## 环境变量配置

### 后端环境变量

```bash
# 服务器配置
HOLEHUNTER_SERVER_PORT=8080              # 服务端口
HOLEHUNTER_SERVER_READ_TIMEOUT=30       # 读超时 (秒)
HOLEHUNTER_SERVER_WRITE_TIMEOUT=30      # 写超时 (秒)
HOLEHUNTER_SERVER_SHUTDOWN_TIMEOUT=10   # 关闭超时 (秒)

# 数据库配置
HOLEHUNTER_DB_TYPE=sqlite               # sqlite/mysql/postgresql
HOLEHUNTER_DB_PATH=/var/lib/holehunter/holehunter.db
HOLEHUNTER_DB_HOST=localhost
HOLEHUNTER_DB_PORT=3306
HOLEHUNTER_DB_NAME=holehunter
HOLEHUNTER_DB_USER=holehunter
HOLEHUNTER_DB_PASSWORD=holehunter_pass

# Nuclei 配置
HOLEHUNTER_NUCLEI_PATH=/usr/bin/nuclei
HOLEHUNTER_NUCLEI_TEMPLATES_PATH=/root/.config/nuclei-templates

# 日志配置
HOLEHUNTER_LOG_LEVEL=info               # debug/info/warn/error
HOLEHUNTER_LOG_OUTPUT=stdout            # stdout/file
HOLEHUNTER_LOG_FILE=/var/log/holehunter/holehunter.log
```

### 前端环境变量 (桌面版)

创建 `frontend/.env`:
```bash
# API 配置 (服务版)
VITE_API_BASE_URL=http://localhost:8080/api/v1

# 或使用相对路径 (同源部署)
VITE_API_BASE_URL=/api/v1

# 应用配置
VITE_APP_NAME=HoleHunter
VITE_APP_VERSION=1.0.0
```

---

## 常见问题

### 桌面版

#### Q: better-sqlite3 编译失败
**A**: 安装编译工具
- macOS: `xcode-select --install`
- Ubuntu: `sudo apt-get install build-essential`
- Windows: 安装 Visual Studio Build Tools

#### Q: 打包后应用无法启动
**A**: 检查 `electron-builder.yml` 配置，确保 `asarUnpack` 包含 `better-sqlite3`

#### Q: macOS 提示"已损坏"
**A**: 移除隔离属性
```bash
xattr -cr /Applications/HoleHunter.app
```

### 服务版

#### Q: Nuclei 无法执行
**A**: 确保正确安装并添加执行权限
```bash
chmod +x $(which nuclei)
```

#### Q: 数据库权限错误
**A**: 检查文件权限
```bash
sudo chown holehunter:holehunter /var/lib/holehunter/holehunter.db
sudo chmod 644 /var/lib/holehunter/holehunter.db
```

#### Q: 端口被占用
**A**: 修改端口或停止占用进程
```bash
# 查找占用进程
sudo lsof -i :8080

# 修改环境变量
export HOLEHUNTER_SERVER_PORT=8081
```

---

## 性能优化建议

### 桌面版
1. 使用 `electron-builder` 的压缩选项
2. 启用 `asar` 打包减少体积
3. 只打包必要的架构

### 服务版
1. 使用反向代理 (Nginx)
2. 启用 Gzip 压缩
3. 配置数据库连接池
4. 使用 Redis 缓存 (可选)
5. 使用 Nginx 负载均衡多实例

---

## 安全建议

1. **代码签名**: 生产环境必须签名应用
2. **HTTPS**: 使用 SSL/TLS 证书
3. **防火墙**: 只开放必要端口
4. **权限**: 使用非 root 用户运行
5. **更新**: 定期更新依赖和系统
6. **日志**: 启用日志审计

---

## 监控和维护

### 健康检查
```bash
curl http://localhost:8080/api/v1/health
```

### 查看日志
```bash
# Systemd
sudo journalctl -u holehunter -f

# Docker
docker-compose logs -f

# 文件日志
tail -f /var/log/holehunter/holehunter.log
```

### 数据备份
```bash
# SQLite
cp /var/lib/holehunter/holehunter.db /backup/holehunter-$(date +%Y%m%d).db

# MySQL
mysqldump -u holehunter -p holehunter > /backup/holehunter-$(date +%Y%m%d).sql

# PostgreSQL
pg_dump -U holehunter holehunter > /backup/holehunter-$(date +%Y%m%d).sql
```

---

## 更新升级

### 桌面版
```bash
# 重新构建
npm run build
npm run dist

# 用户重新下载安装包
```

### 服务版
```bash
# 停止服务
sudo systemctl stop holehunter

# 备份数据
sudo cp /var/lib/holehunter/holehunter.db /backup/

# 编译新版本
go build -o holehunter ./cmd/server

# 安装
sudo cp holehunter /opt/holehunter/bin/

# 启动服务
sudo systemctl start holehunter
```

---

## 技术支持

- 文档: https://docs.holehunter.example.com
- Issues: https://github.com/holehunter/holehunter/issues
- 讨论: https://github.com/holehunter/holehunter/discussions
