/**
 * Electron API 类型定义（用于渲染进程）
 */

import { IPC_CHANNELS, IPCEvents, Target, Vulnerability, ScanTask, ScanConfig } from '../../main/ipc/types';

export interface ElectronAPI {
  // 基础信息
  getPlatform: () => NodeJS.Platform;
  getVersion: () => Promise<{ success: boolean; data: string }>;

  // 目标管理
  target: {
    getAll: () => Promise<{ success: boolean; data: Target[] }>;
    getById: (id: number) => Promise<{ success: boolean; data: Target }>;
    create: (data: {
      name: string;
      url: string;
      tags?: string[];
    }) => Promise<{ success: boolean; data: Target }>;
    update: (id: number, data: {
      name?: string;
      url?: string;
      tags?: string[];
      status?: 'active' | 'inactive' | 'error';
    }) => Promise<{ success: boolean; data: Target }>;
    delete: (id: number) => Promise<{ success: boolean; data: null }>;
    batchDelete: (ids: number[]) => Promise<{ success: boolean; data: null }>;
  };

  // 扫描管理
  scan: {
    create: (data: {
      target_ids: number[];
      config: ScanConfig;
    }) => Promise<{ success: boolean; data: ScanTask }>;
    cancel: (id: number) => Promise<{ success: boolean; data: null }>;
    getAll: () => Promise<{ success: boolean; data: ScanTask[] }>;
    getById: (id: number) => Promise<{ success: boolean; data: ScanTask }>;
    getProgress: (id: number) => Promise<{ success: boolean; data: any }>;
    getLogs: (id: number) => Promise<{ success: boolean; data: string[] }>;
  };

  // 漏洞管理
  vulnerability: {
    getAll: () => Promise<{ success: boolean; data: Vulnerability[] }>;
    getById: (id: string) => Promise<{ success: boolean; data: Vulnerability }>;
    update: (id: string, data: any) => Promise<{ success: boolean; data: Vulnerability }>;
    markFalsePositive: (id: string, isFalsePositive: boolean) =>
      Promise<{ success: boolean; data: Vulnerability }>;
    delete: (id: string) => Promise<{ success: boolean; data: null }>;
  };

  // 数据库
  database: {
    healthCheck: () => Promise<{
      success: boolean;
      data: { healthy: boolean; type: string; message?: string }
    }>;
    getStats: () => Promise<{ success: boolean; data: any }>;
  };

  // 扫描引擎管理
  nuclei: {
    checkAvailability: () => Promise<{ success: boolean; data: boolean }>;
    getVersion: () => Promise<{ success: boolean; data: string }>;
    updateTemplates: () => Promise<{ success: boolean; data: null }>;
  };

  // 事件监听
  on: (channel: keyof IPCEvents, callback: (data: any) => void) => void;
  off: (channel: keyof IPCEvents, callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
