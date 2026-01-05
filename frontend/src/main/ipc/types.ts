/**
 * IPC 通信协议类型定义
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

// 扫描相关
export interface ScanTask {
  id: number;
  target_id: number;
  target_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_template?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface ScanConfig {
  templates: string[];
  severity: string[];
  rate_limit: number;
  concurrency: number;
  timeout: number;
  retries: number;
}

export interface CreateScanRequest {
  target_ids: number[];
  config: ScanConfig;
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
  discovered_at: string;
  is_false_positive: boolean;
  target_id: number;
  scan_id: number;
}

// 数据库相关
export interface DatabaseHealthCheck {
  healthy: boolean;
  type: string;
  message?: string;
}

// IPC 通道名称
export const IPC_CHANNELS = {
  // 目标管理
  TARGET_GET_ALL: 'target:getAll',
  TARGET_GET_BY_ID: 'target:getById',
  TARGET_CREATE: 'target:create',
  TARGET_UPDATE: 'target:update',
  TARGET_DELETE: 'target:delete',
  TARGET_BATCH_DELETE: 'target:batchDelete',

  // 扫描管理
  SCAN_CREATE: 'scan:create',
  SCAN_CANCEL: 'scan:cancel',
  SCAN_GET_ALL: 'scan:getAll',
  SCAN_GET_BY_ID: 'scan:getById',
  SCAN_GET_PROGRESS: 'scan:getProgress',
  SCAN_GET_LOGS: 'scan:getLogs',

  // 漏洞管理
  VULN_GET_ALL: 'vuln:getAll',
  VULN_GET_BY_ID: 'vuln:getById',
  VULN_UPDATE: 'vuln:update',
  VULN_MARK_FALSE_POSITIVE: 'vuln:markFalsePositive',
  VULN_DELETE: 'vuln:delete',

  // 数据库
  DB_HEALTH_CHECK: 'db:healthCheck',
  DB_GET_STATS: 'db:getStats',

  // 应用
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PLATFORM: 'app:getPlatform',
} as const;

// IPC 请求/响应类型
export type IPCRequest =
  | { channel: typeof IPC_CHANNELS.TARGET_GET_ALL }
  | { channel: typeof IPC_CHANNELS.TARGET_GET_BY_ID; params: { id: number } }
  | { channel: typeof IPC_CHANNELS.TARGET_CREATE; params: CreateTargetRequest }
  | { channel: typeof IPC_CHANNELS.TARGET_UPDATE; params: { id: number; data: UpdateTargetRequest } }
  | { channel: typeof IPC_CHANNELS.TARGET_DELETE; params: { id: number } }
  | { channel: typeof IPC_CHANNELS.TARGET_BATCH_DELETE; params: { ids: number[] } }
  | { channel: typeof IPC_CHANNELS.SCAN_CREATE; params: CreateScanRequest }
  | { channel: typeof IPC_CHANNELS.SCAN_CANCEL; params: { id: number } }
  | { channel: typeof IPC_CHANNELS.DB_HEALTH_CHECK };

export type IPCResponse<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

// IPC 事件（从主进程到渲染进程）
export interface IPCEvents {
  'scan-started': { scanId: number };
  'scan-progress': { scanId: number; progress: number; currentTemplate?: string; totalTemplates: number; completedTemplates: number; findings: number };
  'scan-finding': { scanId: number; finding: any };
  'scan-completed': { scanId: number; status: string; findings: number };
  'scan-error': { scanId: number; error: string };
  'scan-log': { scanId: number; timestamp: string; level: string; message: string };
}
