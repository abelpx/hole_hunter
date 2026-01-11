/**
 * IPC 服务层（渲染进程）
 * 封装所有与主进程的通信
 */

import {
  Target,
  Vulnerability,
  ScanTask,
  CreateTargetRequest,
  UpdateTargetRequest,
  CreateScanRequest,
  HttpRequest,
  HttpResponse,
  CreateHttpRequest,
  BruteTask,
  BrutePayloadSet,
  BruteResult,
} from '../types';

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

  // ==================== HTTP 重放 ====================

  async getAllHttpRequests(): Promise<HttpRequest[]> {
    const result = await this.invoke(() => this.electronAPI.replay.getAll()) as IPCResponse<HttpRequest[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get HTTP requests');
    }
    return result.data || [];
  }

  async createHttpRequest(data: CreateHttpRequest): Promise<HttpRequest> {
    const result = await this.invoke(() => this.electronAPI.replay.create(data)) as IPCResponse<HttpRequest>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to create HTTP request');
    }
    return result.data;
  }

  async updateHttpRequest(id: number, data: Partial<CreateHttpRequest>): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.replay.update(id, data)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to update HTTP request');
    }
  }

  async deleteHttpRequest(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.replay.delete(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete HTTP request');
    }
  }

  async sendHttpRequest(id: number): Promise<HttpResponse> {
    const result = await this.invoke(() => this.electronAPI.replay.send(id)) as IPCResponse<HttpResponse>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to send HTTP request');
    }
    return result.data;
  }

  async getHttpResponseHistory(requestId: number): Promise<HttpResponse[]> {
    const result = await this.invoke(() => this.electronAPI.replay.getResponses(requestId)) as IPCResponse<HttpResponse[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get response history');
    }
    return result.data || [];
  }

  async importHttpRequest(data: { data: string; type: 'curl' | 'http' }): Promise<HttpRequest> {
    const result = await this.invoke(() => this.electronAPI.replay.import(data)) as IPCResponse<HttpRequest>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to import HTTP request');
    }
    return result.data;
  }

  // ==================== 暴力破解 ====================

  async getAllBruteTasks(): Promise<BruteTask[]> {
    const result = await this.invoke(() => this.electronAPI.brute.getAll()) as IPCResponse<BruteTask[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get brute tasks');
    }
    return result.data || [];
  }

  async getBruteTask(id: number): Promise<BruteTask> {
    const result = await this.invoke(() => this.electronAPI.brute.getById(id)) as IPCResponse<BruteTask>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get brute task');
    }
    return result.data;
  }

  async createBruteTask(data: any): Promise<BruteTask> {
    const result = await this.invoke(() => this.electronAPI.brute.create(data)) as IPCResponse<BruteTask>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to create brute task');
    }
    return result.data;
  }

  async startBruteTask(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.brute.start(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to start brute task');
    }
  }

  async cancelBruteTask(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.brute.cancel(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to cancel brute task');
    }
  }

  async deleteBruteTask(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.brute.delete(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete brute task');
    }
  }

  async getBruteTaskResults(id: number): Promise<BruteResult[]> {
    const result = await this.invoke(() => this.electronAPI.brute.getResults(id)) as IPCResponse<BruteResult[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get brute task results');
    }
    return result.data || [];
  }

  async getAllBrutePayloadSets(): Promise<BrutePayloadSet[]> {
    const result = await this.invoke(() => this.electronAPI.brute.getAllPayloadSets()) as IPCResponse<BrutePayloadSet[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get brute payload sets');
    }
    return result.data || [];
  }

  async createBrutePayloadSet(data: any): Promise<BrutePayloadSet> {
    const result = await this.invoke(() => this.electronAPI.brute.createPayloadSet(data)) as IPCResponse<BrutePayloadSet>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to create brute payload set');
    }
    return result.data;
  }

  // ==================== 报告管理 ====================

  async getAllReports(): Promise<any[]> {
    const result = await this.invoke(() => this.electronAPI.report.getAll()) as IPCResponse<any[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get reports');
    }
    return result.data || [];
  }

  async getReportById(id: number): Promise<any> {
    const result = await this.invoke(() => this.electronAPI.report.getById(id)) as IPCResponse<any>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get report');
    }
    return result.data;
  }

  async createReport(data: { scan_id: number; format: string; name: string }): Promise<any> {
    const result = await this.invoke(() => this.electronAPI.report.create(data)) as IPCResponse<any>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to create report');
    }
    return result.data;
  }

  async deleteReport(id: number): Promise<void> {
    const result = await this.invoke(() => this.electronAPI.report.delete(id)) as IPCResponse<void>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete report');
    }
  }

  async exportReport(data: {
    task_id?: number;
    target_id?: number;
    severity?: string[];
    format: 'json' | 'html' | 'csv' | 'pdf' | 'word';
  }): Promise<Blob> {
    const result = await this.invoke(() => this.electronAPI.report.export(data)) as IPCResponse<{ data: string; filename: string }>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to export report');
    }
    // Convert base64 data to Blob
    const byteCharacters = atob(result.data!.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/octet-stream' });
  }

  // ==================== 工具箱扩展工具 ====================

  // 端口扫描
  async scanPorts(options: {
    target: string;
    ports?: number[];
    timeout?: number;
    batch_size?: number;
  }): Promise<any[]> {
    // 调用后端工具 API
    const result = await this.invoke(() => this.electronAPI.tools.portScan(options)) as IPCResponse<any[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to scan ports');
    }
    return result.data || [];
  }

  async getCommonPorts(): Promise<number[]> {
    const result = await this.invoke(() => this.electronAPI.tools.getCommonPorts()) as IPCResponse<number[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get common ports');
    }
    return result.data || [];
  }

  // 域名爆破
  async bruteSubdomains(options: {
    domain: string;
    wordlist?: string[];
    timeout?: number;
    batch_size?: number;
  }): Promise<any[]> {
    const result = await this.invoke(() => this.electronAPI.tools.domainBrute(options)) as IPCResponse<any[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to brute subdomains');
    }
    return result.data || [];
  }

  async getDomainWordlist(): Promise<string[]> {
    const result = await this.invoke(() => this.electronAPI.tools.getDomainWordlist()) as IPCResponse<string[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get domain wordlist');
    }
    return result.data || [];
  }

  async getDomainRecords(domain: string, type: 'mx' | 'ns' | 'txt'): Promise<string[]> {
    const result = await this.invoke(() => this.electronAPI.tools.getDomainRecords(domain, type)) as IPCResponse<string[]>;
    if (!result.success) {
      throw new Error(result.error || 'Failed to get domain records');
    }
    return result.data || [];
  }
}

// 导出单例
export const ipcService = new IPCService();
