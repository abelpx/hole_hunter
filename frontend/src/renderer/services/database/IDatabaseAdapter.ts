/**
 * IDatabaseAdapter - 数据库适配器接口
 *
 * 统一不同数据库的访问接口
 *
 * 注意：此接口目前未被使用，所有数据库操作通过主进程的 DatabaseManager 完成
 * 保留此文件用于未来可能的扩展
 */

// 直接定义类型，避免依赖循环
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
  created_at?: string;
}

export interface Vulnerability {
  id: string;  // 使用 string 类型与主进程保持一致
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

export interface IDatabaseAdapter {
  /**
   * 初始化数据库
   */
  initialize(): Promise<void>;

  /**
   * 关闭数据库连接
   */
  close(): void;

  // ==================== 目标管理 ====================

  getTargets(): Promise<Target[]>;
  getTarget(id: number): Promise<Target | null>;
  createTarget(data: CreateTargetRequest): Promise<number>;
  updateTarget(id: number, data: UpdateTargetRequest): Promise<void>;
  deleteTarget(id: number): Promise<void>;

  // ==================== 扫描任务管理 ====================

  getScanTasks(limit?: number): Promise<ScanTask[]>;
  getScanTask(id: number): Promise<ScanTask | null>;
  createScanTask(data: CreateScanRequest): Promise<number>;
  updateScanStatus(id: number, status: ScanTask['status']): Promise<void>;
  updateScanProgress(
    id: number,
    progress: number,
    executedTemplates?: number,
    currentTemplate?: string
  ): Promise<void>;
  completeScanTask(
    id: number,
    status: 'completed' | 'failed' | 'cancelled',
    error?: string
  ): Promise<void>;
  deleteScanTask(id: number): Promise<void>;

  // ==================== 漏洞管理 ====================

  getVulnerabilities(filter?: {
    task_id?: number;
    severity?: string;
  }): Promise<Vulnerability[]>;
  insertVulnerability(
    data: any
  ): Promise<void>;
  insertVulnerabilities(
    vulnerabilities: any[]
  ): Promise<void>;
  updateVulnerability(
    id: number,
    data: { false_positive?: boolean; notes?: string }
  ): Promise<void>;
  deleteVulnerability(id: number): Promise<void>;

  // ==================== 统计查询 ====================

  getDashboardStats(): Promise<{
    total_targets: number;
    total_scans: number;
    total_vulnerabilities: number;
    severity_stats: Record<string, number>;
  }>;

  /**
   * 事务支持
   */
  transaction<T>(callback: () => Promise<T>): Promise<T>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;
}

// 类型定义（与 DatabaseService.ts 共享）
export interface CreateTargetRequest {
  name: string;
  url: string;
  description?: string;
  tags?: string[];
}

export interface UpdateTargetRequest extends Partial<CreateTargetRequest> {
  id: number;
}

export interface CreateScanRequest {
  target_id: number;
  strategy: 'quick' | 'deep' | 'custom';
  templates?: string[];
  options?: {
    rateLimit?: number;
    timeout?: number;
    concurrent?: number;
    retries?: number;
  };
}

