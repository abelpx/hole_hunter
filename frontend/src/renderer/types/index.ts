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
  target_id: number;
  target_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_template?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  config?: any;
}

export interface CreateScanRequest {
  target_id: number;
  target_name: string;
  config: ScanConfigOptions;
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
