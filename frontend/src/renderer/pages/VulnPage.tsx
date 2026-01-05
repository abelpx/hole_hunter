/**
 * VulnPage 组件
 * 漏洞列表页面
 */

import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '../components/ui';
import { VulnCard } from '../components/special/VulnCard';
import { VulnDetailModal } from '../components/special/VulnDetailModal';
import { VulnFiltersPanel, VulnFilters } from '../components/special/VulnFiltersPanel';
import { useVulnStore, selectVulnStats, selectAllTags } from '../store/vulnStore';
import { useTargetStore } from '../store/targetStore';
import { Vulnerability } from '../types';

export const VulnPage: React.FC = () => {
  const {
    vulnerabilities,
    selectedIds,
    filters,
    loading,
    error,
    currentVuln,
    fetchVulnerabilities,
    markFalsePositive,
    batchMarkFalsePositive,
    toggleSelect,
    selectAll,
    clearSelection,
    setFilters,
    clearFilters,
    setCurrentVuln,
  } = useVulnStore();

  const { targets } = useTargetStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const stats = selectVulnStats(useVulnStore.getState());
  const allTags = selectAllTags(useVulnStore.getState());

  useEffect(() => {
    loadVulnerabilities();
  }, []);

  const loadVulnerabilities = async () => {
    await fetchVulnerabilities(filters);
  };

  const handleFiltersChange = async (newFilters: VulnFilters) => {
    setFilters(newFilters);
    await fetchVulnerabilities(newFilters);
  };

  const handleClearFilters = async () => {
    clearFilters();
    setShowFilters(false);
    await fetchVulnerabilities({});
  };

  const handleViewDetails = (vuln: Vulnerability) => {
    setCurrentVuln(vuln);
    setShowDetailModal(true);
  };

  const handleMarkFalsePositive = async (id: string, isFalsePositive: boolean) => {
    try {
      await markFalsePositive(id, isFalsePositive);
    } catch (error) {
      console.error('Failed to mark false positive:', error);
      alert('操作失败');
    }
  };

  const handleBatchMarkFalsePositive = async (isFalsePositive: boolean) => {
    try {
      await batchMarkFalsePositive(selectedIds, isFalsePositive);
      clearSelection();
    } catch (error) {
      console.error('Failed to batch mark false positive:', error);
      alert('批量操作失败');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    // 导出功能实现
    const data = JSON.stringify(vulnerabilities, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vulnerabilities-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">漏洞列表</h1>
          <p className="text-slate-400 mt-1">管理和查看所有发现的安全漏洞</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="secondary"
            icon={<RotateCcw size={16} />}
            onClick={loadVulnerabilities}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            type="secondary"
            icon={<Download size={16} />}
            onClick={handleExport}
            disabled={vulnerabilities.length === 0}
          >
            导出
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <FileText size={16} />
            <span>总计</span>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
            <AlertCircle size={16} />
            <span>严重</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
            <AlertCircle size={16} />
            <span>高危</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.high}</div>
        </div>

        <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sky-400 text-sm mb-1">
            <CheckCircle2 size={16} />
            <span>中危</span>
          </div>
          <div className="text-2xl font-bold text-sky-400">{stats.medium}</div>
        </div>

        <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <CheckCircle2 size={16} />
            <span>低危</span>
          </div>
          <div className="text-2xl font-bold text-slate-400">{stats.low}</div>
        </div>

        <div className="bg-slate-400/10 border border-slate-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <XCircle size={16} />
            <span>误报</span>
          </div>
          <div className="text-2xl font-bold text-slate-400">{stats.falsePositive}</div>
        </div>
      </div>

      {/* 过滤器和操作栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="搜索漏洞名称、URL、描述..."
              className={clsx(
                'w-full pl-10 pr-4 py-2.5',
                'bg-slate-800 border border-slate-700 rounded-lg',
                'text-slate-200 placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-sky-500/50',
                'transition-all'
              )}
              value={filters.search || ''}
              onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>

          {/* 过滤按钮 */}
          <Button
            type={showFilters ? 'primary' : 'secondary'}
            icon={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            过滤
          </Button>

          {/* 清空过滤器 */}
          {(filters.severity?.length || filters.target_id || filters.tags?.length || filters.is_false_positive !== undefined) && (
            <Button
              type="ghost"
              icon={<RotateCcw size={16} />}
              onClick={handleClearFilters}
            >
              清空
            </Button>
          )}
        </div>

        {/* 批量操作 */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              已选择 {selectedIds.length} 项
            </span>
            <Button
              type="secondary"
              size="sm"
              onClick={() => handleBatchMarkFalsePositive(true)}
            >
              批量标记误报
            </Button>
            <Button
              type="ghost"
              size="sm"
              onClick={clearSelection}
            >
              取消选择
            </Button>
          </div>
        )}
      </div>

      {/* 过滤器面板 */}
      <VulnFiltersPanel
        visible={showFilters}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleClearFilters}
        targets={targets}
        allTags={allTags}
      />

      {/* 漏洞列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-500">
            <RotateCcw size={24} className="animate-spin" />
            <span>加载中...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium mb-2">加载失败</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      ) : vulnerabilities.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500">暂无漏洞</p>
          <p className="text-slate-600 text-sm mt-2">
            {filters.search || filters.severity?.length || filters.target_id
              ? '尝试调整筛选条件'
              : '运行扫描任务以发现漏洞'}
          </p>
        </div>
      ) : (
        <>
          {/* 全选按钮 */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <button
              onClick={selectAll}
              className="hover:text-slate-300 transition-colors"
            >
              全选
            </button>
            <span>|</span>
            <span>共 {vulnerabilities.length} 个漏洞</span>
          </div>

          {/* 漏洞卡片网格 */}
          <div className="grid grid-cols-1 gap-4">
            {vulnerabilities.map((vuln) => (
              <VulnCard
                key={vuln.id}
                vuln={vuln}
                selected={selectedIds.includes(vuln.id)}
                onToggleSelect={toggleSelect}
                onViewDetails={handleViewDetails}
                onMarkFalsePositive={handleMarkFalsePositive}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </>
      )}

      {/* 漏洞详情模态框 */}
      <VulnDetailModal
        visible={showDetailModal}
        vuln={currentVuln}
        onClose={() => {
          setShowDetailModal(false);
          setCurrentVuln(null);
        }}
        onMarkFalsePositive={handleMarkFalsePositive}
        onCopy={handleCopy}
      />
    </div>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
