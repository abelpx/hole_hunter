/**
 * IPC 服务层（渲染进程）
 * 封装所有与主进程的通信
 */

import { Target, Vulnerability, ScanTask, CreateTargetRequest, UpdateTargetRequest, CreateScanRequest } from '../types';

// IPC响应类型
interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

class IPCService {
  private electronAPI: any;

  constructor() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.electronAPI = window.electronAPI;
    } else {
      console.warn('electronAPI not found. Running in browser mode?');
    }
  }

  private async invoke<T>(method: () => Promise<T>): Promise<T> {
    if (!this.electronAPI) {
      throw new Error('Electron API not available');
    }
    return method();
  }

  // ==================== 目标管理 ====================

  async getAllTargets(): Promise<Target[]> {
    const result = await this.invoke(() => this.electronAPI.target.getAll()) as IPCResponse<Target[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get targets');
    }
    return result.data!;
  }

  async getTargetById(id: number): Promise<Target> {
    const result = await this.invoke(() => this.electronAPI.target.getById(id)) as IPCResponse<Target>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get target');
    }
    return result.data!;
  }

  async createTarget(data: CreateTargetRequest): Promise<Target> {
    const result = await this.invoke(() => this.electronAPI.target.create(data)) as IPCResponse<Target>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to create target');
    }
    return result.data!;
  }

  async updateTarget(id: number, data: UpdateTargetRequest): Promise<Target> {
    const result = await this.invoke(() => this.electronAPI.target.update(id, data)) as IPCResponse<Target>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to update target');
    }
    return result.data!;
  }

  async deleteTarget(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.target.delete(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete target');
    }
  }

  async batchDeleteTargets(ids: number[]): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.target.batchDelete(ids)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to batch delete targets');
    }
  }

  // ==================== 扫描管理 ====================

  async createScan(data: CreateScanRequest): Promise<ScanTask> {
    const result = await this.invoke(() => this.electronAPI.scan.create(data)) as IPCResponse<ScanTask>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to create scan');
    }
    return result.data!;
  }

  async cancelScan(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.scan.cancel(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel scan');
    }
  }

  async getAllScans(): Promise<ScanTask[]> {
    const result = await this.invoke(() => this.electronAPI.scan.getAll()) as IPCResponse<ScanTask[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get scans');
    }
    return result.data!;
  }

  async getScanById(id: number): Promise<ScanTask> {
    const result = await this.invoke(() => this.electronAPI.scan.getById(id)) as IPCResponse<ScanTask>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get scan');
    }
    return result.data!;
  }

  async getScanProgress(id: number): Promise<any> {
    const result = await this.invoke(() => this.electronAPI.scan.getProgress(id)) as IPCResponse<any>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get scan progress');
    }
    return result.data;
  }

  async getScanLogs(id: number): Promise<string[]> {
    const result = await this.invoke(() => this.electronAPI.scan.getLogs(id)) as IPCResponse<string[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get scan logs');
    }
    return result.data!;
  }

  // ==================== 漏洞管理 ====================

  async getAllVulnerabilities(): Promise<Vulnerability[]> {
    const result = await this.invoke(() => this.electronAPI.vulnerability.getAll()) as IPCResponse<Vulnerability[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get vulnerabilities');
    }
    return result.data!;
  }

  async getVulnerabilityById(id: string): Promise<Vulnerability> {
    const result = await this.invoke(() => this.electronAPI.vulnerability.getById(id)) as IPCResponse<Vulnerability>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get vulnerability');
    }
    return result.data!;
  }

  async updateVulnerability(id: string, data: any): Promise<Vulnerability> {
    const result = await this.invoke(() => this.electronAPI.vulnerability.update(id, data)) as IPCResponse<Vulnerability>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to update vulnerability');
    }
    return result.data!;
  }

  async markVulnerabilityAsFalsePositive(id: string, isFalsePositive: boolean): Promise<Vulnerability> {
    const result = await this.invoke(() => this.electronAPI.vulnerability.markFalsePositive(id, isFalsePositive)) as IPCResponse<Vulnerability>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark vulnerability');
    }
    return result.data!;
  }

  async deleteVulnerability(id: string): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.vulnerability.delete(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete vulnerability');
    }
  }

  // ==================== 数据库 ====================

  async checkDatabaseHealth(): Promise<{ healthy: boolean; type: string; message?: string }> {
    const result = await this.invoke(() => this.electronAPI.database.healthCheck()) as IPCResponse<{ healthy: boolean; type: string; message?: string }>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to check database health');
    }
    return result.data!;
  }

  async getDatabaseStats(): Promise<any> {
    const result = await this.invoke(() => this.electronAPI.database.getStats()) as IPCResponse<any>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get database stats');
    }
    return result.data;
  }

  // ==================== 应用信息 ====================

  async getAppVersion(): Promise<string> {
    const result = await this.invoke(() => this.electronAPI.getVersion()) as IPCResponse<string>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get app version');
    }
    return result.data!;
  }

  getPlatform(): string {
    if (!this.electronAPI) {
      return 'web';
    }
    return this.electronAPI.getPlatform();
  }

  // ==================== 事件监听 ====================

  onScanProgress(callback: (data: { taskId: number; progress: number; currentTemplate: string }) => void): void {
    if (this.electronAPI) {
      this.electronAPI.on('scan:progress', callback);
    }
  }

  onScanLog(callback: (data: { taskId: number; log: string; timestamp: string }) => void): void {
    if (this.electronAPI) {
      this.electronAPI.on('scan:log', callback);
    }
  }

  onVulnFound(callback: (data: { vuln: Vulnerability }) => void): void {
    if (this.electronAPI) {
      this.electronAPI.on('vuln:found', callback);
    }
  }
}

// 导出单例
export const ipcService = new IPCService();
