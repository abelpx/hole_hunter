/**
 * 设置管理 Store
 * 使用 Zustand 管理应用设置
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppSettings, GeneralSettings, NucleiSettings, DatabaseSettings, AppearanceSettings } from '../types/settings';

// 默认设置
const defaultGeneralSettings: GeneralSettings = {
  language: 'zh-CN',
  autoRefresh: true,
  autoRefreshInterval: 30,
  enableNotifications: true,
  logLevel: 'info',
};

const defaultNucleiSettings: NucleiSettings = {
  nucleiPath: 'nuclei',
  autoUpdateTemplates: false,
  defaultRateLimit: 150,
  defaultConcurrency: 25,
  defaultTimeout: 5,
  defaultRetries: 1,
};

const defaultDatabaseSettings: DatabaseSettings = {
  databasePath: '',
  autoBackup: true,
  backupInterval: 7,
  maxBackups: 10,
  dataRetentionDays: 90,
  enableStats: true,
};

const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'dark',
  accentColor: '#0EA5E9',
  fontSize: 'medium',
  sidebarCollapsed: false,
  animationsEnabled: true,
};

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;

  // Actions
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  updateNucleiSettings: (settings: Partial<NucleiSettings>) => Promise<void>;
  updateDatabaseSettings: (settings: Partial<DatabaseSettings>) => Promise<void>;
  updateAppearanceSettings: (settings: Partial<AppearanceSettings>) => Promise<void>;

  resetSettings: (category?: keyof AppSettings) => Promise<void>;
  exportSettings: () => Promise<void>;
  importSettings: (data: AppSettings) => Promise<void>;

  validateSettings: (settings: AppSettings) => { valid: boolean; errors: Record<string, string> };

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        settings: {
          general: defaultGeneralSettings,
          nuclei: defaultNucleiSettings,
          database: defaultDatabaseSettings,
          appearance: defaultAppearanceSettings,
        },
        loading: false,
        error: null,

        // 更新通用设置
        updateGeneralSettings: async (newSettings) => {
          set({ loading: true, error: null });
          try {
            const { settings } = get();
            const updated = {
              ...settings,
              general: { ...settings.general, ...newSettings },
            };

            // 验证设置
            const validation = get().validateSettings(updated);
            if (!validation.valid) {
              throw new Error(Object.values(validation.errors).join(', '));
            }

            set({ settings: updated, loading: false });

            // TODO: 保存到主进程
            if (typeof window !== 'undefined' && window.electronAPI) {
              // await window.electronAPI.settings.save(updated);
            }
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 更新扫描引擎设置
        updateNucleiSettings: async (newSettings) => {
          set({ loading: true, error: null });
          try {
            const { settings } = get();
            const updated = {
              ...settings,
              nuclei: { ...settings.nuclei, ...newSettings },
            };

            // 验证扫描引擎路径
            if (newSettings.nucleiPath) {
              // TODO: 验证扫描引擎是否可用
            }

            set({ settings: updated, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 更新数据库设置
        updateDatabaseSettings: async (newSettings) => {
          set({ loading: true, error: null });
          try {
            const { settings } = get();
            const updated = {
              ...settings,
              database: { ...settings.database, ...newSettings },
            };

            set({ settings: updated, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 更新外观设置
        updateAppearanceSettings: async (newSettings) => {
          set({ loading: true, error: null });
          try {
            const { settings } = get();
            const updated = {
              ...settings,
              appearance: { ...settings.appearance, ...newSettings },
            };

            set({ settings: updated, loading: false });

            // 应用主题
            if (newSettings.theme) {
              document.documentElement.classList.toggle('dark', newSettings.theme === 'dark');
            }

            // 应用字体大小
            if (newSettings.fontSize) {
              const fontSizes = { small: '14px', medium: '16px', large: '18px' };
              document.documentElement.style.fontSize = fontSizes[newSettings.fontSize];
            }
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 重置设置
        resetSettings: async (category) => {
          set({ loading: true, error: null });
          try {
            const { settings } = get();

            if (category) {
              // 重置单个分类
              const defaults = {
                general: defaultGeneralSettings,
                nuclei: defaultNucleiSettings,
                database: defaultDatabaseSettings,
                appearance: defaultAppearanceSettings,
              };
              set({
                settings: { ...settings, [category]: defaults[category] },
                loading: false,
              });
            } else {
              // 重置所有设置
              set({
                settings: {
                  general: defaultGeneralSettings,
                  nuclei: defaultNucleiSettings,
                  database: defaultDatabaseSettings,
                  appearance: defaultAppearanceSettings,
                },
                loading: false,
              });
            }
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 导出设置
        exportSettings: async () => {
          const { settings } = get();
          const dataStr = JSON.stringify(settings, null, 2);
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `holehunter-settings-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        },

        // 导入设置
        importSettings: async (data) => {
          set({ loading: true, error: null });
          try {
            // 验证设置
            const validation = get().validateSettings(data);
            if (!validation.valid) {
              throw new Error(Object.values(validation.errors).join(', '));
            }

            set({ settings: data, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        // 验证设置
        validateSettings: (settings) => {
          const errors: Record<string, string> = {};

          // 验证通用设置
          if (settings.general.autoRefreshInterval < 10 || settings.general.autoRefreshInterval > 300) {
            errors['general.autoRefreshInterval'] = '刷新间隔必须在10-300秒之间';
          }

          // 验证扫描引擎设置
          if (!settings.nuclei.nucleiPath) {
            errors['nuclei.nucleiPath'] = '扫描引擎路径不能为空';
          }

          if (settings.nuclei.defaultRateLimit < 1 || settings.nuclei.defaultRateLimit > 1000) {
            errors['nuclei.defaultRateLimit'] = '速率限制必须在1-1000之间';
          }

          if (settings.nuclei.defaultConcurrency < 1 || settings.nuclei.defaultConcurrency > 100) {
            errors['nuclei.defaultConcurrency'] = '并发数必须在1-100之间';
          }

          if (settings.nuclei.defaultTimeout < 1 || settings.nuclei.defaultTimeout > 60) {
            errors['nuclei.defaultTimeout'] = '超时时间必须在1-60秒之间';
          }

          // 验证数据库设置
          if (settings.database.dataRetentionDays < 1 || settings.database.dataRetentionDays > 365) {
            errors['database.dataRetentionDays'] = '数据保留天数必须在1-365天之间';
          }

          if (settings.database.maxBackups < 1 || settings.database.maxBackups > 50) {
            errors['database.maxBackups'] = '最大备份数必须在1-50之间';
          }

          return {
            valid: Object.keys(errors).length === 0,
            errors,
          };
        },

        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'settings-storage',
        partialize: (state) => ({ settings: state.settings }),
      }
    ),
    { name: 'SettingsStore' }
  )
);
