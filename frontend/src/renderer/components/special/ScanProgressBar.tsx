/**
 * ScanProgressBar 组件
 * 显示扫描进度和实时统计
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui';

// 扫描状态
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// 扫描进度数据
export interface ScanProgressData {
  status: ScanStatus;
  progress: number;
  currentTemplate?: string;
  totalTemplates: number;
  completedTemplates: number;
  findings: number;
}

export interface ScanProgressBarProps {
  progress: ScanProgressData;
  showDetails?: boolean;
  className?: string;
}

// 状态配置
const statusConfig = {
  pending: {
    icon: <Loader2 size={16} className="animate-spin text-slate-400" />,
    label: '等待中',
    color: 'bg-slate-500',
  },
  running: {
    icon: <Loader2 size={16} className="animate-spin text-sky-400" />,
    label: '扫描中',
    color: 'bg-sky-500',
  },
  completed: {
    icon: <CheckCircle2 size={16} className="text-emerald-400" />,
    label: '已完成',
    color: 'bg-emerald-500',
  },
  failed: {
    icon: <XCircle size={16} className="text-red-400" />,
    label: '失败',
    color: 'bg-red-500',
  },
  cancelled: {
    icon: <AlertCircle size={16} className="text-amber-400" />,
    label: '已取消',
    color: 'bg-amber-500',
  },
};

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({
  progress,
  showDetails = true,
  className = '',
}) => {
  const config = statusConfig[progress.status];
  const { currentTemplate, totalTemplates, completedTemplates, findings } = progress;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 状态和进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {config.icon}
            <span className="text-slate-300">{config.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {findings > 0 && (
              <Badge variant="warning" size="sm">
                {findings} 个漏洞
              </Badge>
            )}
            <span className="text-slate-400 font-mono">{progress.progress.toFixed(1)}%</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress.progress}%` }}
            transition={{ duration: 0.3 }}
            className={`absolute top-0 left-0 h-full ${config.color} rounded-full`}
          />
        </div>
      </div>

      {/* 详细信息 */}
      {showDetails && progress.status === 'running' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-2 pt-2"
        >
          {/* 当前模板 */}
          {currentTemplate && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">当前模板</span>
              <span className="text-slate-300 font-mono truncate ml-4">{currentTemplate}</span>
            </div>
          )}

          {/* 模板进度 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">模板进度</span>
            <span className="text-slate-300 font-mono">
              {completedTemplates} / {totalTemplates}
            </span>
          </div>

          {/* 漏洞统计 */}
          {findings > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">已发现</span>
              <span className="text-amber-400 font-medium">{findings} 个漏洞</span>
            </div>
          )}
        </motion.div>
      )}

      {/* 完成状态详情 */}
      {showDetails && progress.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-6 pt-2 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-500">扫描模板:</span>
            <span className="text-slate-300 font-mono">{completedTemplates} 个</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">发现漏洞:</span>
            <span className="text-amber-400 font-medium">{findings} 个</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
