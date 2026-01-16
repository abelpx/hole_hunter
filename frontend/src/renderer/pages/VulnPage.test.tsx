/**
 * VulnPage 组件测试
 * 测试漏洞列表页面的渲染和交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as vulnStoreModule from '../store/vulnStore';
import * as targetStoreModule from '../store/targetStore';

// Mock wailsjs imports
vi.mock('@wailsjs/go/app/App', () => ({
  GetVulnerabilitiesPageByFilter: vi.fn(() => Promise.resolve([[], 0])),
  GetAllTargets: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@wailsjs/go/models', () => ({
  models: {
    VulnerabilityFilter: class {
      page = 1;
      pageSize = 50;
      severity = [];
      search = '';
      tags = [];
    },
  },
}));

// Mock hooks
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value: any) => value,
}));

// Mock stores
vi.mock('../store/vulnStore');
vi.mock('../store/targetStore');

describe('VulnPage', () => {
  const mockFetchVulnerabilities = vi.fn();
  const mockSetFilters = vi.fn();

  const defaultStore = {
    vulnerabilities: [
      {
        id: '1',
        name: 'Test Vulnerability',
        severity: 'high',
        url: 'https://example.com',
        template_id: 'test-template',
        description: 'Test description',
        tags: ['test'],
        is_false_positive: false,
        discovered_at: '2024-01-01T00:00:00Z',
      },
    ],
    selectedIds: [],
    filters: { search: '' },
    loading: false,
    error: null,
    currentVuln: null,
    total: 1,
    currentPage: 1,
    pageSize: 50,
    fetchVulnerabilities: mockFetchVulnerabilities,
    markFalsePositive: vi.fn(),
    batchMarkFalsePositive: vi.fn(),
    batchDeleteVulnerabilities: vi.fn(),
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
    setFilters: mockSetFilters,
    clearFilters: vi.fn(),
    setCurrentVuln: vi.fn(),
    setPage: vi.fn(),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(vulnStoreModule, 'useVulnStore').mockReturnValue(defaultStore);
    vi.spyOn(targetStoreModule, 'useTargetStore').mockReturnValue({
      targets: [],
    });
  });

  describe('页面基本元素显示', () => {
    it('应该显示页面标题', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('漏洞列表')).toBeInTheDocument();
    });

    it('应该显示描述文字', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('管理和查看所有发现的安全漏洞')).toBeInTheDocument();
    });

    it('应该显示所有统计卡片', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);

      expect(screen.getByText('总计')).toBeInTheDocument();
      expect(screen.getByText('严重')).toBeInTheDocument();
      expect(screen.getByText('高危')).toBeInTheDocument();
      expect(screen.getByText('中危')).toBeInTheDocument();
      expect(screen.getByText('低危')).toBeInTheDocument();
      expect(screen.getByText('误报')).toBeInTheDocument();
    });

    it('应该显示搜索框', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      const searchInput = screen.getByPlaceholderText(/搜索漏洞/);
      expect(searchInput).toBeInTheDocument();
    });

    it('应该显示过滤按钮', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('过滤')).toBeInTheDocument();
    });

    it('应该显示刷新按钮', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('刷新')).toBeInTheDocument();
    });

    it('应该显示导出按钮', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('导出')).toBeInTheDocument();
    });
  });

  describe('漏洞卡片渲染', () => {
    it('应该显示漏洞列表', async () => {
      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('Test Vulnerability')).toBeInTheDocument();
    });
  });

  describe('空状态', () => {
    it('没有漏洞时应该显示空状态', async () => {
      vi.spyOn(vulnStoreModule, 'useVulnStore').mockReturnValue({
        ...defaultStore,
        vulnerabilities: [],
        total: 0,
      });

      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('暂无漏洞')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('加载中应该显示加载指示器', async () => {
      vi.spyOn(vulnStoreModule, 'useVulnStore').mockReturnValue({
        ...defaultStore,
        loading: true,
        vulnerabilities: [],
      });

      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('错误状态', () => {
    it('加载失败应该显示错误信息', async () => {
      vi.spyOn(vulnStoreModule, 'useVulnStore').mockReturnValue({
        ...defaultStore,
        error: '网络错误',
        vulnerabilities: [],
      });

      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);
      expect(screen.getByText('加载失败')).toBeInTheDocument();
      expect(screen.getByText('网络错误')).toBeInTheDocument();
    });
  });

  describe('分页控件', () => {
    it('总页数大于1时应该显示分页控件', async () => {
      vi.spyOn(vulnStoreModule, 'useVulnStore').mockReturnValue({
        ...defaultStore,
        vulnerabilities: Array(50).fill(null).map((_, i) => ({
          id: String(i + 1),
          name: `Vuln ${i + 1}`,
          severity: 'high' as const,
          url: 'https://example.com',
          template_id: 'test',
          description: 'test',
          tags: [],
          is_false_positive: false,
          discovered_at: '2024-01-01T00:00:00Z',
        })),
        total: 100,
      });

      const { VulnPage } = await import('./VulnPage');
      render(<VulnPage />);

      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('上一页')).toBeInTheDocument();
      expect(screen.getByText('下一页')).toBeInTheDocument();
      expect(screen.getByText('末页')).toBeInTheDocument();
    });
  });
});
