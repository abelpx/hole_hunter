/**
 * IPC 事件处理器（主进程）
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS, IPCResponse } from './types';
import { DatabaseManager } from '../database/DatabaseManager';
import { ScanManager } from '../scanner/ScanManager';

export class IPCHandlers {
  private db: DatabaseManager;
  private scanManager: ScanManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.scanManager = ScanManager.getInstance();
    this.registerHandlers();
  }

  private registerHandlers() {
    // 目标管理
    ipcMain.handle(IPC_CHANNELS.TARGET_GET_ALL, async () => {
      try {
        const targets = await this.db.getTargets();
        return { success: true, data: targets };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TARGET_GET_BY_ID, async (_event, id: number) => {
      try {
        const target = await this.db.getTargetById(id);
        if (!target) {
          return { success: false, error: 'Target not found' };
        }
        return { success: true, data: target };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TARGET_CREATE, async (_event, data) => {
      try {
        const id = await this.db.createTarget(data);
        const target = await this.db.getTargetById(id);
        return { success: true, data: target };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TARGET_UPDATE, async (_event, id: number, data) => {
      try {
        await this.db.updateTarget(id, data);
        const target = await this.db.getTargetById(id);
        return { success: true, data: target };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TARGET_DELETE, async (_event, id: number) => {
      try {
        await this.db.deleteTarget(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TARGET_BATCH_DELETE, async (_event, ids: number[]) => {
      try {
        await Promise.all(ids.map(id => this.db.deleteTarget(id)));
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // 数据库健康检查
    ipcMain.handle(IPC_CHANNELS.DB_HEALTH_CHECK, async () => {
      try {
        const healthy = await this.db.healthCheck();
        return {
          success: true,
          data: {
            healthy,
            type: this.db.getType(),
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          data: { healthy: false, type: 'unknown' }
        };
      }
    });

    ipcMain.handle(IPC_CHANNELS.DB_GET_STATS, async () => {
      try {
        const stats = await this.db.getStats();
        return { success: true, data: stats };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // 扫描任务管理
    ipcMain.handle(IPC_CHANNELS.SCAN_GET_ALL, async () => {
      try {
        const tasks = await this.db.getAllScanTasks();
        return { success: true, data: tasks };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SCAN_GET_BY_ID, async (_event, id: number) => {
      try {
        const task = await this.db.getScanTaskById(id);
        if (!task) {
          return { success: false, error: 'Scan task not found' };
        }
        return { success: true, data: task };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SCAN_CREATE, async (_event, request) => {
      try {
        const scanId = await this.scanManager.createAndStartScan(request);
        return { success: true, data: scanId };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SCAN_CANCEL, async (_event, id: number) => {
      try {
        await this.scanManager.cancelScan(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.SCAN_DELETE, async (_event, id: number) => {
      try {
        await this.scanManager.deleteScan(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Nuclei 管理
    ipcMain.handle('nuclei:checkAvailability', async () => {
      try {
        const available = await this.scanManager.checkNucleiAvailability();
        return { success: true, data: available };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nuclei:getVersion', async () => {
      try {
        const version = await this.scanManager.getNucleiVersion();
        return { success: true, data: version };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('nuclei:updateTemplates', async () => {
      try {
        await this.scanManager.updateNucleiTemplates();
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // 漏洞管理
    ipcMain.handle(IPC_CHANNELS.VULN_GET_ALL, async (_event, filters) => {
      try {
        const vulns = await this.db.getAllVulnerabilities(filters);
        return { success: true, data: vulns };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.VULN_GET_BY_ID, async (_event, id: string) => {
      try {
        const vuln = await this.db.getVulnerabilityById(id);
        if (!vuln) {
          return { success: false, error: 'Vulnerability not found' };
        }
        return { success: true, data: vuln };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.VULN_UPDATE, async (_event, id: string, data) => {
      try {
        await this.db.updateVulnerability(id, data);
        const vuln = await this.db.getVulnerabilityById(id);
        return { success: true, data: vuln };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.VULN_MARK_FALSE_POSITIVE, async (_event, id: string, isFalsePositive: boolean) => {
      try {
        await this.db.updateVulnerability(id, { is_false_positive: isFalsePositive });
        const vuln = await this.db.getVulnerabilityById(id);
        return { success: true, data: vuln };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.VULN_DELETE, async (_event, id: string) => {
      try {
        await this.db.deleteVulnerability(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // 应用信息
    ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
      const packageJson = require('../../../package.json');
      return { success: true, data: packageJson.version };
    });

    ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORM, () => {
      return { success: true, data: process.platform };
    });
  }

  public dispose() {
    // 移除所有处理器
    Object.values(IPC_CHANNELS).forEach(channel => {
      ipcMain.removeHandler(channel);
    });
  }
}
