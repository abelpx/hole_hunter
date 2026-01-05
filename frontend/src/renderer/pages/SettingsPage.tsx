/**
 * SettingsPage 组件
 * 设置页面
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../components/ui';
import { useSettingsStore } from '../store/settingsStore';
import { GeneralSettingsForm } from '../components/settings/GeneralSettingsForm';
import { NucleiSettingsForm } from '../components/settings/NucleiSettingsForm';
import { DatabaseSettingsForm } from '../components/settings/DatabaseSettingsForm';
import { AppearanceSettingsForm } from '../components/settings/AppearanceSettingsForm';
import { SettingsCategory } from '../types/settings';

export const SettingsPage: React.FC = () => {
  const {
    settings,
    loading,
    error,
    updateGeneralSettings,
    updateNucleiSettings,
    updateDatabaseSettings,
    updateAppearanceSettings,
    resetSettings,
    exportSettings,
  } = useSettingsStore();

  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const categories = [
    { id: 'general' as SettingsCategory, name: '通用设置', icon: SettingsIcon },
    { id: 'nuclei' as SettingsCategory, name: 'Nuclei 配置', icon: SettingsIcon },
    { id: 'database' as SettingsCategory, name: '数据库管理', icon: SettingsIcon },
    { id: 'appearance' as SettingsCategory, name: '外观设置', icon: SettingsIcon },
  ];

  const handleSave = async () => {
    try {
      switch (activeCategory) {
        case 'general':
          // 设置已在组件内部保存
          break;
        case 'nuclei':
          // 设置已在组件内部保存
          break;
        case 'database':
          // 设置已在组件内部保存
          break;
        case 'appearance':
          // 设置已在组件内部保存
          break;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleReset = async () => {
    if (confirm(`确定要重置${categories.find(c => c.id === activeCategory)?.name}吗？`)) {
      try {
        await resetSettings(activeCategory);
        setHasChanges(false);
      } catch (error) {
        console.error('Failed to reset settings:', error);
      }
    }
  };

  const handleExport = async () => {
    try {
      await exportSettings();
    } catch (error) {
      console.error('Failed to export settings:', error);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          await useSettingsStore.getState().importSettings(data);
          setHasChanges(false);
          setImportError(null);
        } catch (error: any) {
          setImportError(error.message || '导入设置失败');
        }
      }
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">设置</h1>
          <p className="text-slate-400 mt-1">应用程序配置和偏好设置</p>
        </div>

        <div className="flex items-center gap-3">
          {/* 导入导出 */}
          <Button
            type="secondary"
            size="sm"
            icon={<Download size={16} />}
            onClick={handleExport}
          >
            导出
          </Button>
          <Button
            type="secondary"
            size="sm"
            icon={<Upload size={16} />}
            onClick={handleImport}
          >
            导入
          </Button>

          {/* 保存和重置 */}
          {hasChanges && (
            <>
              <Button
                type="ghost"
                size="sm"
                icon={<RotateCcw size={16} />}
                onClick={handleReset}
              >
                重置
              </Button>
              <Button
                type="primary"
                size="sm"
                icon={saved ? <Check size={16} /> : <Save size={16} />}
                onClick={handleSave}
              >
                {saved ? '已保存' : '保存更改'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 导入错误 */}
      {importError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <X size={18} />
            <span>{importError}</span>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <X size={18} />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* 侧边栏 */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                  activeCategory === category.id
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                )}
              >
                <category.icon size={18} />
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 设置内容 */}
        <div className="flex-1">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeCategory === 'general' && (
              <GeneralSettingsForm
                settings={settings.general}
                onChange={updateGeneralSettings}
                onHasChanges={setHasChanges}
              />
            )}

            {activeCategory === 'nuclei' && (
              <NucleiSettingsForm
                settings={settings.nuclei}
                onChange={updateNucleiSettings}
                onHasChanges={setHasChanges}
              />
            )}

            {activeCategory === 'database' && (
              <DatabaseSettingsForm
                settings={settings.database}
                onChange={updateDatabaseSettings}
                onHasChanges={setHasChanges}
              />
            )}

            {activeCategory === 'appearance' && (
              <AppearanceSettingsForm
                settings={settings.appearance}
                onChange={updateAppearanceSettings}
                onHasChanges={setHasChanges}
              />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// 简单的 clsx 工具
function clsx(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
