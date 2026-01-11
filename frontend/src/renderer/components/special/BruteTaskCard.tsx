/**
 * 暴力破解任务卡片组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  Trash2,
  Eye,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { BruteTask } from '../../types';
import clsx from 'clsx';

interface BruteTaskCardProps {
  task: BruteTask;
  onStart: (id: number) => void;
  onCancel: (id: number) => void;
  onDelete: (id: number) => void;
  onViewResults: (task: BruteTask) => void;
}

export const BruteTaskCard: React.FC<BruteTaskCardProps> = ({
  task,
  onStart,
  onCancel,
  onDelete,
  onViewResults,
}) => {
  // 计算进度百分比
  const progress = task.total_payloads > 0
    ? Math.round((task.sent_payloads / task.total_payloads) * 100)
    : 0;

  // 获取状态颜色
  const getStatusColor = () => {
    switch (task.status) {
      case 'running':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'completed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'cancelled':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'paused':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  // 获取状态图标
  const getStatusIcon = () => {
    switch (task.status) {
      case 'running':
        return <Zap size={14} className="animate-pulse" />;
      case 'completed':
        return <CheckCircle2 size={14} />;
      case 'failed':
        return <XCircle size={14} />;
      case 'cancelled':
        return <AlertCircle size={14} />;
      case 'paused':
        return <Pause size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    switch (task.status) {
      case 'running':
        return '运行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'cancelled':
        return '已取消';
      case 'pending':
        return '等待中';
      case 'paused':
        return '已暂停';
      default:
        return task.status;
    }
  };

  // 获取类型文本
  const getTypeText = () => {
    switch (task.type) {
      case 'single':
        return '单参数';
      case 'multi-pitchfork':
        return '多参数（Pitchfork）';
      case 'multi-cluster':
        return '多参数（Cluster Bomb）';
      default:
        return task.type;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
    >
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-100 truncate">
            {task.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="default" className={clsx('text-xs', getStatusColor())}>
              <span className="flex items-center gap-1">
                {getStatusIcon()}
                {getStatusText()}
              </span>
            </Badge>
            <Badge variant="info" className="text-xs">
              {getTypeText()}
            </Badge>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>进度</span>
          <span>{task.sent_payloads} / {task.total_payloads}</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            className={clsx(
              'h-full rounded-full',
              task.status === 'running'
                ? 'bg-sky-500'
                : task.status === 'completed'
                ? 'bg-emerald-500'
                : task.status === 'failed'
                ? 'bg-red-500'
                : 'bg-slate-500'
            )}
          />
        </div>
        <div className="text-right text-xs text-slate-400 mt-1">{progress}%</div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-700/30 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">成功</div>
          <div className="text-sm font-semibold text-emerald-400">{task.success_count}</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">失败</div>
          <div className="text-sm font-semibold text-red-400">{task.failure_count}</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">请求 ID</div>
          <div className="text-sm font-semibold text-slate-300">#{task.request_id}</div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {task.status === 'running' ? (
          <Button
            type="danger"
            size="sm"
            icon={<Pause size={14} />}
            onClick={() => onCancel(task.id)}
            className="flex-1"
          >
            取消
          </Button>
        ) : task.status === 'pending' || task.status === 'paused' || task.status === 'failed' ? (
          <Button
            type="primary"
            size="sm"
            icon={<Play size={14} />}
            onClick={() => onStart(task.id)}
            className="flex-1"
          >
            启动
          </Button>
        ) : null}

        {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
          <Button
            type="secondary"
            size="sm"
            icon={<Eye size={14} />}
            onClick={() => onViewResults(task)}
            className="flex-1"
          >
            查看结果
          </Button>
        )}

        <Button
          type="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          onClick={() => onDelete(task.id)}
          className={clsx(
            task.status === 'running' ? 'opacity-50 cursor-not-allowed' : ''
          )}
          disabled={task.status === 'running'}
        >
          删除
        </Button>
      </div>

      {/* 时间信息 */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          创建于 {new Date(task.created_at).toLocaleString('zh-CN')}
          {task.started_at && (
            <span className="ml-2">
              · 启动于 {new Date(task.started_at).toLocaleString('zh-CN')}
            </span>
          )}
          {task.completed_at && (
            <span className="ml-2">
              · 完成于 {new Date(task.completed_at).toLocaleString('zh-CN')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
