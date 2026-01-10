/**
 * VulnDetailModal 组件
 * 漏洞详情模态框
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Tag,
  FileText,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal, Badge, Button } from '../ui';
import { Vulnerability } from '../../types';

export interface VulnDetailModalProps {
  visible: boolean;
  vuln: Vulnerability | null;
  onClose: () => void;
  onMarkFalsePositive?: (id: string, isFalsePositive: boolean) => void;
  onCopy?: (text: string) => void;
}

// 严重等级配置
const severityConfig = {
  critical: { label: '严重', color: 'text-red-400', icon: <AlertTriangle size={20} /> },
  high: { label: '高危', color: 'text-amber-400', icon: <AlertTriangle size={20} /> },
  medium: { label: '中危', color: 'text-sky-400', icon: <Shield size={20} /> },
  low: { label: '低危', color: 'text-slate-400', icon: <Shield size={20} /> },
  info: { label: '信息', color: 'text-slate-400', icon: <FileText size={20} /> },
};

export const VulnDetailModal: React.FC<VulnDetailModalProps> = ({
  visible,
  vuln,
  onClose,
  onMarkFalsePositive,
  onCopy,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['description']));

  if (!vuln) return null;

  const config = severityConfig[vuln.severity];

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleCopy = (text: string) => {
    if (onCopy) {
      onCopy(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={visible}
      title=""
      onClose={onClose}
      onConfirm={onClose}
      width={800}
    >
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            {/* 等级图标 */}
            <div className={`p-3 rounded-xl bg-slate-800 ${config.color}`}>
              {config.icon}
            </div>

            {/* 标题和基本信息 */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-2xl font-bold text-slate-100">{vuln.name}</h2>
                <Badge variant={vuln.severity === 'critical' || vuln.severity === 'high' ? 'danger' : 'warning'}>
                  {config.label}
                </Badge>
              </div>

              {/* CVSS 评分 */}
              {vuln.cvss && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-slate-500">CVSS 评分:</span>
                  <span className="text-lg font-bold text-slate-200">{vuln.cvss.toFixed(1)}</span>
                  <span className="text-xs text-slate-500">
                    ({vuln.cvss >= 9 ? '严重' : vuln.cvss >= 7 ? '高危' : vuln.cvss >= 4 ? '中危' : '低危'})
                  </span>
                </div>
              )}

              {/* URL */}
              <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
                <a
                  href={vuln.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-slate-400 hover:text-sky-400 truncate"
                >
                  {vuln.url}
                </a>
                <Button
                  type="ghost"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                  onClick={() => window.open(vuln.url, '_blank')}
                />
                <Button
                  type="ghost"
                  size="sm"
                  icon={copied ? <Check size={14} /> : <Copy size={14} />}
                  onClick={() => handleCopy(vuln.url)}
                  title={copied ? '已复制' : '复制 URL'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 描述 */}
        {vuln.description && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">描述</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{vuln.description}</p>
          </div>
        )}

        {/* 元数据 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 模板ID */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">模板 ID</h3>
            </div>
            <code className="text-sm text-sky-400 font-mono">{vuln.template_id}</code>
          </div>

          {/* 发现时间 */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">发现时间</h3>
            </div>
            <span className="text-sm text-slate-400">
              {new Date(vuln.discovered_at).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        {/* 标签 */}
        {vuln.tags && vuln.tags.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">标签</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {vuln.tags.map((tag) => (
                <Badge key={tag} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* CVE */}
        {vuln.cve && vuln.cve.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">CVE 编号</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {vuln.cve.map((cve) => (
                <a
                  key={cve}
                  href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                >
                  {cve}
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 参考链接 */}
        {vuln.reference && vuln.reference.length > 0 && (
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={16} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-300">参考链接</h3>
            </div>
            <div className="space-y-2">
              {vuln.reference.map((ref, index) => (
                <a
                  key={index}
                  href={ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-slate-800/50 rounded-lg text-sm text-sky-400 hover:text-sky-300 hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate flex-1">{ref}</span>
                    <ExternalLink size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="text-sm text-slate-500">
            ID: <code className="text-slate-400">{vuln.id}</code>
          </div>

          <div className="flex items-center gap-3">
            {onMarkFalsePositive && (
              <Button
                type={vuln.is_false_positive ? 'secondary' : 'ghost'}
                onClick={() => onMarkFalsePositive(vuln.id, !vuln.is_false_positive)}
              >
                {vuln.is_false_positive ? '取消误报标记' : '标记为误报'}
              </Button>
            )}
            <Button type="primary" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
