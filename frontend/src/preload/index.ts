import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPCEvents } from '../main/ipc/types';
import type {
  CreateTargetRequest,
  UpdateTargetRequest,
  CreateScanRequest,
  CreateHttpRequest,
  Vulnerability,
  CreateBruteTaskRequest,
  CreatePayloadSetRequest,
} from '../renderer/types';

// 日志：preload 脚本已加载
console.log('[Preload] Preload script loaded');
console.log('[Preload] Exposing electronAPI to renderer...');

/**
 * 暴露给渲染进程的 Electron API
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 基础信息
  getPlatform: () => process.platform,
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

  // 目标管理
  target: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.TARGET_GET_ALL),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_GET_BY_ID, id),
    create: (data: CreateTargetRequest) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_CREATE, data),
    update: (id: number, data: UpdateTargetRequest) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_DELETE, id),
    batchDelete: (ids: number[]) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_BATCH_DELETE, ids),
  },

  // 扫描管理
  scan: {
    create: (request: CreateScanRequest) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CREATE, request),
    cancel: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CANCEL, id),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_DELETE, id),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_ALL),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_BY_ID, id),
    getProgress: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_PROGRESS, id),
    getLogs: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_GET_LOGS, id),
  },

  // Nuclei 管理
  nuclei: {
    checkAvailability: () => ipcRenderer.invoke('nuclei:checkAvailability'),
    getVersion: () => ipcRenderer.invoke('nuclei:getVersion'),
    updateTemplates: () => ipcRenderer.invoke('nuclei:updateTemplates'),
  },

  // 漏洞管理
  vulnerability: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.VULN_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VULN_GET_BY_ID, id),
    update: (id: string, data: Partial<Vulnerability>) => ipcRenderer.invoke(IPC_CHANNELS.VULN_UPDATE, id, data),
    markFalsePositive: (id: string, isFalsePositive: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.VULN_MARK_FALSE_POSITIVE, id, isFalsePositive),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VULN_DELETE, id),
  },

  // 数据库
  database: {
    healthCheck: () => ipcRenderer.invoke(IPC_CHANNELS.DB_HEALTH_CHECK),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_STATS),
  },

  // HTTP 重放
  replay: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_GET_ALL),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_GET_BY_ID, id),
    create: (data: CreateHttpRequest) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_CREATE, data),
    update: (id: number, data: Partial<CreateHttpRequest>) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_DELETE, id),
    send: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_SEND, id),
    getResponses: (requestId: number) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_GET_RESPONSES, requestId),
    import: (data: { data: string; type: 'curl' | 'http' }) => ipcRenderer.invoke(IPC_CHANNELS.REPLAY_IMPORT, data),
  },

  // 暴力破解
  brute: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_GET_ALL),
    getById: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_GET_BY_ID, id),
    create: (data: CreateBruteTaskRequest) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_CREATE, data),
    start: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_START, id),
    cancel: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_CANCEL, id),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_DELETE, id),
    getResults: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_GET_RESULTS, id),
    getAllPayloadSets: () => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_GET_ALL_PAYLOAD_SETS),
    createPayloadSet: (data: CreatePayloadSetRequest) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_CREATE_PAYLOAD_SET, data),
    importPayloads: (data: { set_id: number; file: string }) => ipcRenderer.invoke(IPC_CHANNELS.BRUTE_IMPORT_PAYLOADS, data),
  },

  // 工具箱
  tools: {
    portScan: (options: { target: string; ports?: number[]; timeout?: number; batch_size?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.TOOLS_PORTSCAN, options),
    getCommonPorts: () => ipcRenderer.invoke(IPC_CHANNELS.TOOLS_GET_COMMON_PORTS),
    domainBrute: (options: { domain: string; wordlist?: string[]; timeout?: number; batch_size?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.TOOLS_DOMAINBRUTE, options),
    getDomainWordlist: () => ipcRenderer.invoke(IPC_CHANNELS.TOOLS_GET_DOMAIN_WORDLIST),
    getDomainRecords: (domain: string, type: 'mx' | 'ns' | 'txt') =>
      ipcRenderer.invoke(IPC_CHANNELS.TOOLS_GET_DOMAIN_RECORDS, { domain, type }),
  },

  // 事件监听
  on: (channel: keyof IPCEvents, callback: (data: unknown) => void) => {
    const validChannels = Object.keys(IPC_CHANNELS);
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  },

  // 移除监听
  off: (channel: keyof IPCEvents, callback: (data: unknown) => void) => {
    ipcRenderer.removeListener(channel, callback as (_event: unknown, data: unknown) => void);
  },
});

console.log('[Preload] electronAPI exposed successfully');
