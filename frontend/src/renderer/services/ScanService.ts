/**
 * ScanService - 扫描任务管理服务
 */

import { getDatabase, CreateScanRequest, ScanTask } from './database/DatabaseService';
import NucleiService, { NucleiResult } from './NucleiService';

export class ScanService {
  private db = getDatabase();
  private activeScans = new Map<number, NucleiService>();

  /**
   * 获取所有扫描任务
   */
  getScanTasks(limit?: number): ScanTask[] {
    return this.db.getScanTasks(limit);
  }

  /**
   * 获取单个扫描任务
   */
  getScanTask(id: number): ScanTask | null {
    return this.db.getScanTask(id);
  }

  /**
   * 创建扫描任务
   */
  async createScanTask(request: CreateScanRequest): Promise<ScanTask> {
    // 验证目标是否存在
    const target = this.db.getTarget(request.target_id);
    if (!target) {
      throw new Error('Target not found');
    }

    // 创建任务
    const taskId = this.db.createScanTask(request);
    return this.db.getScanTask(taskId)!;
  }

  /**
   * 启动扫描
   */
  async startScan(taskId: number): Promise<void> {
    const task = this.db.getScanTask(taskId);
    if (!task) {
      throw new Error('Scan task not found');
    }

    if (task.status === 'running') {
      throw new Error('Scan is already running');
    }

    // 获取目标信息
    const target = this.db.getTarget(task.target_id);
    if (!target) {
      throw new Error('Target not found');
    }

    // 更新状态为 running
    this.db.updateScanStatus(taskId, 'running');
    this.db.updateScanProgress(taskId, 0, 0, 'Initializing...');

    // 创建扫描引擎服务实例
    const nuclei = new NucleiService();
    this.activeScans.set(taskId, nuclei);

    // 监听结果
    nuclei.on('result', (result: NucleiResult) => {
      // 保存漏洞到数据库
      this.db.insertVulnerability({
        task_id: taskId,
        template_id: result.template,
        severity: result.severity,
        name: result.info?.name || result.template,
        description: result.info?.description,
        url: result.matched_at,
        matched_at: result.timestamp || new Date().toISOString(),
        request_response: JSON.stringify({
          request: result.request,
          response: result.response,
          headers: result.response_headers,
        }),
        false_positive: false,
        cve: result.cve?.join(','),
        cvss: result.cvss,
      });

      // 更新进度
      const currentResults = nuclei.getResults();
      this.db.updateScanProgress(taskId, 0, currentResults.length, result.template);
    });

    // 监听错误
    nuclei.on('error', (error: string) => {
      console.error('Scan error:', error);
    });

    try {
      // 执行扫描
      const results = await nuclei.scan({
        target: target.url,
        templates: task.templates_used.length > 0 ? task.templates_used : ['cves', 'vulnerabilities'],
        rateLimit: 150,
        timeout: 10,
        retries: 1,
      });

      // 扫描完成
      this.db.completeScanTask(taskId, 'completed');
      console.log(`Scan ${taskId} completed. Found ${results.length} vulnerabilities.`);

    } catch (error) {
      // 扫描失败
      this.db.completeScanTask(taskId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      console.error(`Scan ${taskId} failed:`, error);

    } finally {
      // 清理
      this.activeScans.delete(taskId);
    }
  }

  /**
   * 取消扫描
   */
  cancelScan(taskId: number): void {
    const nuclei = this.activeScans.get(taskId);
    if (nuclei) {
      nuclei.cancel();
      this.db.completeScanTask(taskId, 'cancelled');
      this.activeScans.delete(taskId);
    }
  }

  /**
   * 删除扫描任务
   */
  deleteScanTask(id: number): void {
    // 如果任务正在运行，先取消
    const nuclei = this.activeScans.get(id);
    if (nuclei) {
      nuclei.cancel();
      this.activeScans.delete(id);
    }

    // 删除任务（级联删除漏洞结果）
    this.db.deleteScanTask(id);
  }

  /**
   * 获取扫描进度
   */
  getScanProgress(taskId: number): { progress: number; executed: number; current?: string } {
    const task = this.db.getScanTask(taskId);
    if (!task) {
      throw new Error('Scan task not found');
    }

    return {
      progress: task.progress,
      executed: task.executed_templates,
      current: task.current_template,
    };
  }

  /**
   * 检查任务是否正在运行
   */
  isTaskRunning(taskId: number): boolean {
    return this.activeScans.has(taskId);
  }
}

export default new ScanService();
