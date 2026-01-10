import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, IPCEvents } from '../main/ipc/types';

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
    create: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_CREATE, data),
    update: (id: number, data: any) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_UPDATE, id, data),
    delete: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_DELETE, id),
    batchDelete: (ids: number[]) => ipcRenderer.invoke(IPC_CHANNELS.TARGET_BATCH_DELETE, ids),
  },

  // 扫描管理
  scan: {
    create: (request: any) => ipcRenderer.invoke(IPC_CHANNELS.SCAN_CREATE, request),
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
    update: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.VULN_UPDATE, id, data),
    markFalsePositive: (id: string, isFalsePositive: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.VULN_MARK_FALSE_POSITIVE, id, isFalsePositive),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.VULN_DELETE, id),
  },

  // 数据库
  database: {
    healthCheck: () => ipcRenderer.invoke(IPC_CHANNELS.DB_HEALTH_CHECK),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_STATS),
  },

  // 事件监听
  on: (channel: keyof IPCEvents, callback: (data: any) => void) => {
    const validChannels = Object.keys(IPC_CHANNELS);
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  },

  // 移除监听
  off: (channel: keyof IPCEvents, callback: (data: any) => void) => {
    ipcRenderer.removeListener(channel, callback as any);
  },
});

console.log('[Preload] electronAPI exposed successfully');
