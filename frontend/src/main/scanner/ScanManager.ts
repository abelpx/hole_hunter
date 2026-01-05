/**
 * 扫描管理服务
 * 协调数据库、NucleiService 和 IPC 通信
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { DatabaseManager } from '../database/DatabaseManager';
import { NucleiService, NucleiOutput, ScanProgress } from './NucleiService';
import {
  CreateScanRequest,
  ScanTaskDetail,
  toNucleiConfig,
} from '../ipc/scanTypes';

export class ScanManager {
  private static instance: ScanManager;
  private db: DatabaseManager;
  private nuclei: NucleiService;
  private scanLogs: Map<number, string[]> = new Map();

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.nuclei = NucleiService.getInstance();
    this.setupNucleiListeners();
  }

  static getInstance(): ScanManager {
    if (!ScanManager.instance) {
      ScanManager.instance = new ScanManager();
    }
    return ScanManager.instance;
  }

  /**
   * 设置 Nuclei 事件监听器
   */
  private setupNucleiListeners(): void {
    // 监听扫描开始
    this.nuclei.on('start', async (scanId: number) => {
      console.log(`Scan ${scanId} started`);

      await this.db.updateScanTask(scanId, {
        status: 'running',
        started_at: new Date().toISOString(),
      });

      // 发送 IPC 事件
      this.sendScanEvent('scan-started', { scanId });
    });

    // 监听扫描进度
    this.nuclei.on('progress', async (progress: ScanProgress) => {
      console.log(`Scan ${progress.scanId} progress: ${progress.progress.toFixed(2)}%`);

      await this.db.updateScanTask(progress.scanId, {
        progress: Math.round(progress.progress),
        current_template: progress.currentTemplate,
      });

      // 发送 IPC 事件
      this.sendScanEvent('scan-progress', progress);
    });

    // 监听漏洞发现
    this.nuclei.on('finding', async (scanId: number, finding: NucleiOutput) => {
      console.log(`Finding in scan ${scanId}:`, finding.info.name);

      // 存储漏洞到数据库
      await this.db.createVulnerability({
        id: `${scanId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: finding.info.name,
        severity: finding.info.severity,
        url: finding.url,
        template_id: finding.templateID,
        cve: finding.cve || [],
        cvss: finding.cvss,
        description: finding.info.description || '',
        reference: finding.info.reference || [],
        tags: finding.info.tags,
        target_id: 0, // 需要从 scan 中获取
        scan_id: scanId,
      });

      // 添加日志
      this.addScanLog(scanId, 'info', `Found: ${finding.info.name} (${finding.info.severity})`);

      // 发送 IPC 事件
      this.sendScanEvent('scan-finding', {
        scanId,
        finding,
      });
    });

    // 监听扫描完成
    this.nuclei.on('complete', async (scanId: number, result: ScanProgress) => {
      console.log(`Scan ${scanId} completed with ${result.findings} findings`);

      await this.db.updateScanTask(scanId, {
        status: result.status,
        progress: 100,
        completed_at: result.endTime,
      });

      // 发送 IPC 事件
      this.sendScanEvent('scan-completed', {
        scanId,
        status: result.status,
        findings: result.findings,
      });
    });

    // 监听扫描错误
    this.nuclei.on('error', async (scanId: number, error: string) => {
      console.error(`Scan ${scanId} error:`, error);

      await this.db.updateScanTask(scanId, {
        status: 'failed',
        error_message: error,
      });

      // 添加错误日志
      this.addScanLog(scanId, 'error', error);

      // 发送 IPC 事件
      this.sendScanEvent('scan-error', {
        scanId,
        error,
      });
    });
  }

  /**
   * 发送扫描事件到渲染进程
   */
  private sendScanEvent(channel: string, data: any): void {
    // 使用 BrowserWindow 发送事件（需要获取所有窗口）
    // 这里简化处理，实际应该通过 WindowManager
    const windows = require('../../main/window/WindowManager').WindowManager.getInstance().getAllWindows();
    windows.forEach((win: any) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  /**
   * 添加扫描日志
   */
  private addScanLog(scanId: number, level: string, message: string): void {
    if (!this.scanLogs.has(scanId)) {
      this.scanLogs.set(scanId, []);
    }

    const logs = this.scanLogs.get(scanId)!;
    logs.push(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);

    // 限制日志条数
    if (logs.length > 1000) {
      logs.shift();
    }

    // 发送日志事件
    this.sendScanEvent('scan-log', {
      scanId,
      timestamp: new Date().toISOString(),
      level,
      message,
    });
  }

  /**
   * 创建并启动扫描任务
   */
  async createAndStartScan(request: CreateScanRequest): Promise<number> {
    // 1. 获取目标信息
    const target = await this.db.getTargetById(request.target_id);
    if (!target) {
      throw new Error(`Target ${request.target_id} not found`);
    }

    // 2. 创建扫描任务记录
    const scanId = await this.db.createScanTask({
      target_id: request.target_id,
      target_name: request.target_name,
    });

    // 3. 准备扫描配置
    const nucleiConfig = toNucleiConfig(target.url, request.config);

    // 如果需要 JSON 输出文件
    const userDataPath = app.getPath('userData');
    const outputDir = path.join(userDataPath, 'scan-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFile = path.join(outputDir, `scan-${scanId}.json`);
    nucleiConfig.jsonOutput = outputFile;

    // 4. 配置已通过 request 传递，不需要额外保存

    // 5. 启动扫描
    try {
      await this.nuclei.startScan(scanId, nucleiConfig);
      this.addScanLog(scanId, 'info', `Scan started for target: ${target.url}`);
    } catch (error: any) {
      await this.db.updateScanTask(scanId, {
        status: 'failed',
        error_message: error.message,
      });
      throw error;
    }

    return scanId;
  }

  /**
   * 取消扫描
   */
  async cancelScan(scanId: number): Promise<void> {
    const success = this.nuclei.cancelScan(scanId);
    if (success) {
      this.addScanLog(scanId, 'info', 'Scan cancelled by user');
      await this.db.updateScanTask(scanId, {
        status: 'cancelled',
      });
    } else {
      throw new Error('Failed to cancel scan');
    }
  }

  /**
   * 获取扫描任务详情
   */
  async getScanDetail(scanId: number): Promise<ScanTaskDetail | null> {
    const scans = await this.db.getAllScanTasks();
    const scan = scans.find((s) => s.id === scanId);

    if (!scan) {
      return null;
    }

    // 解析配置
    let config = {};
    try {
      if (scan.config) {
        config = JSON.parse(scan.config as string);
      }
    } catch (error) {
      console.error('Failed to parse scan config:', error);
    }

    // 获取目标 URL
    const target = await this.db.getTargetById(scan.target_id);
    const targetUrl = target?.url;

    // 计算持续时间
    let duration = 0;
    if (scan.started_at) {
      const endTime = scan.completed_at ? new Date(scan.completed_at) : new Date();
      const startTime = new Date(scan.started_at);
      duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }

    return {
      id: scan.id,
      target_id: scan.target_id,
      target_name: scan.target_name,
      target_url: targetUrl,
      status: scan.status as any,
      progress: scan.progress,
      current_template: scan.current_template,
      total_templates: 0, // 从 NucleiService 获取
      completed_templates: 0,
      findings_count: await this.getScanFindingsCount(scanId),
      config: config as any,
      started_at: scan.started_at,
      completed_at: scan.completed_at,
      error: scan.error,
      duration,
    };
  }

  /**
   * 获取扫描漏洞数量
   */
  private async getScanFindingsCount(scanId: number): Promise<number> {
    const vulns = await this.db.getAllVulnerabilities({ scan_id: scanId });
    return vulns.length;
  }

  /**
   * 获取所有扫描任务
   */
  async getAllScans(): Promise<ScanTaskDetail[]> {
    const scans = await this.db.getAllScanTasks();
    const details: ScanTaskDetail[] = [];

    for (const scan of scans) {
      const detail = await this.getScanDetail(scan.id);
      if (detail) {
        details.push(detail);
      }
    }

    return details;
  }

  /**
   * 删除扫描任务
   */
  async deleteScan(scanId: number): Promise<void> {
    // 停止正在运行的扫描
    if (this.nuclei.isScanRunning(scanId)) {
      this.nuclei.cancelScan(scanId);
    }

    // 删除相关漏洞
    const vulns = await this.db.getAllVulnerabilities({ scan_id: scanId });
    for (const vuln of vulns) {
      await this.db.deleteVulnerability(vuln.id);
    }

    // 删除扫描任务
    await this.db.deleteScanTask(scanId);

    // 清除日志
    this.scanLogs.delete(scanId);
  }

  /**
   * 获取扫描日志
   */
  getScanLogs(scanId: number): string[] {
    return this.scanLogs.get(scanId) || [];
  }

  /**
   * 检查 Nuclei 是否可用
   */
  async checkNucleiAvailability(): Promise<boolean> {
    return this.nuclei.checkAvailability();
  }

  /**
   * 获取 Nuclei 版本
   */
  async getNucleiVersion(): Promise<string> {
    return this.nuclei.getVersion();
  }

  /**
   * 更新 Nuclei 模板
   */
  async updateNucleiTemplates(): Promise<void> {
    return this.nuclei.updateTemplates();
  }
}
