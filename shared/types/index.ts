/**
 * HoleHunter Shared Type Definitions
 *
 * This file contains type definitions shared between frontend and backend.
 */

// ============================================================
// Core Types
// ============================================================

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ScanStrategy = 'quick' | 'deep' | 'custom';

// ============================================================
// Target Types
// ============================================================

export interface Target {
  id: number;
  name: string;
  url: string;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_scan?: string;
  vuln_count?: VulnCount;
}

export interface VulnCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface CreateTargetRequest {
  name: string;
  url: string;
  description?: string;
  tags?: string[];
}

export interface UpdateTargetRequest extends Partial<CreateTargetRequest> {
  id: number;
}

// ============================================================
// Scan Task Types
// ============================================================

export interface ScanTask {
  id: number;
  target_id: number;
  target?: Target;
  status: ScanStatus;
  strategy: ScanStrategy;
  templates_used: string[];
  started_at?: string;
  completed_at?: string;
  total_templates: number;
  executed_templates: number;
  progress: number; // 0-100
  current_template?: string;
  results?: Vulnerability[];
  error?: string;
}

export interface CreateScanRequest {
  target_id: number;
  strategy: ScanStrategy;
  templates?: string[];
  options?: ScanOptions;
}

export interface ScanOptions {
  rate?: number; // requests per second
  concurrency?: number;
  timeout?: number; // seconds
  retries?: number;
}

// ============================================================
// Vulnerability Types
// ============================================================

export interface Vulnerability {
  id: number;
  task_id: number;
  template_id: string;
  severity: SeverityLevel;
  name: string;
  description?: string;
  url: string;
  matched_at: string;
  request_response?: RequestResponse;
  false_positive: boolean;
  notes?: string;
  created_at: string;
  cve?: string;
  cvss?: number;
  references?: string[];
  tags?: string[];
}

export interface RequestResponse {
  request: string;
  response: string;
  response_headers?: Record<string, string>;
  status_code?: number;
}

export interface UpdateVulnerabilityRequest {
  id: number;
  false_positive?: boolean;
  notes?: string;
}

// ============================================================
// Template Types
// ============================================================

export interface Template {
  id: string;
  name: string;
  author: string;
  severity: SeverityLevel;
  tags: string[];
  description?: string;
  reference?: string[];
  file_path: string;
  enabled: boolean;
}

export interface TemplateCategory {
  name: string;
  count: number;
  templates: Template[];
}

// ============================================================
// Tool Types
// ============================================================

export interface ToolCategory {
  id: string;
  name: string;
  icon: string;
  tools: Tool[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
}

// ============================================================
// Configuration Types
// ============================================================

export interface AppConfig {
  nuclei_path: string;
  templates_path: string;
  default_rate: number;
  default_timeout: number;
  max_concurrent_scans: number;
  proxy?: ProxyConfig;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================
// Statistics Types
// ============================================================

export interface DashboardStats {
  total_targets: number;
  total_scans: number;
  total_vulnerabilities: number;
  recent_scans: ScanTask[];
  top_vulnerable_targets: TargetTopVuln[];
}

export interface TargetTopVuln {
  target: Target;
  vuln_count: number;
}

export interface SeverityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

// ============================================================
// Export Types
// ============================================================

export type ExportFormat = 'json' | 'html' | 'csv' | 'pdf';

export interface ExportRequest {
  task_id: number;
  format: ExportFormat;
  include_details: boolean;
  filter?: {
    severities?: SeverityLevel[];
    date_from?: string;
    date_to?: string;
  };
}

export interface ExportResult {
  file_path: string;
  format: ExportFormat;
  created_at: string;
}

// ============================================================
// Event Types (for IPC communication)
// ============================================================

export interface ScanProgressEvent {
  task_id: number;
  progress: number;
  executed_templates: number;
  total_templates: number;
  current_template: string;
}

export interface ScanCompletedEvent {
  task_id: number;
  status: 'completed' | 'failed';
  results?: Vulnerability[];
  error?: string;
}

export interface VulnerabilityFoundEvent {
  task_id: number;
  vulnerability: Vulnerability;
}
