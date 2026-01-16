/**
 * 严重等级常量定义
 * 统一管理严重等级相关的配置
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SeverityConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const SEVERITY_CONFIGS: Record<SeverityLevel, SeverityConfig> = {
  critical: {
    label: '严重',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: 'alert-triangle',
  },
  high: {
    label: '高危',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: 'shield',
  },
  medium: {
    label: '中危',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    icon: 'alert-circle',
  },
  low: {
    label: '低危',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'info',
  },
  info: {
    label: '信息',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: 'file-text',
  },
};

export const SEVERITY_ORDER: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'info'];

export function getSeverityConfig(severity: SeverityLevel): SeverityConfig {
  return SEVERITY_CONFIGS[severity] || SEVERITY_CONFIGS.info;
}

export function getSeverityLabel(severity: SeverityLevel): string {
  return getSeverityConfig(severity).label;
}

export function getSeverityColor(severity: SeverityLevel): string {
  return getSeverityConfig(severity).color;
}

export function getSeverityBgColor(severity: SeverityLevel): string {
  return getSeverityConfig(severity).bgColor;
}

export function getSeverityBorderColor(severity: SeverityLevel): string {
  return getSeverityConfig(severity).borderColor;
}
