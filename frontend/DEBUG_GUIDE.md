# HoleHunter 桌面版本调试指南

## 修复内容总结

本次代码修复解决了以下问题：

1. ✅ **统一数据库类型定义** - `Vulnerability.id` 类型统一为 `string`
2. ✅ **修复后端路径配置** - 开发环境下正确计算后端二进制文件路径
3. ✅ **修复后端环境变量配置** - Go 后端支持 `SERVER_PORT` 和 `DATABASE_PATH` 环境变量
4. ✅ **修复 IPC 处理器依赖注入** - `IPCHandlers` 支持依赖注入，提高可测试性
5. ✅ **完善后端健康检查端点** - `/api/v1/health` 返回完整的服务信息
6. ✅ **清理未使用代码** - 为渲染进程数据库适配器添加说明注释

---

## 开发环境调试步骤

### 步骤 1: 准备后端二进制文件

```bash
# 进入项目根目录
cd /Users/abel/program/go/hole_hunter

# 构建后端
make backend

# 验证后端二进制存在
ls -lh backend/bin/server
```

**预期输出：**
```
-rwxr-xr-x  1 user  staff   XXXB XX XX XX:XX backend/bin/server
```

### 步骤 2: 安装前端依赖

```bash
cd frontend
npm install
```

### 步骤 3: 启动开发模式

```bash
# 方式一：使用 Makefile（推荐）
make desktop-dev

# 方式二：直接使用 npm
cd frontend
npm run dev:electron
```

### 步骤 4: 打开 DevTools

应用启动后：
- macOS: 按 `Cmd + Option + I`
- Windows/Linux: 按 `Ctrl + Shift + I`

### 步骤 5: 验证核心功能

在 DevTools Console 中运行以下命令：

```javascript
// 1. 检查 Electron API 是否可用
console.log('Electron API:', window.electronAPI);

// 预期输出：一个对象，包含 target, scan, vulnerability, database 等属性

// 2. 检查数据库连接
window.electronAPI.database.healthCheck().then(r => console.log('DB Health:', r));

// 预期输出：{ success: true, data: { healthy: true, type: 'sqlite' } }

// 3. 获取应用版本
window.electronAPI.app.getVersion().then(r => console.log('Version:', r));

// 预期输出：{ success: true, data: '1.0.0-alpha' }

// 4. 获取平台信息
window.electronAPI.app.getPlatform().then(r => console.log('Platform:', r));

// 预期输出：{ success: true, data: 'darwin' } (macOS) 或 'win32' (Windows)

// 5. 测试添加目标
window.electronAPI.target.create({
  name: 'Test Target',
  url: 'https://example.com',
  tags: ['test']
}).then(r => console.log('Created:', r));

// 预期输出：{ success: true, data: { id: 1, name: 'Test Target', ... } }

// 6. 获取目标列表
window.electronAPI.target.getAll().then(r => console.log('Targets:', r));

// 预期输出：{ success: true, data: [...] }
```

---

## 完整构建和打包测试

### 步骤 1: 完整构建

```bash
# 构建桌面应用
make desktop

# 查看构建产物
make list-artifacts
```

### 步骤 2: 查看构建产物

```bash
# macOS
ls -lh frontend/release/*.dmg

# Windows
dir frontend\release\*.exe

# Linux
ls -lh frontend/release/*.AppImage
```

### 步骤 3: 安装和测试

```bash
# macOS
open frontend/release/HoleHunter-1.0.0-alpha.dmg

# Windows
frontend\release\HoleHunter-1.0.0-alpha-x64.exe

# Linux
./frontend/release/holehunter-1.0.0-alpha-x64.AppImage
```

---

## 功能验证清单

使用此清单确保所有功能正常工作：

### 基础功能
- [ ] 应用正常启动，无崩溃
- [ ] 窗口显示正确，无边框问题
- [ ] Console 无错误信息
- [ ] 后端服务成功启动（查看 Console 日志中的 "Backend service started"）
- [ ] 数据库初始化成功（查看 "Database initialized" 日志）

### 目标管理
- [ ] 目标管理页面正常加载
- [ ] 显示目标列表
- [ ] 点击"添加目标"按钮打开弹窗
- [ ] 输入目标信息并保存成功
- [ ] 新目标出现在列表中
- [ ] 可以编辑目标
- [ ] 可以删除目标
- [ ] 可以批量删除目标

### 扫描任务
- [ ] 扫描任务页面正常加载
- [ ] 显示扫描任务列表
- [ ] 可以选择目标并创建扫描任务
- [ ] 扫描配置弹窗正常显示
- [ ] 扫描进度实时更新
- [ ] 扫描完成后显示结果统计
- [ ] 可以取消正在运行的扫描
- [ ] 可以删除扫描任务

### 漏洞管理
- [ ] 漏洞列表页面正常加载
- [ ] 显示漏洞列表
- [ ] 可以按严重程度筛选
- [ ] 可以按目标筛选
- [ ] 点击漏洞查看详情
- [ ] 漏洞详情弹窗显示完整信息
- [ ] 可以标记误报
- [ ] 可以添加备注
- [ ] 可以删除漏洞

### Dashboard
- [ ] Dashboard 页面正常加载
- [ ] 显示目标统计
- [ ] 显示扫描统计
- [ ] 显示漏洞统计
- [ ] 按严重程度显示漏洞分布
- [ ] 显示最近发现的漏洞
- [ ] 数据库状态显示 "Connected"

### 设置页面
- [ ] 设置页面正常加载
- [ ] 可以查看 Nuclei 版本
- [ ] 可以更新 Nuclei 模板
- [ ] 可以配置扫描参数

---

## 常见问题排查

### 问题 1: 后端启动失败

**错误信息：** `Backend executable not found: ...`

**排查步骤：**

```bash
# 1. 检查后端二进制是否存在
ls -lh backend/bin/server

# 2. 检查文件权限
chmod +x backend/bin/server

# 3. 手动测试后端
./backend/bin/server

# 4. 查看后端日志
# 在应用启动后，查看 Console 中的 "Backend:" 日志
```

**解决方案：**
- 确保 `make backend` 已成功执行
- 检查 `BackendService.ts` 中的路径计算是否正确
- 开发环境下，`__dirname` 应该指向 `dist/main/`

---

### 问题 2: 数据库初始化失败

**错误信息：** `Failed to initialize database: ...`

**排查步骤：**

```bash
# 1. 检查数据库目录权限
ls -la ~/Library/Application\ Support/HoleHunter/data/

# 2. 清理旧数据库
rm -rf ~/Library/Application\ Support/HoleHunter/data/

# 3. 清理整个应用数据
rm -rf ~/Library/Application\ Support/HoleHunter/

# 4. 重新启动应用
make desktop-dev
```

**解决方案：**
- 确保应用有写入用户数据目录的权限
- 检查 `better-sqlite3` 是否正确安装
- 如果是在生产环境打包后出现问题，检查 `asarUnpack` 配置

---

### 问题 3: IPC 通信失败

**错误信息：** `Cannot read properties of undefined` 或 `electronAPI is not defined`

**排查步骤：**

```javascript
// 在 DevTools Console 中检查
console.log(window.electronAPI);

// 检查 preload 脚本是否加载
console.log('Preload loaded:', typeof window.electronAPI !== 'undefined');
```

**解决方案：**
1. 检查 `dist/preload/index.js` 是否存在
2. 检查 `preload/index.ts` 中的 `contextBridge.exposeInMainWorld` 调用
3. 确保 `WindowManager` 创建窗口时正确配置了 preload 脚本

---

### 问题 4: 后端端口冲突

**错误信息：** `Address already in use` 或 `EADDRINUSE`

**排查步骤：**

```bash
# 查找占用端口的进程
lsof -i :18080

# 杀死进程
kill -9 <PID>
```

**解决方案：**
1. 修改 `BackendService.ts` 中的端口配置
2. 使用随机端口（生产环境已自动使用随机端口）

---

### 问题 5: Nuclei 不可用

**错误信息：** `Nuclei not found` 或 `Nuclei check failed`

**排查步骤：**

```bash
# 检查 Nuclei 是否安装
which nuclei

# 查看 Nuclei 版本
nuclei -version

# 如果未安装，使用 Go 安装
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

**解决方案：**
- 确保 Nuclei 已安装并在 PATH 中
- 或在设置页面配置 Nuclei 路径

---

## 日志收集

### 启用详细日志

在 `src/main/index.ts` 中添加：

```typescript
// 在文件顶部添加
process.env.DEBUG = '*';
```

### 查看日志文件

```bash
# macOS
tail -f ~/Library/Logs/HoleHunter/main.log

# Windows
type %APPDATA%\HoleHunter\logs\main.log

# Linux
tail -f ~/.config/HoleHunter/logs/main.log
```

### Console 日志级别

在 DevTools Console 中可以设置日志级别：

```javascript
// 只显示错误
console.level = 'error';

// 显示所有日志
console.level = 'debug';
```

---

## 性能分析

### 使用 Chrome DevTools 性能分析

1. 打开 DevTools
2. 切换到 "Performance" 标签
3. 点击 "Record"
4. 执行操作（如添加目标、启动扫描）
5. 点击 "Stop"
6. 分析性能瓶颈

### 内存分析

1. 打开 DevTools
2. 切换到 "Memory" 标签
3. 选择 "Heap snapshot"
4. 点击 "Take snapshot"
5. 分析内存使用情况

---

## 单元测试

### 运行前端测试

```bash
cd frontend
npm test
```

### 运行后端测试

```bash
cd backend
go test ./...
```

---

## 调试技巧

### 1. 使用 VS Code 调试

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:electron"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 2. 使用 debugger 语句

在代码中添加 `debugger;` 语句，程序执行到该行时会暂停。

### 3. 使用 console.log

在关键位置添加日志：

```typescript
console.log('[DEBUG] Variable value:', variable);
console.error('[ERROR] Something went wrong:', error);
console.warn('[WARN] Warning message');
```

---

## 下一步优化建议

1. **添加 E2E 测试**
   - 使用 Playwright 进行自动化 UI 测试
   - 覆盖主要用户流程

2. **添加单元测试**
   - 使用 Jest 测试核心逻辑
   - 测试数据库操作
   - 测试 IPC 通信

3. **错误处理增强**
   - 添加更友好的错误提示
   - 实现错误上报机制
   - 添加错误恢复策略

4. **日志系统完善**
   - 使用结构化日志（如 winston）
   - 添加日志级别控制
   - 实现日志轮转

5. **性能优化**
   - 大量数据时使用虚拟滚动
   - 优化数据库查询
   - 实现数据分页加载

---

## 需要帮助？

如果遇到问题，请检查以下资源：

1. **代码注释** - 关键文件都有详细注释
2. **开发工作流程** - 参考 `DEVELOPMENT_WORKFLOW.md`
3. **API 文档** - 参考 `docs/API.md`
4. **构建指南** - 参考 `docs/BUILD_GUIDE.md`
