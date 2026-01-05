# HoleHunter UI 功能完善与测试指南

## 概述

本文档提供了 HoleHunter 所有 UI 功能的详细说明、测试步骤和已知问题解决方案。

---

## 功能模块测试清单

### ✅ 1. 目标管理 (TargetsPage)

#### 功能列表
- [x] 添加目标
- [x] 编辑目标
- [x] 删除目标
- [x] 批量删除
- [x] 标签过滤
- [x] 搜索目标
- [x] 状态显示
- [x] 批量选择

#### 测试步骤
```
1. 点击"添加目标"按钮
2. 输入目标名称: "测试网站"
3. 输入 URL: "https://example.com"
4. 添加标签: ["测试", "演示"]
5. 保存
6. 验证目标出现在列表中
7. 点击目标卡片上的"扫描"按钮
8. 验证扫描配置模态框打开
```

#### 已知问题与解决方案
**问题**: Tag 组件使用了不存在的 `size` 属性
**解决**:
```tsx
// 错误
<Tag size="sm">{tag}</Tag>

// 正确
<Tag color="sky">{tag}</Tag>
```

---

### ✅ 2. 扫描管理 (ScansPage)

#### 功能列表
- [x] 创建扫描任务
- [x] 查看扫描进度
- [x] 查看扫描日志
- [x] 取消扫描
- [x] 删除扫描记录
- [x] 实时进度更新
- [x] 扫描状态显示

#### 测试步骤
```
1. 从目标列表选择一个目标
2. 点击"扫描"按钮
3. 在扫描配置模态框中:
   - 选择预设模板 (快速/深度/自定义)
   - 配置扫描参数:
     * 速率限制: 100 req/s
     * 并发数: 25
     * 超时: 30s
     * 重试次数: 1
4. 点击"开始扫描"
5. 观察进度条实时更新
6. 点击"查看日志"查看实时输出
7. 等待扫描完成
8. 查看扫描结果
```

#### 扫描预设说明
```typescript
const PRESETS = [
  {
    id: 'quick',
    name: '快速扫描',
    description: '仅扫描高危漏洞',
    severity: ['critical', 'high'],
    tags: ['cve', 'rce', 'sqli']
  },
  {
    id: 'deep',
    name: '深度扫描',
    description: '全面扫描所有漏洞',
    severity: ['critical', 'high', 'medium', 'low', 'info']
  },
  {
    id: 'cves',
    name: 'CVE 扫描',
    description: '仅扫描已知 CVE',
    tags: ['cve']
  },
  {
    id: 'misconfig',
    name: '配置错误',
    description: '检测配置问题',
    tags: ['misconfig', 'exposure']
  },
  {
    id: 'technology',
    name: '技术探测',
    description: '探测使用的技术',
    tags: ['tech']
  },
  {
    id: 'panels',
    name: '面板扫描',
    description: '扫描管理面板',
    tags: ['panel', 'admin', 'dashboard']
  },
  {
    id: 'custom',
    name: '自定义',
    description: '完全自定义扫描',
    severity: undefined,
    tags: undefined
  }
];
```

#### 已知问题与解决方案
**问题**: `CreateScanRequest` 类型与实际使用不匹配
**解决**: 确保使用正确的类型定义
```typescript
// 正确的类型
interface CreateScanRequest {
  target_id: number;
  target_name: string;
  config: ScanConfigOptions;
}

interface ScanConfigOptions {
  severity?: string[];
  tags?: string[];
  excludeTags?: string[];
  rateLimit?: number;
  concurrency?: number;
  timeout?: number;
  retries?: number;
  headers?: string[];
}
```

---

### ✅ 3. 漏洞管理 (VulnPage)

#### 功能列表
- [x] 查看漏洞列表
- [x] 按严重程度过滤
- [x] 按目标过滤
- [x] 按标签过滤
- [x] 搜索漏洞
- [x] 查看漏洞详情
- [x] 标记误报
- [x] 批量操作
- [x] 导出报告

#### 测试步骤
```
1. 完成一次扫描后进入"漏洞列表"
2. 查看漏洞卡片显示:
   - 漏洞名称
   - 严重程度 (带颜色标识)
   - CVSS 评分
   - CVE 编号
   - 标签
   - 发现时间
3. 使用过滤器:
   - 选择严重程度: "Critical"
   - 选择标签: "cve"
   - 观察列表更新
4. 使用搜索:
   - 输入关键词: "sql"
   - 观察结果过滤
5. 点击漏洞卡片查看详情
6. 在详情页中:
   - 查看完整描述
   - 查看参考链接
   - 查看请求/响应
   - 标记为误报 (如有需要)
7. 使用批量操作:
   - 选择多个漏洞
   - 批量标记误报
   - 批量导出
```

#### 严重程度颜色配置
```typescript
const severityConfig = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: Shield
  },
  high: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: AlertTriangle
  },
  medium: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: AlertCircle
  },
  low: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Info
  },
  info: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    icon: FileText
  }
};
```

#### 已知问题与解决方案
**问题**: `discovered_at` vs `created_at` 字段名不一致
**解决**: 统一使用 `discovered_at` 字段
```typescript
// 正确的 Vulnerability 类型
interface Vulnerability {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  url: string;
  template_id: string;
  cve?: string[];
  cvss?: number;
  description: string;
  reference?: string[];
  tags: string[];
  target_id: number;
  scan_id: number;
  discovered_at: string;  // 使用 discovered_at
  is_false_positive: boolean;
}
```

---

### ✅ 4. 仪表板 (DashboardPage)

#### 功能列表
- [x] 关键指标统计
- [x] 漏洞分布图表
- [x] 扫描趋势图
- [x] 最近活动
- [x] 自动刷新 (30秒)

#### 测试步骤
```
1. 打开仪表板
2. 查看 6 个统计卡片:
   - 总目标数
   - 总扫描数
   - 总漏洞数
   - Critical 漏洞数
   - High 漏洞数
   - 活跃扫描数
3. 查看"漏洞分布"图表:
   - 条形图显示各等级漏洞数量
   - 或圆环图显示占比
4. 查看"扫描趋势"图表:
   - 显示最近 7 天的扫描数量
   - 显示发现的漏洞数量
5. 查看"最近活动":
   - 显示最近的扫描任务
   - 显示发现的漏洞
   - 带相对时间显示 (如"5分钟前")
6. 等待 30 秒，观察自动刷新
```

#### 统计卡片实现
```typescript
<StatCard
  title="总目标数"
  value={stats.total_targets}
  icon={<Target className="w-5 h-5" />}
  trend="+5"
/>

<StatCard
  title="总漏洞数"
  value={stats.total_vulnerabilities}
  icon={<Shield className="w-5 h-5" />}
/>
```

#### 图表实现 (纯 CSS/SVG)
```typescript
// 漏洞分布条形图
<VulnChart
  data={vulnStats}
  type="bar"
/>

// 漏洞分布圆环图
<VulnChart
  data={vulnStats}
  type="donut"
/>

// 扫描趋势图
<ScanChart
  data={trendData}
/>
```

---

### ✅ 5. 设置页面 (SettingsPage)

#### 功能列表
- [x] 通用设置
- [x] Nuclei 配置
- [x] 数据库管理
- [x] 外观设置
- [x] 导入/导出配置
- [x] 重置配置

#### 测试步骤
```
1. 打开"设置"页面
2. 测试"通用设置":
   - 切换语言 (中文/English)
   - 启用自动刷新
   - 设置刷新间隔 (30秒)
   - 启用通知
   - 选择日志级别 (info/warning/error)
3. 测试"Nuclei 配置":
   - 输入 Nuclei 路径
   - 点击"验证路径"按钮
   - 配置模板路径
   - 启用自动更新模板
   - 调整扫描参数滑块
4. 测试"数据库管理":
   - 查看数据库路径 (只读)
   - 启用自动备份
   - 设置备份间隔 (7天)
   - 设置最大备份数 (10)
   - 设置数据保留天数 (90天)
5. 测试"外观设置":
   - 切换主题 (深色/浅色/跟随系统)
   - 选择主题色 (5种颜色)
   - 调整字体大小 (小/中/大)
   - 折叠侧边栏
   - 禁用动画
6. 测试"导入/导出":
   - 点击"导出设置"下载 JSON 文件
   - 点击"导入设置"上传配置
   - 验证配置恢复成功
7. 测试"重置":
   - 点击"重置为默认"
   - 确认重置
   - 验证设置恢复默认
```

#### 设置持久化
```typescript
// Zustand + Persist 中间件
persist(
  (set, get) => ({
    settings: defaultSettings,
    updateGeneralSettings: async (newSettings) => {
      const validation = validateSettings({
        ...get().settings,
        general: newSettings
      });
      if (!validation.valid) {
        throw new Error(validation.errors[0]);
      }
      set({ settings: { ...get().settings, general: newSettings } });
    },
    // ...
  }),
  {
    name: 'settings-storage',
    partialize: (state) => ({ settings: state.settings })
  }
)
```

---

## 数据流测试

### 1. 目标创建流程
```
用户输入 → TargetsPage → targetStore.createTarget()
    ↓
IPCService.createTarget() → window.electronAPI.target.create()
    ↓
主进程 IPC Handler → DatabaseManager.createTarget()
    ↓
SQLite INSERT → 返回 ID
    ↓
返回结果 → 更新 Store → UI 更新
```

### 2. 扫描执行流程
```
用户配置扫描 → ScanConfigModal → 选择预设/参数
    ↓
ScansPage → scanStore.createScan()
    ↓
IPCService.createScan() → window.electronAPI.scan.create()
    ↓
主进程: ScanManager.createAndStartScan()
    ↓
DatabaseManager.createScanTask() → 获取 ID
    ↓
NucleiService.startScan() → spawn Nuclei 进程
    ↓
实时解析 stdout/stderr → 更新进度
    ↓
发现漏洞 → 解析 JSON → DatabaseManager.insertVulnerability()
    ↓
发送 IPC 事件 → 渲染进程更新 UI
    ↓
扫描完成 → 更新任务状态
```

### 3. 数据库持久化测试
```typescript
// 测试 SQLite 持久化
async function testPersistence() {
  // 1. 创建目标
  const target = await db.createTarget({
    name: '测试目标',
    url: 'https://example.com',
    tags: ['test']
  });

  // 2. 验证保存
  const saved = await db.getTargetById(target.id);
  console.assert(saved.name === '测试目标');

  // 3. 关闭数据库
  await db.close();

  // 4. 重新打开
  await db.initialize();

  // 5. 验证数据仍在
  const reloaded = await db.getTargetById(target.id);
  console.assert(reloaded.name === '测试目标');
}
```

---

## TypeScript 类型错误修复

### 当前状态
- **总错误数**: ~60 个
- **主要类型**: 未使用变量、类型不匹配、可选属性

### 关键修复
1. ✅ 主进程事件处理器类型
2. ✅ IPC Response 类型
3. ✅ Vulnerability 字段统一
4. ✅ Nuclei API 类型定义
5. ⏳ 未使用导入清理 (进行中)

### 临时解决方案
如果类型错误阻止构建，可以使用:
```bash
# 在 frontend/ 目录创建 tsconfig.temp.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "skipLibCheck": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}

# 使用临时配置构建
npx tsc -p tsconfig.temp.json
```

---

## 功能验证检查清单

### 基础功能
- [ ] 应用能正常启动
- [ ] 数据库初始化成功
- [ ] 可以添加目标
- [ ] 可以创建扫描任务
- [ ] 可以查看漏洞列表
- [ ] 可以查看仪表板统计
- [ ] 可以修改设置

### 高级功能
- [ ] 批量删除目标
- [ ] 实时扫描进度更新
- [ ] 漏洞搜索和过滤
- [ ] 导出漏洞报告
- [ ] 导入/导出设置
- [ ] 主题切换生效
- [ ] 自动刷新工作

### 数据完整性
- [ ] 目标保存到数据库
- [ ] 扫描记录持久化
- [ ] 漏洞数据完整
- [ ] 设置重启后保留
- [ ] 关闭重开后数据仍在

---

## 性能测试

### 响应时间
- 页面切换: < 100ms
- 目标列表加载: < 500ms
- 漏洞列表加载: < 500ms
- 仪表板加载: < 1s
- 搜索过滤: < 100ms

### 并发测试
```bash
# 测试多个并发扫描
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/v1/scans \
    -H "Content-Type: application/json" \
    -d '{"target_ids":[1],"config":{"severity":["critical"]}}'
done
```

### 内存测试
- 打开应用后内存占用: < 200MB
- 添加 100 个目标后: < 250MB
- 添加 1000 个漏洞后: < 300MB
- 运行 5 个扫描任务: < 400MB

---

## 用户流程测试

### 新手用户完整流程
```
1. 启动应用
2. 查看"仪表板"了解系统状态
3. 进入"目标管理"添加第一个目标
4. 配置并启动第一次扫描
5. 在"扫描管理"中查看进度
6. 扫描完成后在"漏洞列表"查看结果
7. 查看单个漏洞的详细信息
8. 必要时标记误报
9. 导出报告
10. 在"设置"中调整配置
```

### 高级用户工作流程
```
1. 批量导入目标 (通过 API 或手动)
2. 使用预设快速扫描所有目标
3. 根据漏洞严重程度优先处理
4. 使用过滤器深入分析特定类型漏洞
5. 批量标记已知误报
6. 配置自动扫描计划 (如需要)
7. 定期导出报告存档
8. 调整扫描参数优化性能
```

---

## 已知限制

### 当前版本限制
1. **多语言**: 仅框架支持，实际翻译待完成
2. **用户认证**: 未实现
3. **团队协作**: 未实现
4. **云同步**: 未实现
5. **WebSocket**: 部分支持

### 技术限制
1. **Nuclei 性能**: 受目标响应速度影响
2. **数据库**: SQLite 单文件，不适合超大规模
3. **并发扫描**: 建议 <= 5 个同时运行

---

## 下一步优化

### 短期 (1周内)
- [ ] 修复所有 TypeScript 类型错误
- [ ] 添加单元测试
- [ ] 完善错误处理
- [ ] 优化加载性能

### 中期 (1月内)
- [ ] 添加多语言支持
- [ ] 实现用户认证
- [ ] 添加报告模板
- [ ] 性能优化

### 长期 (3月内)
- [ ] 团队协作功能
- [ ] 插件系统
- [ ] 云端同步
- [ ] 移动端适配

---

## 技术支持

### 问题报告
如发现问题，请提供:
1. 操作步骤
2. 预期结果
3. 实际结果
4. 错误日志
5. 截图 (如有)

### 调试模式
```bash
# 开启详细日志
export HOLEHUNTER_LOG_LEVEL=debug

# 开启 Electron 开发者工具
# 在应用中按 Cmd+Option+I (macOS) 或 Ctrl+Shift+I (Windows/Linux)
```

---

**最后更新**: 2025-01-04
**版本**: 1.0.0
**状态**: 功能完整，持续优化中
