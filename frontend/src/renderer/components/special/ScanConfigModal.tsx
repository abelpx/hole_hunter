/**
 * ScanConfigModal 组件
 * 扫描配置模态框
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal, Input, Select, Button, Badge } from '../ui';

// 预设模板组
export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  templates?: string[];
  severity?: string[];
  tags?: string[];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'full',
    name: '全量扫描',
    description: '使用所有模板进行完整扫描',
    severity: ['critical', 'high', 'medium', 'low', 'info'],
  },
  {
    id: 'critical-only',
    name: '仅严重漏洞',
    description: '仅扫描严重和高危漏洞',
    severity: ['critical', 'high'],
  },
  {
    id: 'cves',
    name: 'CVE 漏洞',
    description: '扫描已知的 CVE 漏洞',
    tags: ['cve'],
  },
  {
    id: 'exposures',
    name: '信息泄露',
    description: '扫描敏感信息泄露问题',
    tags: ['exposure'],
  },
  {
    id: 'misconfig',
    name: '配置错误',
    description: '检测配置错误和常见安全问题',
    tags: ['misconfig'],
  },
  {
    id: 'technologies',
    name: '技术栈识别',
    description: '识别使用的技术栈和版本',
    tags: ['tech'],
  },
  {
    id: 'quick',
    name: '快速扫描',
    description: '快速检测常见高危漏洞',
    severity: ['critical', 'high'],
    tags: ['cve', 'rce', 'sqli'],
  },
];

export interface ScanConfigOptions {
  severity?: string[];
  tags?: string[];
  excludeTags?: string[];
  rateLimit?: number;
  concurrency?: number;
  timeout?: number;
  retries?: number;
}

export interface ScanConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (config: ScanConfigOptions & { taskName?: string }) => void;
  targetName?: string;
}

export const ScanConfigModal: React.FC<ScanConfigModalProps> = ({
  visible,
  onClose,
  onConfirm,
  targetName = '',
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('quick');
  const [taskName, setTaskName] = useState<string>('');
  const [customConfig, setCustomConfig] = useState<ScanConfigOptions>({
    severity: ['critical', 'high'],
    tags: [],
    excludeTags: [],
    rateLimit: 150,
    concurrency: 25,
    timeout: 5,
    retries: 1,
  });

  // 处理预设选择
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCustomConfig({
        ...customConfig,
        severity: preset.severity,
        tags: preset.tags,
      });
    }
  };

  // 处理确认
  const handleConfirm = () => {
    onConfirm({ ...customConfig, taskName: taskName.trim() || undefined });
    onClose();
  };

  const severityOptions = [
    { value: 'critical', label: '严重 (Critical)' },
    { value: 'high', label: '高危 (High)' },
    { value: 'medium', label: '中危 (Medium)' },
    { value: 'low', label: '低危 (Low)' },
    { value: 'info', label: '信息 (Info)' },
  ];

  return (
    <Modal
      visible={visible}
      title={targetName ? `扫描目标: ${targetName}` : '配置扫描参数'}
      onClose={onClose}
      onConfirm={handleConfirm}
      width={600}
    >
      <div className="space-y-6">
        {/* 任务名称 */}
        <div>
          <Input
            label="任务名称"
            placeholder="为扫描任务设置一个名称（可选）"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">留空则自动生成</p>
        </div>

        {/* 预设选择 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">扫描预设</label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedPreset === preset.id
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-slate-200 mb-1">{preset.name}</div>
                <div className="text-xs text-slate-500">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 漏洞严重性 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">漏洞严重性</label>
          <div className="flex flex-wrap gap-2">
            {severityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  const current = customConfig.severity || [];
                  if (current.includes(option.value)) {
                    setCustomConfig({
                      ...customConfig,
                      severity: current.filter((s) => s !== option.value),
                    });
                  } else {
                    setCustomConfig({
                      ...customConfig,
                      severity: [...current, option.value],
                    });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  (customConfig.severity || []).includes(option.value)
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 扫描参数 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">扫描参数</h3>

          {/* 并发数 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">并发数</label>
              <Badge variant="info" size="sm">
                {customConfig.concurrency}
              </Badge>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={customConfig.concurrency}
              onChange={(e) =>
                setCustomConfig({ ...customConfig, concurrency: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <p className="text-xs text-slate-500 mt-1">同时发送的请求数量</p>
          </div>

          {/* 速率限制 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">速率限制 (请求/秒)</label>
              <Badge variant="info" size="sm">
                {customConfig.rateLimit}
              </Badge>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={customConfig.rateLimit}
              onChange={(e) =>
                setCustomConfig({ ...customConfig, rateLimit: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <p className="text-xs text-slate-500 mt-1">每秒最大请求数</p>
          </div>

          {/* 超时时间 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">超时时间 (秒)</label>
              <Badge variant="info" size="sm">
                {customConfig.timeout}
              </Badge>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={customConfig.timeout}
              onChange={(e) =>
                setCustomConfig({ ...customConfig, timeout: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* 重试次数 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">重试次数</label>
              <Badge variant="info" size="sm">
                {customConfig.retries}
              </Badge>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              value={customConfig.retries}
              onChange={(e) =>
                setCustomConfig({ ...customConfig, retries: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>

        {/* 自定义标签 */}
        <div>
          <Input
            label="自定义标签"
            placeholder="例如: cve,rce,sqli (逗号分隔)"
            value={customConfig.tags?.join(',') || ''}
            onChange={(e) =>
              setCustomConfig({
                ...customConfig,
                tags: e.target.value.split(',').filter(Boolean),
              })
            }
          />
          <p className="text-xs text-slate-500 mt-1">仅使用包含指定标签的模板</p>
        </div>

        {/* 排除标签 */}
        <div>
          <Input
            label="排除标签"
            placeholder="例如: dos,brute-force (逗号分隔)"
            value={customConfig.excludeTags?.join(',') || ''}
            onChange={(e) =>
              setCustomConfig({
                ...customConfig,
                excludeTags: e.target.value.split(',').filter(Boolean),
              })
            }
          />
          <p className="text-xs text-slate-500 mt-1">排除包含这些标签的模板</p>
        </div>
      </div>
    </Modal>
  );
};
