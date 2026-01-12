/**
 * 共享类型定义
 * 用于 main 和 renderer 进程之间通信
 */

// 目标相关
export interface Target {
  id: number;
  name: string;
  url: string;
  tags: string[];
  status: 'active' | 'inactive' | 'error';
  last_checked?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTargetRequest {
  name: string;
  url: string;
  tags?: string[];
}

export interface UpdateTargetRequest {
  name?: string;
  url?: string;
  tags?: string[];
  status?: 'active' | 'inactive' | 'error';
}

// 漏洞相关
export interface Vulnerability {
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
  discovered_at: string;
  is_false_positive: boolean;
}

// 扫描相关
export interface ScanTask {
  id: number;
  name?: string;
  target_id: number;
  target_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  strategy?: string;
  templates_used?: string[];
  progress: number;
  total_templates?: number;
  executed_templates?: number;
  current_template?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  config?: any;
  created_at?: string;
}

export interface CreateScanRequest {
  name?: string;
  target_id: number;
  strategy: string;
  templates?: string[];
}

export interface ScanConfigOptions {
  severity?: string[];
  tags?: string[];
  excludeTags?: string[];
  rateLimit?: number;
  concurrency?: number;
  timeout?: number;
  retries?: number;
  headers?: string[];
}

// 扫描日志
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

// HTTP 重放相关
export interface HttpHeader {
  key: string;
  value: string;
}

export interface HttpRequest {
  id: number;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: string; // JSON string of HttpHeader[]
  body: string;
  content_type: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateHttpRequest {
  name?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: HttpHeader[];
  body?: string;
  content_type?: string;
  tags?: string[];
}

export interface HttpResponse {
  id: number;
  request_id: number;
  status_code: number;
  status_text: string;
  headers: string; // JSON string
  body: string;
  body_size: number;
  header_size: number;
  duration: number; // milliseconds
  timestamp: string;
  created_at: string;
}

// 暴力破解相关
export interface BruteTask {
  id: number;
  name: string;
  request_id: number;
  request_name?: string;
  type: 'single' | 'multi-pitchfork' | 'multi-cluster';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_payloads: number;
  sent_payloads: number;
  success_count: number;
  failure_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BruteParameter {
  id: number;
  task_id: number;
  name: string;
  type: 'header' | 'query' | 'body' | 'path';
  position: number;
  payload_set_id: number;
  created_at: string;
}

export interface BrutePayloadSet {
  id: number;
  name: string;
  type: 'dictionary' | 'number' | 'charset' | 'date';
  config?: string;
  created_at: string;
  payload_count?: number;
}

export interface BruteResult {
  id: number;
  task_id: number;
  param_name: string;
  payload: string;
  status: 'success' | 'failed';
  status_code?: number;
  response_length?: number;
  response_time: number;
  body?: string;
  error?: string;
  created_at: string;
}

export interface CreateBruteTaskRequest {
  name: string;
  request_id: number;
  type: 'single' | 'multi-pitchfork' | 'multi-cluster';
  parameters: {
    name: string;
    type: 'header' | 'query' | 'body' | 'path';
    position?: number;
    payload_set_id: number;
  }[];
  concurrency?: number;
  timeout?: number;
  delay?: number;
  retry_count?: number;
  success_rules?: {
    type: 'keyword' | 'status_code' | 'length' | 'regex';
    value: string;
    negate?: boolean;
  }[];
}

export interface CreatePayloadSetRequest {
  name: string;
  type: 'dictionary' | 'number' | 'charset' | 'date';
  config?: string;
  payloads?: string[];
}

// 自定义 POC 模板相关
export interface CustomTemplate {
  id: number;
  name: string;
  path: string;
  content?: string;
  enabled: boolean;
  created_at: string;
}

export interface CreateCustomTemplateRequest {
  name: string;
  content: string;
}

export interface UpdateCustomTemplateRequest {
  name?: string;
  content: string;
}

export interface ValidateTemplateResult {
  valid: boolean;
  error?: string;
  message?: string;
}

export interface CustomTemplateStats {
  total: number;
  enabled: number;
  disabled: number;
}

