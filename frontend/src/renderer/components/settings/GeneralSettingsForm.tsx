/**
 * GeneralSettingsForm 组件
 * 通用设置表单
 */

import React from 'react';
import { GeneralSettings } from '../../types/settings';
import { Input, Select, Button } from '../ui';

export interface GeneralSettingsFormProps {
  settings: GeneralSettings;
  onChange: (settings: Partial<GeneralSettings>) => Promise<void>;
  onHasChanges: (hasChanges: boolean) => void;
}

export const GeneralSettingsForm: React.FC<GeneralSettingsFormProps> = ({
  settings,
  onChange,
  onHasChanges,
}) => {
  const [localSettings, setLocalSettings] = React.useState<GeneralSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = async (field: keyof GeneralSettings, value: any) => {
    const updated = { ...localSettings, [field]: value };
    setLocalSettings(updated);
    onHasChanges(true);
    await onChange({ [field]: value });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">通用设置</h2>
      </div>

      {/* 语言 */}
      <Select
        label="语言"
        placeholder="选择语言"
        options={[
          { value: 'zh-CN', label: '简体中文' },
          { value: 'en-US', label: 'English' },
        ]}
        value={localSettings.language}
        onChange={(value) => handleChange('language', value)}
      />

      {/* 自动刷新 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">自动刷新</span>
          <button
            onClick={() => handleChange('autoRefresh', !localSettings.autoRefresh)}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors relative',
              localSettings.autoRefresh ? 'bg-sky-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                localSettings.autoRefresh ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </label>
        <p className="text-xs text-slate-500">自动刷新数据和统计信息</p>
      </div>

      {/* 刷新间隔 */}
      {localSettings.autoRefresh && (
        <Input
          label="刷新间隔（秒）"
          type="number"
          min={10}
          max={300}
          value={localSettings.autoRefreshInterval.toString()}
          onChange={(e) => handleChange('autoRefreshInterval', parseInt(e.target.value) || 30)}
          error={
            localSettings.autoRefreshInterval < 10 || localSettings.autoRefreshInterval > 300
              ? '刷新间隔必须在10-300秒之间'
              : undefined
          }
        />
      )}

      {/* 通知 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">启用通知</span>
          <button
            onClick={() => handleChange('enableNotifications', !localSettings.enableNotifications)}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors relative',
              localSettings.enableNotifications ? 'bg-sky-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                localSettings.enableNotifications ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </label>
        <p className="text-xs text-slate-500">接收扫描完成和错误通知</p>
      </div>

      {/* 日志级别 */}
      <Select
        label="日志级别"
        placeholder="选择日志级别"
        options={[
          { value: 'debug', label: '调试 (Debug)' },
          { value: 'info', label: '信息 (Info)' },
          { value: 'warning', label: '警告 (Warning)' },
          { value: 'error', label: '错误 (Error)' },
        ]}
        value={localSettings.logLevel}
        onChange={(value) => handleChange('logLevel', value as any)}
      />
    </div>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
