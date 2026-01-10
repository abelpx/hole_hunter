# API 文档

本文档描述 HoleHunter 后端 API 接口。

## 基础信息

- **Base URL**: `http://localhost:8888`
- **数据格式**: JSON
- **字符编码**: UTF-8

## 响应格式

### 成功响应

```json
{
  "data": { ... }
}
```

或

```json
{
  "success": true
}
```

### 错误响应

```json
{
  "error": "错误描述信息"
}
```

## 接口列表

### 基础接口

#### 健康检查

```http
GET /api/v1/health
```

**响应示例**:

```json
{
  "message": "HoleHunter backend is running",
  "status": "ok"
}
```

#### 获取配置

```http
GET /api/v1/config
```

#### 更新配置

```http
PUT /api/v1/config
Content-Type: application/json

{
  "server": {
    "port": "8888"
  },
  "nuclei": {
    "binary_path": "nuclei"
  }
}
```

### 目标管理

#### 获取目标列表

```http
GET /api/v1/targets
```

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "name": "测试目标",
      "url": "https://example.com",
      "description": "测试描述",
      "tags": ["test", "web"],
      "created_at": "2026-01-09T10:00:00Z",
      "updated_at": "2026-01-09T10:00:00Z"
    }
  ]
}
```

#### 创建目标

```http
POST /api/v1/targets
Content-Type: application/json

{
  "name": "测试目标",
  "url": "https://example.com",
  "description": "测试描述",
  "tags": ["test", "web"]
}
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

#### 获取目标详情

```http
GET /api/v1/targets/:id
```

#### 更新目标

```http
PUT /api/v1/targets/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  "url": "https://example.com",
  "description": "更新后的描述",
  "tags": ["test", "updated"]
}
```

**响应示例**:

```json
{
  "success": true
}
```

#### 删除目标

```http
DELETE /api/v1/targets/:id
```

**响应示例**:

```json
{
  "success": true
}
```

### 扫描管理

#### 获取扫描列表

```http
GET /api/v1/scans
```

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "target_id": 1,
      "status": "running",
      "strategy": "quick",
      "templates_used": ["cves", "exposures"],
      "started_at": "2026-01-09T10:00:00Z",
      "completed_at": null,
      "total_templates": 100,
      "executed_templates": 50,
      "progress": 50,
      "current_template": "http-misconfiguration",
      "error": null,
      "created_at": "2026-01-09T10:00:00Z"
    }
  ]
}
```

#### 创建扫描任务

```http
POST /api/v1/scans
Content-Type: application/json

{
  "target_id": 1,
  "strategy": "quick",
  "templates": ["cves", "exposures"],
  "options": {
    "rate_limit": 150,
    "timeout": 10,
    "concurrent": 5,
    "retries": 1
  }
}
```

**策略类型**:
- `quick` - 快速扫描
- `deep` - 深度扫描
- `custom` - 自定义扫描

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

#### 获取扫描详情

```http
GET /api/v1/scans/:id
```

#### 启动扫描

```http
POST /api/v1/scans/:id/start
```

**响应示例**:

```json
{
  "success": true
}
```

#### 取消扫描

```http
DELETE /api/v1/scans/:id
```

**响应示例**:

```json
{
  "success": true
}
```

### HTTP 请求重放

#### 获取所有 HTTP 请求

```http
GET /api/v1/replay/requests
```

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "name": "登录接口测试",
      "method": "POST",
      "url": "https://example.com/api/login",
      "headers": "[{\"key\":\"Content-Type\",\"value\":\"application/json\"}]",
      "body": "{\"username\":\"test\",\"password\":\"test123\"}",
      "content_type": "application/json",
      "tags": ["auth", "login"],
      "created_at": "2026-01-09T10:00:00Z",
      "updated_at": "2026-01-09T10:00:00Z"
    }
  ]
}
```

#### 获取单个 HTTP 请求

```http
GET /api/v1/replay/requests/:id
```

#### 创建 HTTP 请求

```http
POST /api/v1/replay/requests
Content-Type: application/json

{
  "name": "登录接口测试",
  "method": "POST",
  "url": "https://example.com/api/login",
  "headers": [
    {"key": "Content-Type", "value": "application/json"},
    {"key": "User-Agent", "value": "HoleHunter/1.0"}
  ],
  "body": "{\"username\":\"test\",\"password\":\"test123\"}",
  "content_type": "application/json",
  "tags": ["auth", "login"]
}
```

#### 更新 HTTP 请求

```http
PUT /api/v1/replay/requests/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  "method": "POST",
  "url": "https://example.com/api/login",
  "headers": [],
  "body": "{\"username\":\"admin\",\"password\":\"admin123\"}",
  "content_type": "application/json",
  "tags": ["auth", "login", "updated"]
}
```

#### 删除 HTTP 请求

```http
DELETE /api/v1/replay/requests/:id
```

#### 发送 HTTP 请求（重放）

```http
POST /api/v1/replay/requests/:id/send
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "response_id": 123,
    "status_code": 200,
    "status": "success",
    "response_time_ms": 145,
    "response_length": 356
  }
}
```

#### 获取请求的响应历史

```http
GET /api/v1/replay/requests/:id/responses
```

#### 获取单个响应详情

```http
GET /api/v1/replay/responses/:id
```

**响应示例**:

```json
{
  "data": {
    "id": 123,
    "request_id": 1,
    "status_code": 200,
    "status": "success",
    "headers": "[{\"key\":\"Content-Type\",\"value\":\"application/json\"}]",
    "body": "{\"token\":\"eyJhbGc...\"}",
    "response_time_ms": 145,
    "response_length": 356,
    "error": null,
    "created_at": "2026-01-09T10:05:00Z"
  }
}
```

### 爆破攻击

#### 获取所有爆破任务

```http
GET /api/v1/brute/tasks
```

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "name": "用户名密码爆破",
      "request_id": 1,
      "type": "multi-pitchfork",
      "status": "running",
      "total_payloads": 1000,
      "sent_payloads": 450,
      "success_count": 1,
      "failure_count": 449,
      "started_at": "2026-01-09T10:00:00Z",
      "completed_at": null,
      "created_at": "2026-01-09T10:00:00Z",
      "updated_at": "2026-01-09T10:05:00Z"
    }
  ]
}
```

#### 获取单个爆破任务

```http
GET /api/v1/brute/tasks/:id
```

#### 创建爆破任务

```http
POST /api/v1/brute/tasks
Content-Type: application/json

{
  "name": "用户名密码爆破",
  "request_id": 1,
  "type": "multi-pitchfork",
  "parameters": [
    {
      "name": "username",
      "type": "body",
      "position": "$.username",
      "payload_set_id": 1
    },
    {
      "name": "password",
      "type": "body",
      "position": "$.password",
      "payload_set_id": 2
    }
  ]
}
```

**任务类型**:
- `single` - 单参数爆破
- `multi-pitchfork` - 多参数爆破（Pitchfork 模式）
- `multi-cluster` - 多参数爆破（Cluster Bomb 模式）

#### 启动爆破任务

```http
POST /api/v1/brute/tasks/:id/start
```

#### 停止爆破任务

```http
POST /api/v1/brute/tasks/:id/stop
```

#### 获取爆破结果

```http
GET /api/v1/brute/tasks/:id/results
```

**查询参数**:
- `success_only` (可选) - 仅显示成功的结果：true/false
- `limit` (可选) - 返回结果数量限制

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "task_id": 1,
      "parameter_name": "password",
      "payload_value": "secret123",
      "status_code": 200,
      "response_time_ms": 120,
      "response_length": 450,
      "success": true,
      "matched_indicator": "token",
      "response_body": "{\"token\":\"abc...\"}",
      "created_at": "2026-01-09T10:02:30Z"
    }
  ]
}
```

### Payload 集管理

#### 获取所有 Payload 集

```http
GET /api/v1/brute/payload-sets
```

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "name": "常见用户名",
      "description": "Top 100 常见用户名列表",
      "type": "username",
      "payload_count": 100,
      "created_at": "2026-01-09T09:00:00Z",
      "updated_at": "2026-01-09T09:00:00Z"
    },
    {
      "id": 2,
      "name": "常见密码",
      "description": "Top 1000 常见密码列表",
      "type": "password",
      "payload_count": 1000,
      "created_at": "2026-01-09T09:00:00Z",
      "updated_at": "2026-01-09T09:00:00Z"
    }
  ]
}
```

#### 创建 Payload 集

```http
POST /api/v1/brute/payload-sets
Content-Type: application/json

{
  "name": "自定义用户名",
  "description": "项目特定用户名",
  "type": "custom",
  "payloads": [
    {"value": "admin", "weight": 1},
    {"value": "root", "weight": 1},
    {"value": "test", "weight": 0.5}
  ]
}
```

#### 更新 Payload 集

```http
PUT /api/v1/brute/payload-sets/:id
Content-Type: application/json

{
  "name": "更新后的名称",
  "description": "更新后的描述",
  "payloads": [
    {"value": "new_admin", "weight": 1}
  ]
}
```

#### 删除 Payload 集

```http
DELETE /api/v1/brute/payload-sets/:id
```

#### 获取 Payload 集的 Payload 列表

```http
GET /api/v1/brute/payload-sets/:id/payloads
```

### 漏洞管理

#### 获取漏洞列表

```http
GET /api/v1/vulnerabilities?task_id=1&severity=high
```

**查询参数**:
- `task_id` (可选) - 扫描任务ID
- `severity` (可选) - 严重程度过滤

**响应示例**:

```json
{
  "data": [
    {
      "id": 1,
      "task_id": 1,
      "template_id": "cve-2021-44228",
      "severity": "critical",
      "name": "Apache Log4j RCE",
      "description": "Apache Log4j 远程代码执行漏洞",
      "url": "https://example.com",
      "matched_at": "https://example.com/api",
      "request_response": "{}",
      "false_positive": false,
      "notes": "",
      "cve": "CVE-2021-44228",
      "cvss": 10.0,
      "created_at": "2026-01-09T10:00:00Z"
    }
  ]
}
```

#### 获取漏洞详情

```http
GET /api/v1/vulnerabilities/:id
```

#### 更新漏洞

```http
PUT /api/v1/vulnerabilities/:id
Content-Type: application/json

{
  "false_positive": false,
  "notes": "已验证"
}
```

#### 删除漏洞

```http
DELETE /api/v1/vulnerabilities/:id
```

### 统计数据

#### 仪表盘统计

```http
GET /api/v1/stats/dashboard
```

**响应示例**:

```json
{
  "total_targets": 10,
  "total_scans": 50,
  "total_vulnerabilities": 120,
  "recent_scans": [
    {
      "id": 1,
      "target_id": 1,
      "status": "completed",
      "strategy": "quick",
      "created_at": "2026-01-09T10:00:00Z"
    }
  ],
  "top_vulnerable_targets": [
    {
      "id": 1,
      "name": "测试目标",
      "url": "https://example.com",
      "vuln_count": 50
    }
  ]
}
```

#### 模板列表

```http
GET /api/v1/templates
```

#### 模板分类

```http
GET /api/v1/templates/categories
```

### WebSocket 连接

#### 建立 WebSocket 连接

```http
GET /api/v1/ws
```

升级为 WebSocket 连接后，服务器会实时推送以下事件：

#### 扫描进度更新

```json
{
  "type": "scan_progress",
  "data": {
    "task_id": 1,
    "status": "running",
    "total_templates": 1000,
    "executed_templates": 250,
    "progress": 25,
    "current_template": "cves/2021/CVE-2021-44228.yaml",
    "vuln_count": 5,
    "timestamp": "2026-01-09T10:00:00Z"
  }
}
```

#### 扫描完成

```json
{
  "type": "scan_completed",
  "data": {
    "task_id": 1,
    "status": "completed",
    "error": null,
    "duration": "2m30s"
  }
}
```

#### 扫描取消

```json
{
  "type": "scan_cancelled",
  "data": {
    "task_id": 1
  }
}
```

### 报告导出

#### 导出报告

```http
POST /api/v1/reports/export
Content-Type: application/json

{
  "task_id": 1,
  "target_id": null,
  "severity": ["critical", "high"],
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-31T23:59:59Z",
  "format": "json"
}
```

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| task_id | int | 否 | 扫描任务ID |
| target_id | int | 否 | 目标ID |
| severity | string[] | 否 | 严重程度过滤 |
| start_date | datetime | 否 | 开始日期 |
| end_date | datetime | 否 | 结束日期 |
| format | string | 是 | 导出格式：json/html/csv/pdf/word |

**JSON 格式响应**:

直接下载 JSON 文件，包含以下结构：

```json
{
  "generated_at": "2026-01-09T10:00:00Z",
  "total": 10,
  "summary": {
    "critical": 2,
    "high": 3,
    "medium": 3,
    "low": 1,
    "info": 1
  },
  "vulnerabilities": [
    {
      "id": 1,
      "task_id": 1,
      "template_id": "cves/2021/CVE-2021-44228",
      "severity": "critical",
      "name": "Apache Log4j RCE",
      "description": "Apache Log4j 远程代码执行漏洞",
      "url": "https://example.com",
      "matched_at": "/log",
      "cve": "CVE-2021-44228",
      "cvss": 10.0,
      "created_at": "2026-01-09T10:00:00Z"
    }
  ]
}
```

**HTML 格式响应**:

直接下载 HTML 文件，包含样式的完整报告。

**CSV 格式响应**:

直接下载 CSV 文件，适用于数据分析。

**PDF 格式响应**:

下载打印友好的 HTML 文件，可在浏览器中打开后使用"打印"功能另存为 PDF。文件已针对 A4 纸张优化，包含分页控制和中文字体支持。

**Word 格式响应**:

下载 RTF (Rich Text Format) 文件，Microsoft Word 原生支持。包含颜色标记和格式化文本，可直接在 Word 中编辑。

## 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 数据模型

### Target（目标）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 目标ID |
| name | string | 目标名称 |
| url | string | 目标URL |
| description | string | 目标描述 |
| tags | string[] | 标签数组 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### ScanTask（扫描任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 任务ID |
| target_id | int | 目标ID |
| status | string | 状态：pending/running/completed/failed/cancelled |
| strategy | string | 扫描策略 |
| templates_used | string[] | 使用的模板 |
| started_at | datetime | 开始时间 |
| completed_at | datetime | 完成时间 |
| total_templates | int | 总模板数 |
| executed_templates | int | 已执行模板数 |
| progress | int | 进度百分比 |
| current_template | string | 当前模板 |
| error | string | 错误信息 |
| created_at | datetime | 创建时间 |

### Vulnerability（漏洞）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 漏洞ID |
| task_id | int | 扫描任务ID |
| template_id | string | 模板ID |
| severity | string | 严重程度：critical/high/medium/low/info |
| name | string | 漏洞名称 |
| description | string | 漏洞描述 |
| url | string | 漏洞URL |
| matched_at | string | 匹配位置 |
| request_response | string | 请求响应 |
| false_positive | boolean | 是否误报 |
| notes | string | 备注 |
| cve | string | CVE编号 |
| cvss | float | CVSS评分 |
| created_at | datetime | 创建时间 |

### HTTPRequest（HTTP 请求）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 请求ID |
| name | string | 请求名称 |
| method | string | HTTP 方法：GET/POST/PUT/DELETE/PATCH |
| url | string | 请求URL |
| headers | string | 请求头（JSON 数组） |
| body | string | 请求体 |
| content_type | string | 内容类型 |
| tags | string[] | 标签数组 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### HTTPResponse（HTTP 响应）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 响应ID |
| request_id | int | 关联的请求ID |
| status_code | int | HTTP 状态码 |
| status | string | 状态：success/error |
| headers | string | 响应头（JSON 数组） |
| body | string | 响应体 |
| response_time_ms | int | 响应时间（毫秒） |
| response_length | int | 响应长度 |
| error | string | 错误信息（如果有） |
| created_at | datetime | 创建时间 |

### BruteTask（爆破任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 任务ID |
| name | string | 任务名称 |
| request_id | int | 关联的 HTTP 请求ID |
| type | string | 任务类型：single/multi-pitchfork/multi-cluster |
| status | string | 状态：pending/running/completed/cancelled/failed |
| total_payloads | int | 总 payload 数量 |
| sent_payloads | int | 已发送 payload 数量 |
| success_count | int | 成功数量 |
| failure_count | int | 失败数量 |
| started_at | datetime | 开始时间 |
| completed_at | datetime | 完成时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### BruteParameter（爆破参数）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 参数ID |
| task_id | int | 关联的爆破任务ID |
| name | string | 参数名称 |
| type | string | 参数类型：header/query/body/json |
| position | string | 参数位置（JSONPath 或路径） |
| payload_set_id | int | 关联的 Payload 集ID |

### BrutePayload（Payload）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | Payload ID |
| set_id | int | 关联的 Payload 集ID |
| value | string | Payload 值 |
| weight | float | 权重（用于排序） |
| created_at | datetime | 创建时间 |

### BrutePayloadSet（Payload 集）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | Payload 集ID |
| name | string | 集合名称 |
| description | string | 描述 |
| type | string | 类型：username/password/fuzz/custom |
| payload_count | int | Payload 数量 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### BruteResult（爆破结果）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 结果ID |
| task_id | int | 关联的爆破任务ID |
| parameter_name | string | 参数名称 |
| payload_value | string | Payload 值 |
| status_code | int | HTTP 状态码 |
| response_time_ms | int | 响应时间（毫秒） |
| response_length | int | 响应长度 |
| success | boolean | 是否成功 |
| matched_indicator | string | 匹配的成功指示器 |
| response_body | string | 响应体 |
| created_at | datetime | 创建时间 |
