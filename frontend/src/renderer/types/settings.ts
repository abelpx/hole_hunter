/**
 * 设置相关类型定义
 */

// 应用设置
export interface AppSettings {
  // 通用设置
  general: GeneralSettings;

  // Nuclei 设置
  nuclei: NucleiSettings;

  // 数据库设置
  database: DatabaseSettings;

  // 外观设置
  appearance: AppearanceSettings;
}

// 通用设置
export interface GeneralSettings {
  language: 'zh-CN' | 'en-US';
  autoRefresh: boolean;
  autoRefreshInterval: number; // 秒
  enableNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
}

// Nuclei 设置
export interface NucleiSettings {
  // Nuclei 路径
  nucleiPath: string;

  // 模板设置
  templatesPath?: string;
  autoUpdateTemplates: boolean;
  lastUpdateCheck?: string;

  // 默认扫描参数
  defaultRateLimit: number;
  defaultConcurrency: number;
  defaultTimeout: number;
  defaultRetries: number;

  // 高级选项
  excludeTags?: string[];
  customHeaders?: string[];
}

// 数据库设置
export interface DatabaseSettings {
  // 数据库路径
  databasePath: string;

  // 备份设置
  autoBackup: boolean;
  backupInterval: number; // 天
  backupPath?: string;
  maxBackups: number;

  // 数据保留
  dataRetentionDays: number;

  // 统计信息
  enableStats: boolean;
}

// 外观设置
export interface AppearanceSettings {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  sidebarCollapsed: boolean;
  animationsEnabled: boolean;
}

// 设置分类
export type SettingsCategory = 'general' | 'nuclei' | 'database' | 'appearance';

// 设置验证结果
export interface SettingsValidation {
  valid: boolean;
  errors: Record<string, string>;
}
