/**
 * RecentActivity 组件
 * 最近活动时间线组件
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Bug,
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'scan' | 'vuln' | 'target';
  action: 'created' | 'completed' | 'failed' | 'cancelled';
  title: string;
  description?: string;
  timestamp: string;
  icon?: React.ReactNode;
}

export interface RecentActivityProps {
  activities: ActivityItem[];
  title?: string;
  maxItems?: number;
  className?: string;
}

const typeIcons = {
  scan: Play,
  vuln: Bug,
  target: Target,
};

const actionIcons = {
  created: CheckCircle2,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
};

const actionColors = {
  created: 'text-emerald-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
  cancelled: 'text-amber-400',
};

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  title = '最近活动',
  maxItems = 10,
  className = '',
}) => {
  const displayedActivities = activities.slice(0, maxItems);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;

    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
        <Clock size={18} className="text-slate-500" />
      </div>

      {displayedActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <Clock size={48} className="mb-3 opacity-50" />
          <p>暂无最近活动</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {displayedActivities.map((activity, index) => {
              const TypeIcon = typeIcons[activity.type];
              const ActionIcon = actionIcons[activity.action];

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors group"
                >
                  {/* 图标 */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    {activity.icon || (
                      <TypeIcon size={16} className="text-slate-400" />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-medium text-slate-200 truncate">
                        {activity.title}
                      </h4>
                      <ActionIcon size={14} className={actionColors[activity.action]} />
                    </div>
                    {activity.description && (
                      <p className="text-xs text-slate-500 truncate">{activity.description}</p>
                    )}
                  </div>

                  {/* 时间 */}
                  <div className="flex-shrink-0 text-xs text-slate-500">
                    {formatTimestamp(activity.timestamp)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {activities.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-slate-700 text-center">
          <button className="text-sm text-sky-400 hover:text-sky-300 transition-colors">
            查看全部 {activities.length} 项活动
          </button>
        </div>
      )}
    </div>
  );
};
