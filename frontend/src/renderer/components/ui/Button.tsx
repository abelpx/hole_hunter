/**
 * Button 组件
 * 基础按钮组件，支持多种类型、尺寸和状态
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

// Button 类型
export type ButtonType = 'primary' | 'secondary' | 'ghost' | 'danger';

// Button 尺寸
export type ButtonSize = 'sm' | 'md' | 'lg';

// Button Props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  type?: ButtonType;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  block?: boolean;
}

// 样式配置
const buttonStyles: Record<ButtonType, { base: string; hover: string; active: string; text: string }> = {
  primary: {
    base: 'bg-sky-500 border-sky-500',
    hover: 'hover:bg-sky-600 hover:border-sky-600',
    active: 'active:bg-sky-700 active:border-sky-700',
    text: 'text-white',
  },
  secondary: {
    base: 'bg-slate-700 border-slate-600',
    hover: 'hover:bg-slate-600 hover:border-slate-500',
    active: 'active:bg-slate-500 active:border-slate-400',
    text: 'text-slate-100',
  },
  ghost: {
    base: 'bg-transparent border-slate-600',
    hover: 'hover:bg-slate-700 hover:border-slate-500',
    active: 'active:bg-slate-600 active:border-slate-400',
    text: 'text-slate-300',
  },
  danger: {
    base: 'bg-red-500 border-red-500',
    hover: 'hover:bg-red-600 hover:border-red-600',
    active: 'active:bg-red-700 active:border-red-700',
    text: 'text-white',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-11 px-6 text-lg gap-2.5',
};

const iconSize: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      type = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      block = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const styles = buttonStyles[type];
    const sizeClass = sizeStyles[size];
    const iconSz = iconSize[size];

    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          // 基础样式
          'inline-flex items-center justify-center',
          'border rounded-md',
          'font-medium',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // 类型样式
          styles.base,
          styles.hover,
          styles.active,
          styles.text,
          // 尺寸样式
          sizeClass,
          // 块级按钮
          block && 'w-full',
          className
        )}
        whileHover={disabled || loading ? {} : { scale: 1.02 }}
        whileTap={disabled || loading ? {} : { scale: 0.98 }}
        transition={{ duration: 0.1 }}
        {...props}
      >
        {loading && <Loader2 size={iconSz} className="animate-spin" />}

        {!loading && icon && iconPosition === 'left' && (
          <motion.span
            initial={false}
            className="flex items-center"
            transition={{ duration: 0.1 }}
          >
            {icon}
          </motion.span>
        )}

        <span>{children}</span>

        {!loading && icon && iconPosition === 'right' && (
          <motion.span
            initial={false}
            className="flex items-center"
            transition={{ duration: 0.1 }}
          >
            {icon}
          </motion.span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
