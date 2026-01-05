/**
 * DatabaseSettingsForm 组件
 * 数据库设置表单
 */

import React from 'react';
import { DatabaseSettings } from '../../types/settings';
import { Input, Button } from '../ui';

export interface DatabaseSettingsFormProps {
  settings: DatabaseSettings;
  onChange: (settings: Partial<DatabaseSettings>) => Promise<void>;
  onHasChanges: (hasChanges: boolean) => void;
}

export const DatabaseSettingsForm: React.FC<DatabaseSettingsFormProps> = ({
  settings,
  onChange,
  onHasChanges,
}) => {
  const handleChange = async (field: keyof DatabaseSettings, value: any) => {
    onHasChanges(true);
    await onChange({ [field]: value });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">数据库管理</h2>
      </div>

      {/* 数据库路径 */}
      <Input
        label="数据库路径"
        placeholder="/path/to/database.db"
        value={settings.databasePath}
        onChange={(e) => handleChange('databasePath', e.target.value)}
        disabled
      />
      <p className="text-xs text-slate-500">数据库路径由应用自动管理</p>

      {/* 自动备份 */}
      <div className="space-y-3">
        <label className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">自动备份</span>
          <button
            onClick={() => handleChange('autoBackup', !settings.autoBackup)}
            className={clsx(
              'w-11 h-6 rounded-full transition-colors relative',
              settings.autoBackup ? 'bg-sky-500' : 'bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                settings.autoBackup ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </label>
      </div>

      {/* 备份间隔 */}
      {settings.autoBackup && (
        <Input
          label="备份间隔（天）"
          type="number"
          min={1}
          max={30}
          value={settings.backupInterval.toString()}
          onChange={(e) => handleChange('backupInterval', parseInt(e.target.value) || 7)}
        />
      )}

      {/* 最大备份数 */}
      <Input
        label="最大备份数"
        type="number"
        min={1}
        max={50}
        value={settings.maxBackups.toString()}
        onChange={(e) => handleChange('maxBackups', parseInt(e.target.value) || 10)}
      />

      {/* 数据保留天数 */}
      <Input
        label="数据保留天数"
        type="number"
        min={1}
        max={365}
        value={settings.dataRetentionDays.toString()}
        onChange={(e) => handleChange('dataRetentionDays', parseInt(e.target.value) || 90)}
      />
      <p className="text-xs text-slate-500">超过此天数的数据将被自动清理</p>
    </div>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
