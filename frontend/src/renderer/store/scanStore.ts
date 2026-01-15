/**
 * 扫描任务 Store
 * 使用 Zustand 管理扫描任务状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ScanTask, CreateScanRequest, ScanConfigOptions } from '../types';
import { getService } from '../services/WailsService';

// Store 状态
interface ScanState {
  // 数据
  scans: ScanTask[];
  activeScanId: number | null;

  // 加载状态
  loading: boolean;
  error: string | null;

  // Actions
  fetchScans: () => Promise<void>;
  createScan: (data: Omit<CreateScanRequest, 'target_name'>) => Promise<number>;
  cancelScan: (id: number) => Promise<void>;
  getScanById: (id: number) => Promise<ScanTask | null>;

  // UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveScanId: (id: number | null) => void;
}

export const useScanStore = create<ScanState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      scans: [],
      activeScanId: null,
      loading: false,
      error: null,

      // 获取所有扫描任务
      fetchScans: async () => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          const scans = await service.getAllScans();
          set({ scans, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, loading: false });
        }
      },

      // 创建扫描任务
      createScan: async (data) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          // 获取目标名称
          const targets = await service.getAllTargets();
          const target = targets.find((t) => t.id === data.target_id);
          if (!target) {
            throw new Error(`Target with id ${data.target_id} not found`);
          }

          const createRequest: CreateScanRequest = {
            target_id: data.target_id,
            target_name: target.name,
            config: data.config,
          };

          const scan = await service.createScan(createRequest);
          set({ activeScanId: scan.id, loading: false });

          // 重新获取扫描列表
          const scans = await service.getAllScans();
          set({ scans });

          return scan.id;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // 取消扫描任务
      cancelScan: async (id: number) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.cancelScan(id);
          // 更新本地状态
          const { scans } = get();
          const updatedScans = scans.map((s) =>
            s.id === id ? { ...s, status: 'cancelled' as const } : s
          );
          set({ scans: updatedScans, loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, loading: false });
          throw error;
        }
      },

      // 获取单个扫描任务
      getScanById: async (id: number) => {
        try {
          const service = getService();
          const scan = await service.getScanById(id);
          return scan;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message });
          return null;
        }
      },

      // 设置加载状态
      setLoading: (loading: boolean) => {
        set({ loading });
      },

      // 设置错误
      setError: (error: string | null) => {
        set({ error });
      },

      // 设置当前激活的扫描ID
      setActiveScanId: (id: number | null) => {
        set({ activeScanId: id });
      },
    }),
    { name: 'ScanStore' }
  )
);
