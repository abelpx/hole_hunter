/**
 * 漏洞管理 Store
 * 使用 Zustand 管理漏洞状态 - 后端分页版本
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Vulnerability } from '../types';
import {
  GetVulnerabilitiesPageByFilter,
} from '@wailsjs/go/app/App';
import { models } from '@wailsjs/go/models';

// 过滤器类型
export interface VulnFilters {
  severity?: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
  target_id?: number;
  scan_id?: number;
  is_false_positive?: boolean;
  tags?: string[];
  search?: string;
}

// Store 状态
interface VulnState {
  // 数据
  vulnerabilities: Vulnerability[];
  selectedIds: string[];
  filters: VulnFilters;
  total: number;

  // 分页状态
  currentPage: number;
  pageSize: number;

  // 加载状态
  loading: boolean;
  error: string | null;

  // 当前查看的漏洞
  currentVuln: Vulnerability | null;

  // Actions
  fetchVulnerabilities: (page?: number) => Promise<void>;
  updateVulnerability: (id: string, data: any) => Promise<void>;
  deleteVulnerability: (id: string) => Promise<void>;
  batchDeleteVulnerabilities: (ids: string[]) => Promise<void>;
  markFalsePositive: (id: string, isFalsePositive: boolean) => Promise<void>;
  batchMarkFalsePositive: (ids: string[], isFalsePositive: boolean) => Promise<void>;

  // 分页
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // 选择
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 过滤器
  setFilters: (filters: Partial<VulnFilters>) => void;
  clearFilters: () => void;

  // UI
  setCurrentVuln: (vuln: Vulnerability | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// 初始过滤器
const initialFilters: VulnFilters = {};

export const useVulnStore = create<VulnState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      vulnerabilities: [],
      selectedIds: [],
      filters: initialFilters,
      total: 0,
      currentPage: 1,
      pageSize: 50,
      loading: false,
      error: null,
      currentVuln: null,

      // 获取漏洞列表（后端分页）
      fetchVulnerabilities: async (page = 1) => {
        console.log('[vulnStore] fetchVulnerabilities called with page:', page);
        set({ loading: true, error: null });
        try {
          const { filters, pageSize } = get();

          // 构建后端过滤器
          const filter = new models.VulnerabilityFilter();
          filter.page = page;
          filter.pageSize = pageSize;

          if (filters?.severity && filters.severity.length > 0) {
            filter.severity = filters.severity;
          }
          if (filters?.target_id) {
            filter.target_id = filters.target_id;
          }
          if (filters?.scan_id) {
            filter.scan_id = filters.scan_id;
          }
          if (filters?.is_false_positive !== undefined) {
            filter.is_false_positive = filters.is_false_positive;
          }
          if (filters?.tags && filters.tags.length > 0) {
            filter.tags = filters.tags;
          }
          if (filters?.search) {
            filter.search = filters.search;
          }

          // 调用后端分页 API
          const [result, totalCount] = await GetVulnerabilitiesPageByFilter(filter, page, pageSize);

          // 确保返回有效的漏洞数组
          const vulnerabilities = (result || []).map(v => ({
            id: String(v?.id ?? ''),
            name: v?.name ?? '',
            severity: v?.severity as any,
            url: v?.url ?? '',
            template_id: v?.template_id ?? '',
            description: v?.description ?? '',
            tags: v?.tags || [],
            reference: v?.reference || [],
            target_id: v?.task_id ?? 0,
            scan_id: v?.task_id ?? 0,
            discovered_at: v?.matched_at || v?.created_at || new Date().toISOString(),
            is_false_positive: v?.false_positive ?? false,
            cve: v?.cve ? [v.cve] : undefined,
            cvss: v?.cvss,
          })).filter(v => v.id); // 过滤掉无效数据

          set({
            vulnerabilities,
            total: totalCount || 0,
            currentPage: page,
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      // 更新漏洞
      updateVulnerability: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const service = (window as any).service;
          await service.updateVulnerability(id, data);
          // 重新获取当前页
          const { fetchVulnerabilities, currentPage } = get();
          await fetchVulnerabilities(currentPage);
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 删除漏洞
      deleteVulnerability: async (id) => {
        set({ loading: true, error: null });
        try {
          const service = (window as any).service;
          await service.deleteVulnerability(id);
          // 从本地状态移除
          const { vulnerabilities } = get();
          set({
            vulnerabilities: vulnerabilities.filter((v) => v.id !== id),
            total: Math.max(0, get().total - 1),
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 批量删除漏洞
      batchDeleteVulnerabilities: async (ids) => {
        set({ loading: true, error: null });
        try {
          const service = (window as any).service;
          const results = await Promise.allSettled(
            ids.map((id) => service.deleteVulnerability(id))
          );

          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            console.warn(`[vulnStore] batchDeleteVulnerabilities: ${failures.length}/${ids.length} failed`);
          }

          const successIds = new Set(
            results
              .map((r, i) => (r.status === 'fulfilled' ? ids[i] : null))
              .filter(Boolean)
          );

          const { vulnerabilities } = get();
          set({
            vulnerabilities: vulnerabilities.filter((v) => !successIds.has(v.id)),
            total: Math.max(0, get().total - successIds.size),
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 标记误报
      markFalsePositive: async (id, isFalsePositive) => {
        set({ loading: true, error: null });
        try {
          const service = (window as any).service;
          await service.markVulnerabilityAsFalsePositive(id, isFalsePositive);
          // 更新本地状态
          const { vulnerabilities } = get();
          set({
            vulnerabilities: vulnerabilities.map((v) =>
              v.id === id ? { ...v, false_positive: isFalsePositive, is_false_positive: isFalsePositive } : v
            ),
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 批量标记误报
      batchMarkFalsePositive: async (ids, isFalsePositive) => {
        set({ loading: true, error: null });
        try {
          const service = (window as any).service;
          const results = await Promise.allSettled(
            ids.map((id) => service.markVulnerabilityAsFalsePositive(id, isFalsePositive))
          );

          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            console.warn(`[vulnStore] batchMarkFalsePositive: ${failures.length}/${ids.length} failed`);
          }

          const successIds = new Set(
            results
              .map((r, i) => (r.status === 'fulfilled' ? ids[i] : null))
              .filter(Boolean)
          );

          const { vulnerabilities } = get();
          set({
            vulnerabilities: vulnerabilities.map((v) =>
              successIds.has(v.id) ? { ...v, false_positive: isFalsePositive, is_false_positive: isFalsePositive } : v
            ),
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 分页操作
      setPage: (page) => {
        set({ currentPage: page });
      },
      nextPage: () => {
        const { currentPage } = get();
        set({ currentPage: currentPage + 1 });
      },
      prevPage: () => {
        const { currentPage } = get();
        if (currentPage > 1) {
          set({ currentPage: currentPage - 1 });
        }
      },

      // 切换选择
      toggleSelect: (id) => {
        const { selectedIds } = get();
        if (selectedIds.includes(id)) {
          set({ selectedIds: selectedIds.filter((sid) => sid !== id) });
        } else {
          set({ selectedIds: [...selectedIds, id] });
        }
      },

      // 全选（当前页）
      selectAll: () => {
        const { vulnerabilities } = get();
        set({ selectedIds: vulnerabilities.map((v) => v.id) });
      },

      // 清除选择
      clearSelection: () => {
        set({ selectedIds: [] });
      },

      // 设置过滤器
      setFilters: (newFilters) => {
        const { filters } = get();
        set({ filters: { ...filters, ...newFilters }, currentPage: 1 });
      },

      // 清除过滤器
      clearFilters: () => {
        set({ filters: initialFilters, currentPage: 1 });
      },

      // 设置当前查看的漏洞
      setCurrentVuln: (vuln) => {
        set({ currentVuln: vuln });
      },

      // 设置加载状态
      setLoading: (loading) => {
        set({ loading });
      },

      // 设置错误
      setError: (error) => {
        set({ error });
      },
    }),
    { name: 'VulnStore' }
  )
);

// Selectors
export const selectFilteredVulns = (state: VulnState) => {
  return state.vulnerabilities;
};

export const selectSelectedVulns = (state: VulnState) => {
  const { vulnerabilities, selectedIds } = state;
  return vulnerabilities.filter((v) => selectedIds.includes(v.id));
};

export const totalPages = (state: VulnState) => {
  return Math.ceil(state.total / state.pageSize);
};

export const selectVulnStats = (state: VulnState) => {
  const stats = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: state.total,
    falsePositive: 0,
  };

  state.vulnerabilities.forEach((vuln) => {
    const severity = vuln.severity || 'info';
    if (severity === 'critical') stats.critical++;
    else if (severity === 'high') stats.high++;
    else if (severity === 'medium') stats.medium++;
    else if (severity === 'low') stats.low++;
    else stats.info++;

    if (vuln.is_false_positive) {
      stats.falsePositive++;
    }
  });

  return stats;
};
