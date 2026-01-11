/**
 * IPC 事件处理器（主进程）
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS, IPCResponse } from './types';
import { DatabaseManager } from '../database/DatabaseManager';
import { ScanManager } from '../scanner/ScanManager';
import { BackendService } from '../backend/BackendService';
import { ReplayService } from '../replay/ReplayService';
import { BruteService } from '../brute/BruteService';
import { PortScanService } from '../tools/PortScanService';
import { DomainBruteService } from '../tools/DomainBruteService';

export class IPCHandlers {
  private db: DatabaseManager;
  private scanManager: ScanManager;
  private backendService: BackendService;
  private replayService: ReplayService;
  private bruteService: BruteService;
  private portScanService: PortScanService;
  private domainBruteService: DomainBruteService;

  constructor(
    databaseManager?: DatabaseManager,
    scanManager?: ScanManager,
    backendService?: BackendService
  ) {
    // 支持依赖注入，如果没有提供则使用单例
    this.db = databaseManager || DatabaseManager.getInstance();
    this.scanManager = scanManager || ScanManager.getInstance();
    this.backendService = backendService || BackendService.getInstance();
    this.replayService = ReplayService.getInstance();
    this.bruteService = BruteService.getInstance();
    this.portScanService = PortScanService.getInstance();
    this.domainBruteService = DomainBruteService.getInstance();
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

    // HTTP 重放
    ipcMain.handle(IPC_CHANNELS.REPLAY_GET_ALL, async () => {
      try {
        const requests = await this.replayService.getAllHttpRequests();
        return { success: true, data: requests };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_GET_BY_ID, async (_event, id: number) => {
      try {
        const request = await this.replayService.getHttpRequestById(id);
        if (!request) {
          return { success: false, error: 'HTTP request not found' };
        }
        return { success: true, data: request };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_CREATE, async (_event, data) => {
      try {
        const id = await this.replayService.createHttpRequest(data);
        const request = await this.replayService.getHttpRequestById(id);
        return { success: true, data: request };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_UPDATE, async (_event, id: number, data) => {
      try {
        await this.replayService.updateHttpRequest(id, data);
        const request = await this.replayService.getHttpRequestById(id);
        return { success: true, data: request };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_DELETE, async (_event, id: number) => {
      try {
        await this.replayService.deleteHttpRequest(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_SEND, async (_event, id: number) => {
      try {
        const response = await this.replayService.sendHttpRequest(id);
        return { success: true, data: response };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_GET_RESPONSES, async (_event, requestId: number) => {
      try {
        const responses = await this.replayService.getHttpResponseHistory(requestId);
        return { success: true, data: responses };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.REPLAY_IMPORT, async (_event, data: { data: string; type: 'curl' | 'http' }) => {
      try {
        const id = await this.replayService.importHttpRequest(data);
        const request = await this.replayService.getHttpRequestById(id);
        return { success: true, data: request };
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

    // 暴力破解
    ipcMain.handle(IPC_CHANNELS.BRUTE_GET_ALL, async () => {
      try {
        const tasks = await this.bruteService.getAllBruteTasks();
        return { success: true, data: tasks };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_GET_BY_ID, async (_event, id: number) => {
      try {
        const task = await this.bruteService.getBruteTask(id);
        if (!task) {
          return { success: false, error: 'Brute task not found' };
        }
        return { success: true, data: task };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_CREATE, async (_event, data) => {
      try {
        const task = await this.bruteService.createBruteTask(data);
        return { success: true, data: task };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_START, async (_event, id: number) => {
      try {
        await this.bruteService.startBruteTask(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_CANCEL, async (_event, id: number) => {
      try {
        await this.bruteService.cancelBruteTask(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_DELETE, async (_event, id: number) => {
      try {
        await this.bruteService.deleteBruteTask(id);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_GET_RESULTS, async (_event, id: number) => {
      try {
        const results = await this.bruteService.getBruteTaskResults(id);
        return { success: true, data: results };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_GET_ALL_PAYLOAD_SETS, async () => {
      try {
        const payloadSets = await this.bruteService.getAllBrutePayloadSets();
        return { success: true, data: payloadSets };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_CREATE_PAYLOAD_SET, async (_event, data) => {
      try {
        const payloadSet = await this.bruteService.createBrutePayloadSet(data);
        return { success: true, data: payloadSet };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.BRUTE_IMPORT_PAYLOADS, async (_event, data) => {
      try {
        await this.bruteService.importBrutePayloads(data.set_id, data.file);
        return { success: true, data: null };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // 工具箱 - 直接调用 CLI 工具（不占用端口）
    ipcMain.handle(IPC_CHANNELS.TOOLS_PORTSCAN, async (_event, options: { target: string; ports?: number[]; timeout?: number; batch_size?: number }) => {
      try {
        const results = await this.portScanService.scanPorts(options);
        return { success: true, data: results };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TOOLS_GET_COMMON_PORTS, async () => {
      try {
        const ports = await this.portScanService.getCommonPorts();
        return { success: true, data: ports };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TOOLS_DOMAINBRUTE, async (_event, options: { domain: string; wordlist?: string[]; timeout?: number; batch_size?: number }) => {
      try {
        const results = await this.domainBruteService.bruteSubdomains(options);
        return { success: true, data: results };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TOOLS_GET_DOMAIN_WORDLIST, async () => {
      try {
        const wordlist = await this.domainBruteService.getDefaultWordlist();
        return { success: true, data: wordlist };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle(IPC_CHANNELS.TOOLS_GET_DOMAIN_RECORDS, async (_event, data: { domain: string; type: 'mx' | 'ns' | 'txt' }) => {
      try {
        const records = await this.domainBruteService.getDNSRecords(data.domain, data.type);
        return { success: true, data: records };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });
  }

  public dispose() {
    // 移除所有处理器
    Object.values(IPC_CHANNELS).forEach(channel => {
      ipcMain.removeHandler(channel);
    });
  }
}
