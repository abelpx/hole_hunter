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
| format | string | 是 | 导出格式：json/html/csv |

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
