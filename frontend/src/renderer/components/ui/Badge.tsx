/**
 * Badge 和 Tag 组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

// Badge Props
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

// Tag Props
export interface TagProps {
  children: React.ReactNode;
  color?: string;
  onClose?: () => void;
  closable?: boolean;
}

// 样式配置
const badgeStyles: Record<
  'default' | 'success' | 'warning' | 'danger' | 'info',
  { bg: string; text: string; border: string }
> = {
  default: {
    bg: 'bg-slate-700',
    text: 'text-slate-300',
    border: 'border-slate-600',
  },
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  danger: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
  info: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
  },
};

const badgeSizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

/**
 * Badge 组件 - 用于显示状态或数量
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
}) => {
  const styles = badgeStyles[variant];
  const sizeClass = badgeSizes[size];

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center',
        'font-medium',
        'border rounded-full',
        styles.bg,
        styles.text,
        styles.border,
        sizeClass
      )}
    >
      {children}
    </span>
  );
};

/**
 * Tag 组件 - 用于显示标签
 */
export const Tag: React.FC<TagProps> = ({ children, color, onClose, closable }) => {
  const isClosable = closable || onClose;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className={clsx(
        'inline-flex items-center gap-1.5',
        'px-2.5 py-1',
        'text-sm',
        'bg-slate-800 border border-slate-600 rounded-md',
        color && 'border-current'
      )}
      style={color ? { color, backgroundColor: `${color}10` } : undefined}
    >
      <span>{children}</span>

      {isClosable && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-300 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </motion.span>
  );
};
