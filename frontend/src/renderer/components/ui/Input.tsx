/**
 * Input 组件
 * 基础输入框组件，支持前缀、后缀、错误状态等
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

// Input Props
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  type?: 'text' | 'password' | 'email' | 'number' | 'url';
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 text-sm px-3',
  md: 'h-10 text-base px-3',
  lg: 'h-11 text-lg px-4',
};

const iconSize: Record<'sm' | 'md' | 'lg', number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      prefix,
      suffix,
      type = 'text',
      size = 'md',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;
    const iconSz = iconSize[size];

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {prefix && (
            <div className="absolute left-0 top-0 h-full flex items-center px-3 pointer-events-none">
              <span className="text-slate-400 flex items-center" style={{ fontSize: iconSz }}>
                {prefix}
              </span>
            </div>
          )}

          <motion.input
            ref={ref}
            type={actualType}
            disabled={disabled}
            className={clsx(
              // 基础样式
              'w-full',
              'bg-slate-800 border rounded-md',
              'text-slate-100 placeholder-slate-500',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2',
              // 尺寸
              sizeStyles[size],
              // 前缀/后缀间距
              prefix && 'pl-10',
              suffix && 'pr-10',
              // 状态样式
              error
                ? 'border-red-500 focus:ring-red-500/50'
                : isFocused
                ? 'border-sky-500 focus:ring-sky-500/50'
                : 'border-slate-600 focus:border-sky-500',
              disabled && 'opacity-50 cursor-not-allowed bg-slate-900',
              className
            )}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            animate={{
              borderColor: error ? '#EF4444' : isFocused ? '#0EA5E9' : '#475569',
            }}
            transition={{ duration: 0.15 }}
            {...props}
          />

          {suffix && !isPassword && (
            <div className="absolute right-0 top-0 h-full flex items-center px-3 pointer-events-none">
              <span className="text-slate-400 flex items-center" style={{ fontSize: iconSz }}>
                {suffix}
              </span>
            </div>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 h-full flex items-center px-3 text-slate-400 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={iconSz} /> : <Eye size={iconSz} />}
            </button>
          )}

          {error && (
            <div className="absolute right-0 top-0 h-full flex items-center pr-3">
              <AlertCircle size={iconSz} className="text-red-500" />
            </div>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-1.5 overflow-hidden"
            >
              <p className="text-sm text-red-500 flex items-center gap-1">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';
