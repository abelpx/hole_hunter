/**
 * TargetCard 组件
 * 显示目标信息的卡片组件
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Badge, Tag, Button } from '../ui';
import { Target } from '../../types';
import clsx from 'clsx';

// 漏洞统计
export interface VulnCount {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

// 扩展的 Target 类型
export interface TargetWithVulns extends Target {
  vuln_count?: VulnCount;
  last_scan_time?: string;
}

// Props
export interface TargetCardProps {
  target: TargetWithVulns;
  onScan?: (targetId: number) => void;
  onEdit?: (targetId: number) => void;
  onDelete?: (targetId: number) => void;
  onUrlClick?: (url: string) => void;
  selected?: boolean;
  onToggleSelect?: (targetId: number) => void;
}

// 状态图标映射
const statusIcons = {
  active: <CheckCircle size={16} className="text-emerald-400" />,
  inactive: <XCircle size={16} className="text-slate-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
};

// 严重等级颜色
const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-slate-500',
  info: 'bg-slate-400',
};

export const TargetCard: React.FC<TargetCardProps> = React.memo(({
  target,
  onScan,
  onEdit,
  onDelete,
  onUrlClick,
  selected = false,
  onToggleSelect,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // 使用 useMemo 缓存计算结果
  const totalVulns = useMemo(() => {
    return target.vuln_count
      ? Object.values(target.vuln_count).reduce((sum, count) => sum + count, 0)
      : 0;
  }, [target.vuln_count]);

  // 使用 useCallback 缓存事件处理器
  const handleToggleSelect = useCallback(() => {
    onToggleSelect?.(target.id);
  }, [target.id, onToggleSelect]);

  const handleUrlClick = useCallback(() => {
    onUrlClick?.(target.url);
  }, [target.url, onUrlClick]);

  const handleMenuToggle = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    onEdit?.(target.id);
    setShowMenu(false);
  }, [target.id, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(target.id);
    setShowMenu(false);
  }, [target.id, onDelete]);

  const handleScan = useCallback(() => {
    onScan?.(target.id);
  }, [target.id, onScan]);

  const handleMenuClose = useCallback(() => {
    setShowMenu(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'relative bg-slate-800 border rounded-xl p-5 transition-all duration-200',
        'hover:shadow-lg hover:border-slate-600',
        selected && 'border-sky-500 ring-2 ring-sky-500/20'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* 选择框 */}
          {onToggleSelect && (
            <button
              onClick={handleToggleSelect}
              className={clsx(
                'flex-shrink-0 w-5 h-5 rounded border-2 transition-colors',
                'flex items-center justify-center',
                selected
                  ? 'border-sky-500 bg-sky-500'
                  : 'border-slate-600 hover:border-slate-500'
              )}
            >
              {selected && <CheckCircle size={12} className="text-white" />}
            </button>
          )}

          {/* 状态图标 */}
          <div className="flex-shrink-0">{statusIcons[target.status]}</div>

          {/* 名称和URL */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-100 truncate">
              {target.name}
            </h3>
            <button
              onClick={handleUrlClick}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-sky-400 transition-colors"
            >
              <Globe size={14} />
              <span className="truncate">{target.url}</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* 更多菜单 */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleMenuToggle}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <MoreVertical size={16} className="text-slate-400" />
          </motion.button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={handleMenuClose}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-8 z-20 w-40 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit size={14} />
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* 标签 */}
      {target.tags && target.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {target.tags.map((tag) => (
            <Tag key={tag} color="sky">
              {tag}
            </Tag>
          ))}
        </div>
      )}

      {/* 漏洞统计 */}
      {target.vuln_count && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>漏洞统计</span>
            <span className="font-medium">共 {totalVulns} 个</span>
          </div>
          <div className="flex items-center gap-1.5 h-2">
            {Object.entries(target.vuln_count).map(([severity, count]) => {
              if (count === 0) return null;
              const percentage = (count / totalVulns) * 100;
              return (
                <motion.div
                  key={severity}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                  className={clsx('h-full rounded-full', severityColors[severity as keyof typeof severityColors])}
                  title={`${severity}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {target.vuln_count.critical > 0 && (
              <Badge variant="danger" size="sm">
                严重: {target.vuln_count.critical}
              </Badge>
            )}
            {target.vuln_count.high > 0 && (
              <Badge variant="warning" size="sm">
                高危: {target.vuln_count.high}
              </Badge>
            )}
            {target.vuln_count.medium > 0 && (
              <Badge variant="info" size="sm">
                中危: {target.vuln_count.medium}
              </Badge>
            )}
            {target.vuln_count.low > 0 && (
              <Badge variant="default" size="sm">
                低危: {target.vuln_count.low}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* 底部信息 */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        {/* 最后扫描时间 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={14} />
          <span>
            {target.last_scan_time
              ? new Date(target.last_scan_time).toLocaleString('zh-CN')
              : target.last_checked
              ? new Date(target.last_checked).toLocaleString('zh-CN')
              : '未扫描'}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <Button
            type="secondary"
            size="sm"
            icon={<Play size={14} />}
            onClick={handleScan}
          >
            扫描
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
