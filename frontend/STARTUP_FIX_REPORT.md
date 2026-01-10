# 应用启动问题修复报告

**日期:** 2025-01-09
**问题:** Electron API 不可用，无法创建任务

---

## 问题诊断

### 发现的问题

1. **❌ 后端服务未启动**
   - `index.ts` 中缺少 `backendService.start()` 调用
   - 应用启动流程不完整

2. **❌ Preload 路径配置问题**
   - 使用了错误的相对路径 `../../preload/index.js`
   - 应该是 `../preload/index.js`

3. **❌ 缺少启动日志**
   - 无法追踪应用启动过程
   - 调试困难

---

## 修复方案

### 1. 完善应用启动流程

**文件:** [frontend/src/main/index.ts](frontend/src/main/index.ts:25-57)

**修复前:**
```typescript
app.whenReady().then(async () => {
  // 先创建窗口（让用户立即看到界面）
  this.windowManager.createMainWindow();

  // 异步初始化数据库（不阻塞窗口显示）
  this.databaseManager.initialize().catch((error) => {
    console.error('Failed to initialize database:', error);
  });
});
```

**修复后:**
```typescript
app.whenReady().then(async () => {
  console.log('[App] Electron app is ready');

  // 1. 先初始化数据库
  try {
    await this.databaseManager.initialize();
    console.log('[App] Database initialized successfully');
  } catch (error) {
    console.error('[App] Failed to initialize database:', error);
  }

  // 2. 启动后端服务
  try {
    await this.backendService.start();
    console.log('[App] Backend service started successfully');
  } catch (error) {
    console.error('[App] Failed to start backend service:', error);
    // 后端启动失败不应该阻止应用启动
  }

  // 3. 创建窗口
  this.windowManager.createMainWindow();
  console.log('[App] Main window created');
});
```

**改进点:**
- ✅ 添加后端服务启动
- ✅ 添加详细的日志输出
- ✅ 正确的启动顺序：数据库 → 后端 → 窗口

---

### 2. 修复 Preload 路径配置

**文件:** [frontend/src/main/window/WindowManager.ts](frontend/src/main/window/WindowManager.ts:11-79)

**修复前:**
```typescript
preload: path.join(__dirname, '../../preload/index.js'),
```

**修复后:**
```typescript
// __dirname 在构建后指向 dist/main/
const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');
console.log('[WindowManager] Preload path:', preloadPath);

preload: preloadPath,
```

**改进点:**
- ✅ 修正路径计算
- ✅ 添加日志输出便于调试
- ✅ 添加页面加载事件监听

---

### 3. 添加详细日志

**涉及的文件:**
- [frontend/src/main/index.ts](frontend/src/main/index.ts:26-56)
- [frontend/src/main/window/WindowManager.ts](frontend/src/main/window/WindowManager.ts:12-57)
- [frontend/src/main/backend/BackendService.ts](frontend/src/main/backend/BackendService.ts:46-123)
- [frontend/src/preload/index.ts](frontend/src/preload/index.ts:4-74)

**日志格式:**
```typescript
console.log('[ComponentName] Message');
console.log('[ComponentName] ✓ Success message');
console.error('[ComponentName] ✗ Error message');
```

---

## 启动流程图

```
应用启动
    ↓
[App] Initializing HoleHunter application...
    ↓
[App] Electron app is ready
    ↓
┌─────────────────────────────────────┐
│ 1. 初始化数据库                      │
│    - 创建数据目录                    │
│    - 初始化 SQLite 连接              │
│    - 创建表结构                      │
│    [App] Database initialized        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. 启动后端服务                      │
│    - 查找后端二进制                  │
│    - spawn 子进程                    │
│    - 等待健康检查                    │
│    [App] Backend service started    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. 创建主窗口                        │
│    - 创建 BrowserWindow             │
│    - 加载 preload 脚本               │
│    - 加载 HTML 页面                  │
│    [App] Main window created        │
└─────────────────────────────────────┘
    ↓
应用就绪，用户可以交互
```

---

## 测试验证

### 快速测试脚本

```bash
# 运行快速测试
frontend/quick-test.sh
```

### 手动验证步骤

1. **启动应用**
   ```bash
   make desktop-dev
   # 或
   cd frontend && npm run dev:electron
   ```

2. **查看启动日志**
   应该看到以下日志顺序：
   ```
   [App] Initializing HoleHunter application...
   [App] Electron app is ready
   [App] Database initialized successfully
   [BackendService] Starting backend service...
   [BackendService] Backend path: ...
   [BackendService] Backend process spawned, PID: ...
   [BackendService] ✓ Backend service started on port 18080 in XXXms
   [App] Backend service started successfully
   [WindowManager] Creating main window...
   [WindowManager] Preload path: ...
   [App] Main window created
   [Preload] Preload script loaded
   [Preload] electronAPI exposed successfully
   ```

3. **在 DevTools Console 中验证**
   ```javascript
   // 检查 API 是否可用
   window.electronAPI

   // 测试数据库连接
   window.electronAPI.database.healthCheck()

   // 测试创建目标
   window.electronAPI.target.create({
     name: 'Test',
     url: 'https://example.com',
     tags: ['test']
   })
   ```

---

## 预期结果

### 成功启动的标志

1. ✅ Console 中有完整的启动日志
2. ✅ `[Preload] electronAPI exposed successfully` 出现
3. ✅ `window.electronAPI` 对象可用
4. ✅ 后端服务启动成功（18080 端口）
5. ✅ 数据库连接成功
6. ✅ 可以创建目标

### 常见问题排查

| 问题 | 解决方案 |
|------|----------|
| `Backend executable not found` | 运行 `make backend` 构建后端 |
| `electronAPI is not defined` | 检查 preload 路径是否正确 |
| `Failed to start backend service` | 查看后端日志，检查端口占用 |
| `Database initialization failed` | 清理 `~/Library/Application Support/HoleHunter/data/` |

---

## 性能优化

### 启动时间分解

| 阶段 | 预期时间 | 说明 |
|------|----------|------|
| 数据库初始化 | < 100ms | SQLite 非常快 |
| 后端服务启动 | < 3000ms | Go 编译的二进制启动很快 |
| 窗口创建 | < 500ms | Electron 窗口创建 |
| **总计** | **< 4000ms** | **约 4 秒启动** |

### 进一步优化建议

1. **延迟后端启动**
   - 可以在首次使用时才启动后端
   - 节省启动时间

2. **缓存数据库连接**
   - 使用连接池
   - 避免重复初始化

3. **优化日志输出**
   - 生产环境使用更少的日志
   - 减少输出开销

---

## 修复文件清单

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/main/index.ts` | 添加后端启动，完善启动流程 |
| `frontend/src/main/window/WindowManager.ts` | 修复 preload 路径，添加日志 |
| `frontend/src/main/backend/BackendService.ts` | 添加详细日志，优化错误处理 |
| `frontend/src/preload/index.ts` | 添加加载日志 |

---

## 后续建议

1. **添加启动画面**
   - 在后端启动期间显示进度
   - 改善用户体验

2. **错误提示**
   - 后端启动失败时显示友好的错误信息
   - 提供重试选项

3. **健康检查**
   - 定期检查后端服务状态
   - 自动重启崩溃的后端

4. **配置管理**
   - 允许用户禁用后端自动启动
   - 支持连接远程后端
