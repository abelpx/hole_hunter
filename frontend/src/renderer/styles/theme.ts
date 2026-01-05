/**
 * Theme configuration for HoleHunter
 */

export interface Theme {
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      elevated: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      disabled: string;
    };
    border: {
      default: string;
      hover: string;
      focus: string;
    };
    semantic: {
      danger: string;
      warning: string;
      success: string;
      info: string;
      neutral: string;
    };
  };
}

const darkTheme: Theme = {
  colors: {
    background: {
      primary: '#0F172A', // slate-900
      secondary: '#1E293B', // slate-800
      tertiary: '#334155', // slate-700
      elevated: 'rgba(30, 41, 59, 0.8)',
    },
    text: {
      primary: '#F1F5F9', // slate-100
      secondary: '#94A3B8', // slate-400
      tertiary: '#64748B', // slate-500
      disabled: '#475569', // slate-600
    },
    border: {
      default: '#334155', // slate-700
      hover: '#475569', // slate-600
      focus: '#0EA5E9', // sky-500
    },
    semantic: {
      danger: '#EF4444', // red-500
      warning: '#F59E0B', // amber-500
      success: '#10B981', // emerald-500
      info: '#3B82F6', // blue-500
      neutral: '#6B7280', // gray-500
    },
  },
};

const lightTheme: Theme = {
  colors: {
    background: {
      primary: '#FFFFFF',
      secondary: '#F8FAFC', // slate-50
      tertiary: '#F1F5F9', // slate-100
      elevated: 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: '#0F172A', // slate-900
      secondary: '#475569', // slate-600
      tertiary: '#64748B', // slate-500
      disabled: '#94A3B8', // slate-400
    },
    border: {
      default: '#E2E8F0', // slate-200
      hover: '#CBD5E1', // slate-300
      focus: '#0EA5E9', // sky-500
    },
    semantic: {
      danger: '#EF4444',
      warning: '#F59E0B',
      success: '#10B981',
      info: '#3B82F6',
      neutral: '#6B7280',
    },
  },
};

export const createTheme = (themeMode: 'light' | 'dark'): Theme => {
  return themeMode === 'dark' ? darkTheme : lightTheme;
};

export default darkTheme;
