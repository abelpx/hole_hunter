# 桌面应用打包指南

## 概述

HoleHunter 桌面版采用 **Electron + Go** 架构，Go 后端服务内嵌在 Electron 应用中，**不占用宿主机端口**，提供完全独立的安全测试环境。

## 架构说明

```
┌─────────────────────────────────────────┐
│         HoleHunter 桌面应用              │
├─────────────────────────────────────────┤
│  Electron 主进程                         │
│  ├── 前端界面 (React)                    │
│  └── Go 后端服务 (内嵌)                 │
│      ├── HTTP 服务 (127.0.0.1:随机端口)  │
│      ├── SQLite 数据库                   │
│      └── Nuclei 扫描引擎                 │
└─────────────────────────────────────────┘
```

**关键特性**：
- ✅ 不占用宿主机端口（使用随机端口或固定开发端口 18080）
- ✅ 后端二进制文件打包在应用内部
- ✅ 应用退出时自动清理后端进程
- ✅ 数据库存储在用户数据目录

## 打包流程

### 方式一：使用 Makefile（推荐）

```bash
# 构建当前平台
make desktop

# 构建所有平台（交叉编译）
make desktop-build-all
```

### 方式二：手动打包

#### 1. 编译 Go 后端

```bash
# 当前平台
cd backend
go build -o ../frontend/build/backend/server cmd/server/main.go

# Windows (交叉编译)
GOOS=windows GOARCH=amd64 go build -o ../frontend/build/backend/server.exe cmd/server/main.go

# macOS Intel
GOOS=darwin GOARCH=amd64 go build -o ../frontend/build/backend/server-darwin-amd64 cmd/server/main.go

# macOS Apple Silicon
GOOS=darwin GOARCH=arm64 go build -o ../frontend/build/backend/server-darwin-arm64 cmd/server/main.go

# Linux
GOOS=linux GOARCH=amd64 go build -o ../frontend/build/backend/server-linux-amd64 cmd/server/main.go
```

#### 2. 构建 Electron 应用

```bash
cd frontend
npm run build        # 构建前端
npm run dist         # 打包 Electron
```

## 平台特定说明

### Windows

**输出文件**：
- `HoleHunter-{version}-win.exe` - NSIS 安装程序
- `HoleHunter-{version}-win-portable.exe` - 便携版（无需安装）

**打包要求**：
- Visual Studio Build Tools（编译原生模块）
- Windows 10 或更高版本

**签名**（可选）：
```bash
# 使用代码签名证书
electron-builder build --win --publish never
```

### macOS

**输出文件**：
- `HoleHunter-{version}-mac.dmg` - DMG 安装包
- `HoleHunter-{version}-mac.zip` - 压缩包

**支持架构**：
- x64 (Intel)
- arm64 (Apple Silicon)
- Universal (通用二进制)

**打包要求**：
- Xcode Command Line Tools
- macOS 10.15 (Catalina) 或更高版本

**代码签名**（必需分发）：
```bash
# 开发者身份签名
electron-builder build --mac --identity "Developer ID Application: Your Name"

# 公证（macOS 11+）
electron-builder build --mac --identity "Developer ID Application: Your Name" --notarize
```

### Linux

**输出文件**：
- `HoleHunter-{version}-linux.AppImage` - AppImage 格式
- `HoleHunter-{version}-linux.deb` - Debian 包

**打包要求**：
- build-essential
- libgtk-3-dev

## 开发与生产环境

### 开发环境

```bash
# 启动桌面应用开发模式
make desktop-dev
```

开发环境特点：
- 热重载支持
- 使用 `frontend/build/backend/server`（当前平台编译的后端）
- 后端端口固定为 18080

### 生产环境

```bash
# 构建生产版本
make desktop
```

生产环境特点：
- 后端二进制根据目标平台打包
- 使用随机端口（避免冲突）
- 优化的构建大小
- 启动时自动启动后端服务

## 后端服务管理

### BackendService

位置：`frontend/src/main/backend/BackendService.ts`

**功能**：
- 启动/停止 Go 后端进程
- 自动端口分配
- 健康检查
- 进程生命周期管理

**使用方式**：
```typescript
import { BackendService } from './backend/BackendService';

const backendService = BackendService.getInstance();
await backendService.start();                    // 启动后端
await backendService.stop();                     // 停止后端
const url = backendService.getBackendURL();      // 获取后端 URL
```

## 配置文件

### electron-builder.yml

关键配置项：

```yaml
files:
  - dist/**/*/*
  - build/backend/**/*  # 包含 Go 后端二进制

asarUnpack:
  - build/backend/**/*   # 后端二进制不打包进 asar

extraResources:
  - from: build/resources
    to: .
```

### Makefile

关键目标：

```makefile
desktop: frontend backend
    @$(MAKE) prepare-backend-binaries
    @cd frontend && npm run dist

prepare-backend-binaries:
    @cd backend && go build -o ../frontend/build/backend/server cmd/server/main.go
```

## 故障排查

### 后端无法启动

**症状**：应用启动但后端服务无响应

**解决方案**：
1. 检查后端二进制文件是否存在
2. 查看开发者控制台的错误日志
3. 确认端口未被占用

```bash
# 检查后端文件
ls -la frontend/build/backend/

# 查看应用日志
# macOS: ~/Library/Logs/HoleHunter/
# Windows: %APPDATA%/HoleHunter/logs
# Linux: ~/.config/HoleHunter/logs
```

### 打包后应用过大

**优化方法**：
1. 使用 UPX 压缩后端二进制：
   ```bash
   upx --best --lzma frontend/build/backend/server
   ```
2. 移除不必要的符号表：
   ```bash
   go build -ldflags="-s -w" -o server cmd/server/main.go
   ```

### macOS 公证问题

**症状**：安装后应用被阻止打开

**解决方案**：
```bash
# 移除隔离属性
xattr -cr "HoleHunter.app"

# 或使用公证工具
electron-notarize --file HoleHunter.dmg --bundle-id com.holehunter.app
```

## 发布流程

### 1. 版本更新

更新版本号：
- `frontend/package.json`
- `electron-builder.yml` (metadata.version)

### 2. 构建所有平台

```bash
make desktop-build-all
```

### 3. 测试安装包

在各目标平台上测试安装和基本功能。

### 4. 发布到 GitHub

```bash
# 创建 GitHub Release
gh release create v1.0.0 \
  --title "HoleHunter v1.0.0" \
  --notes "Release notes here"

# 上传构建产物
gh release upload v1.0.0 frontend/release/*
```

## 版本规范

当前版本：`v1.0.0-alpha`

版本格式：`v主版本号.次版本号.修订号-预发布标识`

- **alpha**: 开发中
- **beta**: 功能冻结，测试中
- **rc**: 候选版本
- 无后缀: 正式版本

## 相关文档

- [完整 PRD 文档](./COMPLETE_PRD.md)
- [构建部署指南](./BUILD_AND_DEPLOYMENT.md)
- [API 文档](./API.md)
