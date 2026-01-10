# Electron 开发验证流程

## 自动验证步骤

每次开发完成后，按以下步骤验证：

### 1. 快速验证（无需启动应用）
```bash
cd frontend
./verify-electron.sh
```

这会检查：
- ✓ 构建产物存在
- ✓ 资源路径正确
- ✓ preload 脚本配置
- ✓ TypeScript 编译无错误

### 2. 完整验证（启动应用测试）
```bash
cd frontend
./test-electron.sh
```

这会：
- ✓ 构建应用
- ✓ 启动 Electron 应用
- ✓ 等待你手动测试功能
- ✓ 关闭应用并显示日志

### 3. 构建桌面应用
```bash
make desktop
```

这会创建可分发的安装包。

---

## 常见验证点

### 必须验证的功能

- [ ] 应用正常启动，没有崩溃
- [ ] 窗口显示正确
- [ ] 侧边栏菜单可以切换页面
- [ ] 目标管理页面没有重复侧边栏
- [ ] 数据库状态显示为 "Connected"
- [ ] 可以添加新目标
- [ ] 可以删除目标
- [ ] 可以切换到扫描任务页面
- [ ] 可以切换到漏洞列表页面
- [ ] 可以切换到设置页面

### 验证 Electron API

在浏览器控制台（DevTools）中运行：
```javascript
// 检查 Electron API 是否可用
window.electronAPI

// 应该返回一个对象，包含以下属性：
// - getPlatform
// - getVersion
// - target
// - scan
// - vulnerability
// - database
// - nuclei
// - on
// - off
```

### 验证数据库连接

```javascript
// 在控制台运行
window.electronAPI.database.healthCheck().then(console.log)
// 应该返回: { success: true, data: { healthy: true, type: 'better-sqlite3' } }
```

---

## 开发模式说明

### 1. 纯浏览器模式（UI 开发）
```bash
npm run dev
```
- 访问 http://localhost:3000
- 用于 UI 样式开发
- **Electron API 不可用**

### 2. Electron 模式（完整功能）
```bash
npm run dev:electron
```
- 构建并启动完整应用
- **Electron API 完全可用**
- 修改代码需重新运行

### 3. Vite + Electron 混合模式
```bash
npm run dev:vite
```
- 同时运行 Vite 和 Electron
- **preload 不会加载**
- 仅用于特殊调试场景

---

## 故障排除

### 应用启动失败
```bash
# 查看错误日志
cat /tmp/holehunter-electron.log

# 检查构建产物
ls -la dist/
```

### Electron API 不可用
```bash
# 检查 preload 脚本
cat dist/preload/index.js | grep contextBridge

# 应该能看到 contextBridge.exposeInMainWorld
```

### 资源加载失败
```bash
# 检查 index.html 中的资源路径
cat dist/index.html | grep 'src='
# 应该是: src="./assets/..."
# 不应该是: src="/assets/..."
```

---

## 自动化测试（未来）

建议添加以下自动化测试：

1. **Playwright 测试** - UI 交互测试
2. **Jest 测试** - 单元测试
3. **ESLint** - 代码质量检查
4. **Prettier** - 代码格式检查
