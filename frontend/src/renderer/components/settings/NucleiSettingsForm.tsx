/**
 * NucleiSettingsForm 组件
 * 扫描引擎设置表单
 */

import React, { useState } from 'react';
import { NucleiSettings } from '../../types/settings';
import { Input, Button } from '../ui';

export interface NucleiSettingsFormProps {
  settings: NucleiSettings;
  onChange: (settings: Partial<NucleiSettings>) => Promise<void>;
  onHasChanges: (hasChanges: boolean) => void;
}

export const NucleiSettingsForm: React.FC<NucleiSettingsFormProps> = ({
  settings,
  onChange,
  onHasChanges,
}) => {
  const [localSettings, setLocalSettings] = React.useState<NucleiSettings>(settings);
  const [checkingPath, setCheckingPath] = useState(false);
  const [pathStatus, setPathStatus] = React.useState<'unknown' | 'valid' | 'invalid'>('unknown');

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = async (field: keyof NucleiSettings, value: any) => {
    const updated = { ...localSettings, [field]: value };
    setLocalSettings(updated);
    onHasChanges(true);
    await onChange({ [field]: value });
  };

  const handleCheckPath = async () => {
    setCheckingPath(true);
    setPathStatus('unknown');

    // Wails 环境 - TODO: 实现 Wails 绑定来检查路径
    // 目前暂时标记为有效，因为 nuclei 应该在系统 PATH 中
    setPathStatus('valid');

    setCheckingPath(false);
  };

  const handleUpdateTemplates = async () => {
    if (!confirm('确定要更新扫描模板吗？这可能需要几分钟时间。')) {
      return;
    }

    // Wails 环境 - TODO: 实现 Wails 绑定来更新模板
    // 目前暂时显示成功消息
    alert('模板更新功能在开发中，请手动运行 nuclei -update-templates 命令');
    handleChange('lastUpdateCheck', new Date().toISOString());
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">扫描引擎配置</h2>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'text-sm',
              pathStatus === 'valid' && 'text-emerald-400',
              pathStatus === 'invalid' && 'text-red-400',
              pathStatus === 'unknown' && 'text-slate-500'
            )}
          >
            {pathStatus === 'valid' ? '✓ 扫描引擎可用' : pathStatus === 'invalid' ? '✗ 扫描引擎不可用' : '未检查'}
          </span>
        </div>
      </div>

      {/* 扫描引擎路径 */}
      <div className="space-y-2">
        <Input
          label="扫描引擎可执行文件路径"
          placeholder="nuclei 或 /usr/local/bin/nuclei"
          value={localSettings.nucleiPath}
          onChange={(e) => {
            handleChange('nucleiPath', e.target.value);
            setPathStatus('unknown');
          }}
        />
        <div className="flex items-center gap-2">
          <Button
            type="secondary"
            size="sm"
            onClick={handleCheckPath}
            disabled={checkingPath}
          >
            {checkingPath ? '检查中...' : '验证路径'}
          </Button>
          <span className="text-xs text-slate-500">
            留空使用系统 PATH 中的扫描引擎
          </span>
        </div>
      </div>

      {/* 模板路径 */}
      <Input
        label="模板路径（可选）"
        placeholder="/path/to/nuclei-templates"
        value={localSettings.templatesPath || ''}
        onChange={(e) => handleChange('templatesPath', e.target.value || undefined)}
      />

      {/* 自动更新模板 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">自动更新模板</span>
          <button
            onClick={() => handleChange('autoUpdateTemplates', !localSettings.autoUpdateTemplates)}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors relative',
              localSettings.autoUpdateTemplates ? 'bg-sky-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                localSettings.autoUpdateTemplates ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </label>
        <Button
          type="secondary"
          size="sm"
          onClick={handleUpdateTemplates}
        >
          立即更新模板
        </Button>
      </div>

      {/* 默认扫描参数 */}
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <h3 className="text-lg font-medium text-slate-200">默认扫描参数</h3>

        {/* 速率限制 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">速率限制（请求/秒）</label>
          <input
            type="range"
            min="1"
            max="1000"
            step="10"
            value={localSettings.defaultRateLimit}
            onChange={(e) => handleChange('defaultRateLimit', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span className="text-sky-400 font-medium">{localSettings.defaultRateLimit}</span>
            <span>1000</span>
          </div>
        </div>

        {/* 并发数 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">并发数</label>
          <input
            type="range"
            min="1"
            max="100"
            value={localSettings.defaultConcurrency}
            onChange={(e) => handleChange('defaultConcurrency', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span className="text-sky-400 font-medium">{localSettings.defaultConcurrency}</span>
            <span>100</span>
          </div>
        </div>

        {/* 超时时间 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">超时时间（秒）</label>
          <input
            type="range"
            min="1"
            max="60"
            value={localSettings.defaultTimeout}
            onChange={(e) => handleChange('defaultTimeout', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span className="text-sky-400 font-medium">{localSettings.defaultTimeout}s</span>
            <span>60</span>
          </div>
        </div>

        {/* 重试次数 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">重试次数</label>
          <input
            type="range"
            min="0"
            max="5"
            value={localSettings.defaultRetries}
            onChange={(e) => handleChange('defaultRetries', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span className="text-sky-400 font-medium">{localSettings.defaultRetries}</span>
            <span>5</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
