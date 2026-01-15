/**
 * 漏洞管理 Store
 * 使用 Zustand 管理漏洞状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Vulnerability } from '../types';
import { getService } from '../services/WailsService';

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
          const service = getService();
          let vulns = await service.getAllVulnerabilities();

          // 客户端过滤
          if (newFilters?.target_id) {
            vulns = vulns.filter((v) => v.target_id === newFilters.target_id || v.scan_id === newFilters.target_id);
          }
          if (newFilters?.scan_id) {
            vulns = vulns.filter((v) => v.scan_id === newFilters.scan_id || v.target_id === newFilters.scan_id);
          }
          if (newFilters?.is_false_positive !== undefined) {
            vulns = vulns.filter((v) =>
              (v.false_positive || v.is_false_positive) === newFilters.is_false_positive
            );
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
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      // 更新漏洞
      updateVulnerability: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.updateVulnerability(id, data);
          // 重新获取列表
          const { fetchVulnerabilities, filters } = get();
          await fetchVulnerabilities(filters);
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      // 标记误报
      markFalsePositive: async (id, isFalsePositive) => {
        set({ loading: true, error: null });
        try {
          const service = getService();
          await service.markVulnerabilityAsFalsePositive(id, isFalsePositive);
          // 更新本地状态
          const { vulnerabilities } = get();
          set({
            vulnerabilities: vulnerabilities.map((v) =>
              v.id === id ? { ...v, false_positive: isFalsePositive } : v
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
          const service = getService();
          // 使用 Promise.allSettled 确保部分失败不影响其他操作
          const results = await Promise.allSettled(
            ids.map((id) => service.markVulnerabilityAsFalsePositive(id, isFalsePositive))
          );

          // 记录失败的操作
          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            console.warn(`[vulnStore] batchMarkFalsePositive: ${failures.length}/${ids.length} failed`);
          }

          // 只更新成功的项
          const successIds = new Set(
            results
              .map((r, i) => (r.status === 'fulfilled' ? ids[i] : null))
              .filter(Boolean)
          );

          // 更新本地状态
          const { vulnerabilities } = get();
          set({
            vulnerabilities: vulnerabilities.map((v) =>
              successIds.has(v.id) ? { ...v, false_positive: isFalsePositive } : v
            ),
            loading: false,
          });
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
    // 处理 severity 可能是 undefined 的情况
    const severity = vuln.severity || 'info';
    if (severity === 'critical') stats.critical++;
    else if (severity === 'high') stats.high++;
    else if (severity === 'medium') stats.medium++;
    else if (severity === 'low') stats.low++;
    else stats.info++;

    if (vuln.false_positive || vuln.is_false_positive) {
      stats.falsePositive++;
    }
  });

  return stats;
};
