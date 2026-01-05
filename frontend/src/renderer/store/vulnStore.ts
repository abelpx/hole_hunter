/**
 * 漏洞管理 Store
 * 使用 Zustand 管理漏洞状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Vulnerability } from '../types';

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

  // 加载状态
  loading: boolean;
  error: string | null;

  // 当前查看的漏洞
  currentVuln: Vulnerability | null;

  // Actions
  fetchVulnerabilities: (filters?: VulnFilters) => Promise<void>;
  updateVulnerability: (id: string, data: any) => Promise<void>;
  markFalsePositive: (id: string, isFalsePositive: boolean) => Promise<void>;
  batchMarkFalsePositive: (ids: string[], isFalsePositive: boolean) => Promise<void>;

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
      loading: false,
      error: null,
      currentVuln: null,

      // 获取漏洞列表
      fetchVulnerabilities: async (newFilters) => {
        set({ loading: true, error: null });
        try {
          if (typeof window !== 'undefined' && window.electronAPI) {
            const result = await window.electronAPI.vulnerability.getAll();
            if (result.success) {
              let vulns = result.data as Vulnerability[];

              // 客户端过滤
              if (newFilters?.target_id) {
                vulns = vulns.filter((v) => v.target_id === newFilters.target_id);
              }
              if (newFilters?.scan_id) {
                vulns = vulns.filter((v) => v.scan_id === newFilters.scan_id);
              }
              if (newFilters?.is_false_positive !== undefined) {
                vulns = vulns.filter((v) => v.is_false_positive === newFilters.is_false_positive);
              }
              if (newFilters?.search) {
                const searchLower = newFilters.search.toLowerCase();
                vulns = vulns.filter((v: Vulnerability) =>
                  v.name.toLowerCase().includes(searchLower) ||
                  v.url.toLowerCase().includes(searchLower) ||
                  v.description.toLowerCase().includes(searchLower)
                );
              }
              if (newFilters?.tags && newFilters.tags.length > 0) {
                vulns = vulns.filter((v: Vulnerability) =>
                  newFilters.tags!.some((tag) => v.tags.includes(tag))
                );
              }
              if (newFilters?.severity && newFilters.severity.length > 0) {
                vulns = vulns.filter((v: Vulnerability) =>
                  newFilters.severity!.includes(v.severity)
                );
              }

              set({ vulnerabilities: vulns, loading: false });
            } else {
              set({ error: 'Failed to fetch vulnerabilities', loading: false });
            }
          }
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      // 更新漏洞
      updateVulnerability: async (id, data) => {
        set({ loading: true, error: null });
        try {
          if (typeof window !== 'undefined' && window.electronAPI) {
            await window.electronAPI.vulnerability.update(id, data);
            // 重新获取列表
            const { fetchVulnerabilities, filters } = get();
            await fetchVulnerabilities(filters);
          }
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 标记误报
      markFalsePositive: async (id, isFalsePositive) => {
        set({ loading: true, error: null });
        try {
          if (typeof window !== 'undefined' && window.electronAPI) {
            await window.electronAPI.vulnerability.markFalsePositive(id, isFalsePositive);
            // 更新本地状态
            const { vulnerabilities } = get();
            set({
              vulnerabilities: vulnerabilities.map((v) =>
                v.id === id ? { ...v, is_false_positive: isFalsePositive } : v
              ),
              loading: false,
            });
          }
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 批量标记误报
      batchMarkFalsePositive: async (ids, isFalsePositive) => {
        set({ loading: true, error: null });
        try {
          if (typeof window !== 'undefined' && window.electronAPI) {
            await Promise.all(
              ids.map((id) => window.electronAPI.vulnerability.markFalsePositive(id, isFalsePositive))
            );
            // 更新本地状态
            const { vulnerabilities } = get();
            const idsSet = new Set(ids);
            set({
              vulnerabilities: vulnerabilities.map((v) =>
                idsSet.has(v.id) ? { ...v, is_false_positive: isFalsePositive } : v
              ),
              loading: false,
            });
          }
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
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

      // 全选
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
        set({ filters: { ...filters, ...newFilters } });
      },

      // 清除过滤器
      clearFilters: () => {
        set({ filters: initialFilters });
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

export const selectAllTags = (state: VulnState) => {
  const tags = new Set<string>();
  state.vulnerabilities.forEach((vuln) => {
    vuln.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
};

export const selectVulnStats = (state: VulnState) => {
  const stats = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    total: state.vulnerabilities.length,
    falsePositive: 0,
  };

  state.vulnerabilities.forEach((vuln) => {
    stats[vuln.severity]++;
    if (vuln.is_false_positive) {
      stats.falsePositive++;
    }
  });

  return stats;
};
