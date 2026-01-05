/**
 * 目标管理 Store
 * 使用 Zustand 管理目标状态
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Target, CreateTargetRequest, UpdateTargetRequest } from '../types';
import { ipcService } from '../services/IPCService';

// 过滤器类型
export interface TargetFilters {
  status?: 'active' | 'inactive' | 'error' | 'all';
  search?: string;
  tags?: string[];
}

// Store 状态
interface TargetState {
  // 数据
  targets: Target[];
  selectedIds: number[];
  filters: TargetFilters;

  // 加载状态
  loading: boolean;
  error: string | null;

  // Actions
  fetchTargets: () => Promise<void>;
  addTarget: (data: CreateTargetRequest) => Promise<void>;
  updateTarget: (id: number, data: UpdateTargetRequest) => Promise<void>;
  deleteTarget: (id: number) => Promise<void>;
  batchDeleteTargets: (ids: number[]) => Promise<void>;

  // 选择
  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 过滤器
  setFilters: (filters: Partial<TargetFilters>) => void;
  clearFilters: () => void;

  // UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// 初始过滤器
const initialFilters: TargetFilters = {
  status: 'all',
  search: '',
  tags: [],
};

export const useTargetStore = create<TargetState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        targets: [],
        selectedIds: [],
        filters: initialFilters,
        loading: false,
        error: null,

        // 获取所有目标
        fetchTargets: async () => {
          set({ loading: true, error: null });
          try {
            const targets = await ipcService.getAllTargets();
            set({ targets, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
          }
        },

        // 添加目标
        addTarget: async (data: CreateTargetRequest) => {
          set({ loading: true, error: null });
          try {
            await ipcService.createTarget(data);
            // 重新获取列表
            const targets = await ipcService.getAllTargets();
            set({ targets, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 更新目标
        updateTarget: async (id: number, data: UpdateTargetRequest) => {
          set({ loading: true, error: null });
          try {
            await ipcService.updateTarget(id, data);
            // 更新本地状态
            const { targets } = get();
            const updatedTargets = targets.map((t) =>
              t.id === id ? { ...t, ...data } : t
            );
            set({ targets: updatedTargets, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 删除目标
        deleteTarget: async (id: number) => {
          set({ loading: true, error: null });
          try {
            await ipcService.deleteTarget(id);
            // 从本地状态移除
            const { targets, selectedIds } = get();
            set({
              targets: targets.filter((t) => t.id !== id),
              selectedIds: selectedIds.filter((sid) => sid !== id),
              loading: false,
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 批量删除
        batchDeleteTargets: async (ids: number[]) => {
          set({ loading: true, error: null });
          try {
            await ipcService.batchDeleteTargets(ids);
            // 从本地状态移除
            const { targets, selectedIds } = get();
            const idsSet = new Set(ids);
            set({
              targets: targets.filter((t) => !idsSet.has(t.id)),
              selectedIds: selectedIds.filter((sid) => !idsSet.has(sid)),
              loading: false,
            });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 切换选择
        toggleSelect: (id: number) => {
          const { selectedIds } = get();
          if (selectedIds.includes(id)) {
            set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
          } else {
            set({ selectedIds: [...selectedIds, id] });
          }
        },

        // 全选
        selectAll: () => {
          const { targets, filters } = get();
          const filteredTargets = targets.filter((target) => {
            if (filters.status && filters.status !== 'all' && target.status !== filters.status) {
              return false;
            }
            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              return (
                target.name.toLowerCase().includes(searchLower) ||
                target.url.toLowerCase().includes(searchLower)
              );
            }
            if (filters.tags && filters.tags.length > 0) {
              return filters.tags.some((tag) => target.tags.includes(tag));
            }
            return true;
          });
          set({ selectedIds: filteredTargets.map((t) => t.id) });
        },

        // 清除选择
        clearSelection: () => {
          set({ selectedIds: [] });
        },

        // 设置过滤器
        setFilters: (newFilters: Partial<TargetFilters>) => {
          const { filters } = get();
          set({ filters: { ...filters, ...newFilters } });
        },

        // 清除过滤器
        clearFilters: () => {
          set({ filters: initialFilters });
        },

        // 设置加载状态
        setLoading: (loading: boolean) => {
          set({ loading });
        },

        // 设置错误
        setError: (error: string | null) => {
          set({ error });
        },
      }),
      {
        name: 'target-storage',
        partialize: (state) => ({
          filters: state.filters,
        }),
      }
    ),
    { name: 'TargetStore' }
  )
);

// Selectors
export const selectFilteredTargets = (state: TargetState) => {
  const { targets, filters } = state;

  return targets.filter((target) => {
    // 状态过滤
    if (filters.status && filters.status !== 'all' && target.status !== filters.status) {
      return false;
    }

    // 搜索过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        target.name.toLowerCase().includes(searchLower) ||
        target.url.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // 标签过滤
    if (filters.tags && filters.tags.length > 0) {
      const matchesTags = filters.tags.some((tag) => target.tags.includes(tag));
      if (!matchesTags) return false;
    }

    return true;
  });
};

export const selectSelectedTargets = (state: TargetState) => {
  const { targets, selectedIds } = state;
  return targets.filter((t) => selectedIds.includes(t.id));
};

export const selectAllTags = (state: TargetState) => {
  const tags = new Set<string>();
  state.targets.forEach((target) => {
    target.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
};
