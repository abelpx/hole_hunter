/**
 * VulnCard 组件
 * 漏洞卡片展示组件
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  FileText,
  Shield,
  Bug,
} from 'lucide-react';
import { Badge, Button } from '../ui';
import { Vulnerability } from '../../types';

export interface VulnCardProps {
  vuln: Vulnerability;
  onViewDetails?: (vuln: Vulnerability) => void;
  onMarkFalsePositive?: (id: string, isFalsePositive: boolean) => void;
  onCopy?: (text: string) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

// 严重等级配置
const severityConfig = {
  critical: {
    label: '严重',
    color: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: <AlertTriangle size={16} />,
  },
  high: {
    label: '高危',
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: <AlertTriangle size={16} />,
  },
  medium: {
    label: '中危',
    color: 'bg-sky-500',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    icon: <Bug size={16} />,
  },
  low: {
    label: '低危',
    color: 'bg-slate-500',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: <Shield size={16} />,
  },
  info: {
    label: '信息',
    color: 'bg-slate-400',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/30',
    icon: <FileText size={16} />,
  },
};

// CVSS 评分等级
const getCVSSRating = (cvss?: number) => {
  if (!cvss) return null;
  if (cvss >= 9.0) return { label: '严重', color: 'bg-red-500' };
  if (cvss >= 7.0) return { label: '高危', color: 'bg-amber-500' };
  if (cvss >= 4.0) return { label: '中危', color: 'bg-sky-500' };
  if (cvss >= 0.1) return { label: '低危', color: 'bg-slate-500' };
  return null;
};

export const VulnCard: React.FC<VulnCardProps> = React.memo(({
  vuln,
  onViewDetails,
  onMarkFalsePositive,
  onCopy,
  selected = false,
  onToggleSelect,
}) => {
  const [copied, setCopied] = useState(false);

  // 使用 useMemo 缓存配置
  const config = useMemo(() => severityConfig[vuln.severity], [vuln.severity]);
  const cvssRating = useMemo(() => getCVSSRating(vuln.cvss), [vuln.cvss]);

  // 使用 useCallback 缓存事件处理器
  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(vuln.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy, vuln.url]);

  const handleToggleSelect = useCallback(() => {
    onToggleSelect?.(vuln.id);
  }, [vuln.id, onToggleSelect]);

  const handleUrlClick = useCallback(() => {
    window.open(vuln.url, '_blank');
  }, [vuln.url]);

  const handleMarkFalsePositive = useCallback(() => {
    onMarkFalsePositive?.(vuln.id, !vuln.is_false_positive);
  }, [vuln.id, vuln.is_false_positive, onMarkFalsePositive]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(vuln);
  }, [vuln, onViewDetails]);

  // 使用 useMemo 缓存格式化的时间
  const formattedDate = useMemo(() => {
    try {
      const date = new Date(vuln.discovered_at);
      if (isNaN(date.getTime())) {
        return '未知时间';
      }
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '未知时间';
    }
  }, [vuln.discovered_at]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'relative bg-slate-800/50 border rounded-xl p-5 transition-all duration-200',
        'hover:shadow-lg hover:border-slate-600',
        config.borderColor,
        vuln.is_false_positive && 'opacity-60',
        selected && 'ring-2 ring-sky-500/50'
      )}
    >
      {/* 误报标记 */}
      {vuln.is_false_positive && (
        <div className="absolute top-4 right-4">
          <Badge variant="default" size="sm">
            误报
          </Badge>
        </div>
      )}

      {/* 头部 */}
      <div className="flex items-start gap-3 mb-4">
        {/* 选择框 */}
        {onToggleSelect && (
          <button
            onClick={handleToggleSelect}
            className={clsx(
              'flex-shrink-0 w-5 h-5 rounded border-2 transition-colors mt-1',
              'flex items-center justify-center',
              selected
                ? 'border-sky-500 bg-sky-500'
                : 'border-slate-600 hover:border-slate-500'
            )}
          >
            {selected && <Check size={12} className="text-white" />}
          </button>
        )}

        {/* 严重等级图标 */}
        <div className={clsx('p-2 rounded-lg', config.bgColor)}>
          <div className={config.textColor}>{config.icon}</div>
        </div>

        {/* 标题和链接 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-100 flex-1">
              {vuln.name}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* 严重程度标签 */}
              <span className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                config.bgColor,
                config.textColor,
                'border',
                config.borderColor
              )}>
                {config.label}
              </span>
              {cvssRating && (
                <Badge variant="danger" size="sm">
                  CVSS {vuln.cvss?.toFixed(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* URL */}
          <button
            onClick={handleUrlClick}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-sky-400 transition-colors mt-1 group"
          >
            <span className="truncate">{vuln.url}</span>
            <ExternalLink size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* 描述 */}
      {vuln.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">
          {vuln.description}
        </p>
      )}

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* 模板ID */}
        <Badge variant="info" size="sm">
          {vuln.template_id}
        </Badge>

        {/* 漏洞标签 */}
        {vuln.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="default" size="sm">
            {tag}
          </Badge>
        ))}
        {vuln.tags.length > 3 && (
          <Badge variant="default" size="sm">
            +{vuln.tags.length - 3}
          </Badge>
        )}

        {/* CVE */}
        {vuln.cve && vuln.cve.length > 0 && (
          <Badge variant="warning" size="sm">
            CVE: {vuln.cve[0]}
            {vuln.cve.length > 1 && ` (+${vuln.cve.length - 1})`}
          </Badge>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        {/* 时间戳 */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar size={14} />
          <span>{formattedDate}</span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 复制URL */}
          <Button
            type="ghost"
            size="sm"
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={handleCopy}
            title={copied ? '已复制' : '复制 URL'}
          >
            {copied ? '已复制' : ''}
          </Button>

          {/* 标记误报 */}
          {onMarkFalsePositive && (
            <Button
              type={vuln.is_false_positive ? 'secondary' : 'ghost'}
              size="sm"
              onClick={handleMarkFalsePositive}
            >
              {vuln.is_false_positive ? '取消误报' : '标记误报'}
            </Button>
          )}

          {/* 查看详情 */}
          {onViewDetails && (
            <Button
              type="primary"
              size="sm"
              onClick={handleViewDetails}
            >
              详情
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
