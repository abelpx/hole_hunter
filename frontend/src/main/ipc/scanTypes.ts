/**
 * 扫描相关的类型定义
 */

import { NucleiConfig } from '../scanner/NucleiService';

// 创建扫描任务请求
export interface CreateScanRequest {
  target_id: number;
  target_name: string;
  config: ScanConfigOptions;
}

// 扫描配置选项（简化版，用于 UI）
export interface ScanConfigOptions {
  // 模板选择
  templates?: string[];
  severity?: string[];
  tags?: string[];
  excludeTags?: string[];

  // 扫描参数
  rateLimit?: number;
  concurrency?: number;
  timeout?: number;
  retries?: number;

  // 高级选项
  headers?: string[];
}

// 扫描任务详情（扩展版）
export interface ScanTaskDetail {
  id: number;
  target_id: number;
  target_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_template?: string;
  total_templates: number;
  completed_templates: number;
  findings_count: number;
  config: ScanConfigOptions;
  started_at?: string;
  completed_at?: string;
  error?: string;

  // 额外信息
  target_url?: string;
  duration?: number; // 秒
}

// 扫描日志条目
export interface ScanLogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: any;
}

// 扫描统计
export interface ScanStatistics {
  totalScans: number;
  runningScans: number;
  completedScans: number;
  failedScans: number;
  totalFindings: number;
  avgDuration: number;
}

// 将 ScanConfigOptions 转换为 NucleiConfig
export function toNucleiConfig(
  targetUrl: string,
  options: ScanConfigOptions
): NucleiConfig {
  return {
    targets: [targetUrl],
    templates: options.templates,
    severity: options.severity,
    tags: options.tags,
    excludeTags: options.excludeTags,
    rateLimit: options.rateLimit,
    concurrency: options.concurrency,
    timeout: options.timeout,
    retries: options.retries,
    headers: options.headers,
    skipDeps: true,
  };
}

// 预设模板组
export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  templates?: string[];
  severity?: string[];
  tags?: string[];
}

// 常用预设
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'full',
    name: '全量扫描',
    description: '使用所有模板进行完整扫描',
    severity: ['critical', 'high', 'medium', 'low', 'info'],
  },
  {
    id: 'critical-only',
    name: '仅严重漏洞',
    description: '仅扫描严重和高危漏洞',
    severity: ['critical', 'high'],
  },
  {
    id: 'cves',
    name: 'CVE 漏洞',
    description: '扫描已知的 CVE 漏洞',
    tags: ['cve'],
  },
  {
    id: 'exposures',
    name: '信息泄露',
    description: '扫描敏感信息泄露问题',
    tags: ['exposure'],
  },
  {
    id: 'misconfig',
    name: '配置错误',
    description: '检测配置错误和常见安全问题',
    tags: ['misconfig'],
  },
  {
    id: 'technologies',
    name: '技术栈识别',
    description: '识别使用的技术栈和版本',
    tags: ['tech'],
  },
  {
    id: 'quick',
    name: '快速扫描',
    description: '快速检测常见高危漏洞',
    severity: ['critical', 'high'],
    tags: ['cve', 'rce', 'sqli'],
  },
];
