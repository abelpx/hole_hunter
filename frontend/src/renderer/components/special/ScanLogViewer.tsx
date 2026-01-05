/**
 * ScanLogViewer 组件
 * 实时显示扫描日志
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X, Bug, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import clsx from 'clsx';

// 日志级别
export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

// 日志条目
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface ScanLogViewerProps {
  logs: LogEntry[];
  maxLogs?: number;
  className?: string;
}

// 日志级别配置
const logConfig = {
  info: {
    icon: <Info size={14} />,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    label: 'INFO',
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    label: 'WARN',
  },
  error: {
    icon: <AlertCircle size={14} />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    label: 'ERROR',
  },
  debug: {
    icon: <Bug size={14} />,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    label: 'DEBUG',
  },
};

export const ScanLogViewer: React.FC<ScanLogViewerProps> = ({
  logs,
  maxLogs = 100,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLogsLength = useRef(0);

  // 自动滚动到底部
  useEffect(() => {
    if (logs.length > prevLogsLength.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLogsLength.current = logs.length;
  }, [logs]);

  // 过滤日志
  const filteredLogs = logs
    .filter((log) => filter === 'all' || log.level === filter)
    .slice(-maxLogs);

  // 统计各级别日志数量
  const logCounts = logs.reduce(
    (acc, log) => {
      acc[log.level]++;
      return acc;
    },
    { info: 0, warning: 0, error: 0, debug: 0 }
  );

  return (
    <div className={clsx('bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-200">扫描日志</h3>
          <span className="text-xs text-slate-500">({filteredLogs.length} 条)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 过滤按钮 */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-2 py-1 text-xs rounded transition-colors',
                filter === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-300'
              )}
            >
              全部
            </button>
            {Object.entries(logCounts).map(([level, count]) => (
              <button
                key={level}
                onClick={() => setFilter(level as LogLevel)}
                className={clsx(
                  'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
                  filter === level ? logConfig[level as LogLevel].bgColor : 'text-slate-400 hover:text-slate-300'
                )}
              >
                {logConfig[level as LogLevel].icon}
                {count}
              </button>
            ))}
          </div>

          {/* 展开/收起 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-300"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* 日志内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              ref={scrollRef}
              className="px-4 py-3 space-y-1.5 max-h-80 overflow-y-auto font-mono text-xs"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  暂无日志
                </div>
              ) : (
                filteredLogs.map((log, index) => {
                  const config = logConfig[log.level];
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.1 }}
                      className={clsx(
                        'flex items-start gap-2 px-2 py-1.5 rounded',
                        config.bgColor
                      )}
                    >
                      {/* 时间戳 */}
                      <span className="text-slate-500 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString('zh-CN', {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>

                      {/* 级别标签 */}
                      <span className={clsx('flex-shrink-0 font-semibold', config.color)}>
                        [{config.label}]
                      </span>

                      {/* 消息内容 */}
                      <span className="flex-1 text-slate-300 break-all">{log.message}</span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
