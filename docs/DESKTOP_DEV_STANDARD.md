# HoleHunter 桌面版开发规范

## 核心原则

1. **所有路径必须是相对路径** - 适配 Electron 的 `loadFile`
2. **主进程和渲染进程分离** - 清晰的边界
3. **Native 模块特殊处理** - 不能打包进 asar
4. **初始化顺序严格** - app ready → database → window → backend

---

## 一、文件结构规范

### 必需目录结构
```
frontend/
├── src/
│   ├── main/           # Electron 主进程 (Node.js)
│   │   ├── index.ts    # 主入口
│   │   ├── window/     # 窗口管理
│   │   ├── ipc/        # IPC 通信
│   │   ├── database/   # 数据库管理
│   │   └── backend/    # 后端服务管理
│   ├── preload/        # Preload 脚本 (隔离层)
│   │   └── index.ts
│   └── renderer/       # React 渲染进程 (Web)
├── dist/               # 构建输出
│   ├── main/           # 主进程构建产物
│   ├── preload/        # Preload 构建产物
│   ├── assets/         # 静态资源
│   └── index.html      # HTML 入口
└── build/              # 构建资源
    └── backend/        # Go 后端二进制
```

### 禁止事项
- ❌ 主进程中使用 `import Database from 'better-sqlite3'` → 用 `require()` 延迟加载
- ❌ 在 constructor 中调用 `app.getPath()` → 在 `initialize()` 方法中调用
- ❌ 使用绝对路径加载资源 → 必须用相对路径 `./assets/...`
- ❌ Preload 路径用硬编码 → 用 `path.join(__dirname, '../../preload/index.js')`

---

## 二、配置文件规范

### 2.1 Vite 配置 (vite.config.ts)

**必须设置 `base: './'`**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // ⚠️ 必须: 使用相对路径适配 Electron loadFile
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer')
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
});
```

**验证方法:**
```bash
npm run build:renderer
cat dist/index.html | grep 'src='
# 必须看到: src="./assets/..."
# ❌ 错误: src="/assets/..."
```

### 2.2 electron-builder 配置

**files 配置必须包含所有必要文件:**
```yaml
files:
  - dist/**/*              # ⚠️ 必须: 包含 dist 下所有文件
  - build/backend/**/*     # Go 后端二进制
  - package.json

# ⚠️ 禁止: dist/**/*/*  (不会包含 dist 根目录的 index.html)

asarUnpack:
  - node_modules/better-sqlite3/**/*  # Native 模块必须解压
  - build/backend/**/*
```

**验证方法:**
```bash
npm run dist
npx asar list release/mac-arm64/HoleHunter.app/Contents/Resources/app.asar | grep -E "(index\.html|preload|better-sqlite3)"
# 应该看到:
# /dist/index.html
# /dist/preload/index.js
# /node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

### 2.3 package.json 构建脚本

**必须包含 preload 构建:**
```json
{
  "scripts": {
    "build": "npm run build:renderer && npm run build:main && npm run build:preload",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.node.json && esbuild src/main/index.ts --bundle --platform=node --external:electron --external:better-sqlite3 --external:electron-store --outfile=dist/main/index.js --format=cjs",
    "build:preload": "esbuild src/preload/index.ts --bundle --platform=node --external:electron --outfile=dist/preload/index.js --format=cjs",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

---

## 三、代码编写规范

### 3.1 主进程 (src/main/*)

#### 初始化顺序 (严格)
```typescript
// ✅ 正确顺序
async initialize() {
  await app.whenReady();           // 1. app ready
  await databaseManager.initialize(); // 2. database
  createWindow();                  // 3. window
  backend.start().catch(...);      // 4. backend (异步)
}

// ❌ 错误: 在 app ready 前调用 app.getPath()
constructor() {
  this.dbPath = app.getPath('userData'); // 崩溃!
}
```

#### DatabaseManager 规范
```typescript
// ✅ 正确: 延迟设置路径
export class DatabaseManager {
  private dbPath: string | null = null;  // 可为 null

  private constructor() {
    // 不做任何需要 app 的操作
  }

  async initialize(): Promise<void> {
    // app ready 后才能调用
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'data', 'holehunter.db');
    // ...
  }
}
```

#### 窗口加载路径规范
```typescript
// ✅ 正确: 相对于 main/index.js 的路径
loadFile(path.join(__dirname, '../index.html'));
// __dirname = app.asar/dist/main
// 实际路径 = app.asar/dist/index.html

// ❌ 错误
loadFile(path.join(__dirname, '../renderer/index.html')); // 路径不存在
loadFile('/absolute/path/index.html'); // 绝对路径不工作
```

### 3.2 Preload 脚本 (src/preload/*)

**必须使用 contextBridge 隔离:**
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../main/ipc/types';

// ✅ 正确: 使用 contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  // ...
});

// ❌ 错误: 直接暴露
window.electronAPI = { ... }; // 不安全
```

### 3.3 渲染进程 (src/renderer/*)

**必须通过 preload API 访问 Electron 功能:**
```typescript
// ✅ 正确: 通过 window.electronAPI
const version = await window.electronAPI.getVersion();

// ❌ 错误: 直接导入
import { ipcRenderer } from 'electron'; // 不工作
```

---

## 四、Native 模块规范

### 4.1 better-sqlite3 配置

**必须配置 external 和 asarUnpack:**

1. esbuild external:
```bash
--external:better-sqlite3
```

2. electron-builder asarUnpack:
```yaml
asarUnpack:
  - node_modules/better-sqlite3/**/*
```

3. postinstall 脚本:
```json
"postinstall": "electron-builder install-app-deps"
```

**验证方法:**
```bash
# 1. 检查 native 模块是否被编译
find node_modules/better-sqlite3 -name "*.node"

# 2. 检查打包后是否包含
find release/mac-arm64/HoleHunter.app -name "*.node"
# 应该看到: app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

### 4.2 Native 模块版本不匹配问题

**症状:**
```
Error: The module was compiled against NODE_MODULE_VERSION 119.
This version of Node.js requires NODE_MODULE_VERSION 120.
```

**解决方法:**
```bash
npm rebuild better-sqlite3
npm run build
```

---

## 五、构建验证规范

### 5.1 每次构建后必须验证

```bash
# 1. 验证 dist 结构
ls -la dist/
# 必须包含: index.html, assets/, main/, preload/

# 2. 验证资源路径
cat dist/index.html | grep 'src='
# 必须是: src="./assets/..."

# 3. 验证 asar 内容
npx asar list release/mac/HoleHunter.app/Contents/Resources/app.asar | grep -E "(index\.html|preload)"
# 必须包含: /dist/index.html, /dist/preload/index.js

# 4. 验证 native 模块
find release/mac/HoleHunter.app -name "*.node"
# 必须包含: better_sqlite3.node
```

### 5.2 运行测试规范

```bash
# 安装测试
cp -R release/mac-arm64/HoleHunter.app /Applications/

# 启动测试
open -a HoleHunter
sleep 5

# 进程检查
ps aux | grep HoleHunter | grep -v grep
# 必须有进程在运行

# 窗口检查
osascript -e 'tell app "System Events" to get name of every process whose background only is false' | grep -i hole
# 必须看到 HoleHunter

# 后端检查
lsof -i -P | grep LISTEN | grep 1[0-9]{4}
# 应该有一个随机端口在监听
```

---

## 六、调试规范

### 6.1 开启开发者工具

**开发模式:** 自动开启
```typescript
if (process.env.NODE_ENV === 'development') {
  this.mainWindow.webContents.openDevTools();
}
```

**生产模式调试:** 临时开启 (发布前必须移除)
```typescript
// ⚠️ 发布前必须删除这行
this.mainWindow.webContents.openDevTools();
```

### 6.2 日志规范

```typescript
// ✅ 正确: 使用 console.log
console.log('Backend started on port', port);
console.error('Failed to load page:', errorCode);

// ❌ 错误: 不输出任何日志
// 导致无法调试问题
```

### 6.3 错误处理规范

```typescript
// ✅ 正确: 捕获并记录错误
try {
  await this.backendService.start();
} catch (error) {
  console.error('Failed to start backend:', error);
  // 通知用户
}

// ❌ 错误: 吞掉错误
this.backendService.start(); // 失败时无任何提示
```

---

## 七、常见错误及解决方案

### 错误 1: 应用启动后立即退出

**可能原因:**
- preload 脚本路径错误
- index.html 未包含在 asar 中
- 资源路径使用绝对路径

**排查步骤:**
```bash
# 1. 检查 preload
npx asar list app.asar | grep preload

# 2. 检查 index.html
npx asar list app.asar | grep index.html

# 3. 检查资源路径
cat dist/index.html | grep 'src='
```

### 错误 2: 窗口显示但页面空白

**可能原因:**
- JavaScript 加载失败
- 相对路径配置错误
- 渲染进程崩溃

**排查步骤:**
```bash
# 1. 打开开发者工具
# 在 WindowManager.ts 中临时添加:
this.mainWindow.webContents.openDevTools();

# 2. 查看控制台错误
# 应该能看到具体的错误信息
```

### 错误 3: 后端无法启动

**可能原因:**
- 后端二进制路径错误
- 端口冲突

**排查步骤:**
```bash
# 1. 检查后端二进制
find .app -name "server"

# 2. 检查端口
lsof -i :18080
```

### 错误 4: Native 模块加载失败

**错误信息:**
```
Error: The module was compiled against a different Node.js version
```

**解决方法:**
```bash
npm rebuild better-sqlite3
npm run build
```

---

## 八、代码审查检查清单

### 提交代码前检查

- [ ] Vite 配置有 `base: './'`
- [ ] electron-builder.yml files 配置正确
- [ ] package.json 包含 `build:preload` 脚本
- [ ] DatabaseManager 不在 constructor 中调用 `app.getPath()`
- [ ] 主进程初始化顺序正确
- [ ] 窗口加载使用相对路径
- [ ] Native 模块在 asarUnpack 中
- [ ] 所有错误都有 console.log

### 发布前检查

- [ ] `npm run build` 成功
- [ ] `make desktop` 成功
- [ ] 验证 dist/index.html 资源路径是相对路径
- [ ] 验证 asar 包含 index.html 和 preload
- [ ] 安装后应用能正常启动
- [ ] 窗口正常显示
- [ ] 后端服务正常启动
- [ ] 移除所有调试代码 (DevTools 等)

---

## 九、Makefile 标准化

### 必需目标

```makefile
# 构建前端
frontend:
	@echo "构建前端..."
	cd frontend && npm run build
	@echo "✓ 前端构建完成: frontend/dist/"

# 构建后端
backend:
	@echo "构建后端..."
	cd backend && go build -o bin/server cmd/server/main.go
	@echo "✓ 后端构建完成: backend/bin/server"

# 构建桌面应用
desktop: frontend backend
	@echo "构建桌面应用..."
	@mkdir -p frontend/build/backend
	@$(MAKE) prepare-backend-binaries
	@cd frontend && npm run dist
	@echo "✓ 桌面应用构建完成"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  安装包位置: frontend/release/"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@ls -lh frontend/release/*.{dmg,zip} 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}'
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 快速验证 (构建后运行)
verify:
	@echo "验证构建..."
	@test -f frontend/dist/index.html || echo "✗ index.html 缺失"
	@test -f frontend/dist/main/index.js || echo "✗ main/index.js 缺失"
	@test -f frontend/dist/preload/index.js || echo "✗ preload/index.js 缺失"
	@cat frontend/dist/index.html | grep -q 'src="./assets/' || echo "✗ 资源路径错误"
	@echo "✓ 验证完成"

# 查看构建产物
list-artifacts:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  HoleHunter 构建产物"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "后端二进制:"
	@test -f backend/bin/server && ls -lh backend/bin/server | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}' || echo "  ✗ 未构建"
	@echo ""
	@echo "前端构建:"
	@test -d frontend/dist && du -sh frontend/dist | awk '{printf "  ✓ %s (%s)\n", $$2, $$1}' || echo "  ✗ 未构建"
	@echo ""
	@echo "安装包:"
	@test -d frontend/release && ls -lh frontend/release/*.{dmg,zip,exe,AppImage} 2>/dev/null | awk '{printf "  ✓ %s (%s)\n", $$9, $$5}' || echo "  ✗ 未构建"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

.PHONY: frontend backend desktop verify list-artifacts
```

---

## 十、版本发布流程

### 10.1 预发布检查

```bash
# 1. 完整构建
make clean
make desktop

# 2. 验证构建产物
make verify
make list-artifacts

# 3. 测试安装
cp -R frontend/release/mac-arm64/HoleHunter.app /Applications/

# 4. 功能测试
open -a HoleHunter
# - 窗口正常显示
# - 后端服务启动
# - 扫描功能正常
# - 数据持久化正常
```

### 10.2 发布清单

- [ ] 所有 TypeScript 错误已修复
- [ ] `npm run build` 无错误
- [ ] `make desktop` 成功
- [ ] 移除所有 `console.log` 调试代码 (保留错误日志)
- [ ] 移除所有 `.openDevTools()` 调用
- [ ] 验证 DMG 能正常安装
- [ ] 验证应用功能正常
- [ ] 更新版本号 (package.json)
- [ ] 更新 CHANGELOG

---

## 十一、持续集成建议

### 11.1 自动化检查脚本

创建 `scripts/validate-build.sh`:
```bash
#!/bin/bash
set -e

echo "验证构建..."

# 检查必需文件
test -f frontend/dist/index.html || exit 1
test -f frontend/dist/main/index.js || exit 1
test -f frontend/dist/preload/index.js || exit 1

# 检查资源路径
cat frontend/dist/index.html | grep -q 'src="./assets/' || exit 1

# 检查 asar 内容
npx asar list frontend/release/mac/HoleHunter.app/Contents/Resources/app.asar | grep -q "/dist/index.html" || exit 1

echo "✓ 所有检查通过"
```

### 11.2 Git Hooks

在 `.git/hooks/pre-push`:
```bash
#!/bin/bash
# 自动运行构建验证
npm run build || exit 1
bash scripts/validate-build.sh || exit 1
```

---

## 十二、故障排除命令参考

```bash
# 查看应用日志
log stream --predicate 'process == "HoleHunter"' --level debug

# 查看崩溃报告
ls -lt ~/Library/Logs/DiagnosticReports/HoleHunter*

# 手动运行应用查看输出
/Applications/HoleHunter.app/Contents/MacOS/HoleHunter

# 检查进程状态
ps aux | grep HoleHunter

# 检查监听端口
lsof -i -P | grep LISTEN

# 强制退出应用
killall HoleHunter

# 清理并重新构建
rm -rf frontend/dist frontend/node_modules
npm install
npm run build
```

---

## 附录：快速参考卡片

### 修改配置文件后
```bash
rm -rf frontend/dist && npm run build
```

### 修改主进程代码后
```bash
cd frontend && npm run build:main
```

### 修改渲染进程代码后
```bash
cd frontend && npm run build:renderer
```

### 修改 preload 代码后
```bash
cd frontend && npm run build:preload
```

### 完整重新构建
```bash
make desktop
```

### 验证构建
```bash
make verify
make list-artifacts
```
