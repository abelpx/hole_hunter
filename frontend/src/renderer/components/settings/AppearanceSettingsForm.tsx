/**
 * AppearanceSettingsForm 组件
 * 外观设置表单
 */

import React from 'react';
import { AppearanceSettings } from '../../types/settings';
import { Select, Button } from '../ui';

const accentColors = [
  { value: '#0EA5E9', label: '天蓝色', color: 'bg-sky-500' },
  { value: '#8B5CF6', label: '紫色', color: 'bg-purple-500' },
  { value: '#EC4899', label: '粉红色', color: 'bg-pink-500' },
  { value: '#10B981', label: '绿色', color: 'bg-emerald-500' },
  { value: '#F59E0B', label: '橙色', color: 'bg-amber-500' },
];

export interface AppearanceSettingsFormProps {
  settings: AppearanceSettings;
  onChange: (settings: Partial<AppearanceSettings>) => Promise<void>;
  onHasChanges: (hasChanges: boolean) => void;
}

export const AppearanceSettingsForm: React.FC<AppearanceSettingsFormProps> = ({
  settings,
  onChange,
  onHasChanges,
}) => {
  const handleChange = async (field: keyof AppearanceSettings, value: any) => {
    onHasChanges(true);
    await onChange({ [field]: value });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">外观设置</h2>
      </div>

      {/* 主题 */}
      <Select
        label="主题"
        placeholder="选择主题"
        options={[
          { value: 'dark', label: '深色' },
          { value: 'light', label: '浅色' },
          { value: 'auto', label: '跟随系统' },
        ]}
        value={settings.theme}
        onChange={(value) => handleChange('theme', value as any)}
      />

      {/* 主题色 */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">主题色</label>
        <div className="grid grid-cols-5 gap-3">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => handleChange('accentColor', color.value)}
              className={clsx(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                settings.accentColor === color.value
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              )}
            >
              <div className={`w-8 h-8 rounded-full ${color.color}`} />
              <span className="text-xs text-slate-400">{color.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 字体大小 */}
      <Select
        label="字体大小"
        placeholder="选择字体大小"
        options={[
          { value: 'small', label: '小' },
          { value: 'medium', label: '中' },
          { value: 'large', label: '大' },
        ]}
        value={settings.fontSize}
        onChange={(value) => handleChange('fontSize', value as any)}
      />

      {/* 侧边栏 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">折叠侧边栏</span>
          <button
            onClick={() => handleChange('sidebarCollapsed', !settings.sidebarCollapsed)}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors relative',
              settings.sidebarCollapsed ? 'bg-sky-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                settings.sidebarCollapsed ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </label>
      </div>

      {/* 动画 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">启用动画</span>
          <button
            onClick={() => handleChange('animationsEnabled', !settings.animationsEnabled)}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors relative',
              settings.animationsEnabled ? 'bg-sky-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                settings.animationsEnabled ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </label>
        <p className="text-xs text-slate-500">禁用动画可提升性能</p>
      </div>
    </div>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
