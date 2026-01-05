/**
 * VulnFiltersPanel 组件
 * 漏洞过滤器面板
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  ChevronDown,
  X,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Button, Input } from '../ui';

export interface VulnFilters {
  severity?: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
  target_id?: number;
  scan_id?: number;
  is_false_positive?: boolean;
  tags?: string[];
  search?: string;
}

export interface VulnFiltersPanelProps {
  visible: boolean;
  filters: VulnFilters;
  onFiltersChange: (filters: VulnFilters) => void;
  onClear: () => void;
  targets: Array<{ id: number; name: string }>;
  allTags: string[];
}

const severityOptions = [
  { value: 'critical', label: '严重', color: 'bg-red-500' },
  { value: 'high', label: '高危', color: 'bg-amber-500' },
  { value: 'medium', label: '中危', color: 'bg-sky-500' },
  { value: 'low', label: '低危', color: 'bg-slate-500' },
  { value: 'info', label: '信息', color: 'bg-slate-400' },
];

export const VulnFiltersPanel: React.FC<VulnFiltersPanelProps> = ({
  visible,
  filters,
  onFiltersChange,
  onClear,
  targets,
  allTags,
}) => {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  const handleSeverityToggle = (severity: string) => {
    const current = filters.severity || [];
    const next = current.includes(severity as any)
      ? current.filter((s) => s !== severity)
      : [...current, severity as any];
    onFiltersChange({ ...filters, severity: next });
  };

  const handleTargetChange = (targetId: string) => {
    onFiltersChange({
      ...filters,
      target_id: targetId ? parseInt(targetId) : undefined,
    });
  };

  const handleTagToggle = (tag: string) => {
    const current = filters.tags || [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onFiltersChange({ ...filters, tags: next });
  };

  const handleFalsePositiveChange = (value: string) => {
    onFiltersChange({
      ...filters,
      is_false_positive: value === 'all' ? undefined : value === 'true',
    });
  };

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    // 防抖搜索
    const timeout = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
    return () => clearTimeout(timeout);
  };

  const activeFilterCount =
    (filters.severity?.length || 0) +
    (filters.target_id ? 1 : 0) +
    (filters.tags?.length || 0) +
    (filters.is_false_positive !== undefined ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-5">
            {/* 头部 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-slate-400" />
                <h3 className="font-semibold text-slate-200">筛选条件</h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-xs rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <Button
                type="ghost"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={onClear}
              >
                清空
              </Button>
            </div>

            {/* 搜索 */}
            <div>
              <Input
                label="搜索"
                placeholder="搜索漏洞名称、URL、描述..."
                prefix={<Search size={16} />}
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  const timeout = setTimeout(() => {
                    onFiltersChange({ ...filters, search: e.target.value || undefined });
                  }, 300);
                  clearTimeout(timeout);
                }}
              />
            </div>

            {/* 严重等级 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">严重等级</label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSeverityToggle(option.value)}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      'flex items-center gap-2',
                      (filters.severity || []).includes(option.value as any)
                        ? option.color + ' text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    )}
                  >
                    <span
                      className={clsx(
                        'w-2 h-2 rounded-full',
                        (filters.severity || []).includes(option.value as any)
                          ? 'bg-white'
                          : option.color
                      )}
                    />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 目标 */}
            {targets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">目标</label>
                <select
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-200"
                  value={filters.target_id || ''}
                  onChange={(e) => handleTargetChange(e.target.value)}
                >
                  <option value="">全部目标</option>
                  {targets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 标签 */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">标签</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {allTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-sm transition-all',
                        (filters.tags || []).includes(tag)
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 误报状态 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">误报状态</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFalsePositiveChange('all')}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    filters.is_false_positive === undefined
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  )}
                >
                  全部
                </button>
                <button
                  onClick={() => handleFalsePositiveChange('false')}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    filters.is_false_positive === false
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  )}
                >
                  仅真实漏洞
                </button>
                <button
                  onClick={() => handleFalsePositiveChange('true')}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    filters.is_false_positive === true
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  )}
                >
                  仅误报
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
