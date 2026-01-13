/**
 * Select 组件
 * 下拉选择组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import { createPortal } from 'react-dom';

// Select Option
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Select Props
export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-8 text-sm px-3',
  md: 'h-10 text-base px-3',
  lg: 'h-11 text-lg px-4',
};

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '请选择',
  label,
  error,
  disabled,
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find((opt) => opt.value === value);

  // 计算下拉菜单位置
  useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next < options.length ? next : prev;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next >= 0 ? next : prev;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && !options[highlightedIndex].disabled) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, onChange]);

  const handleSelect = (option: SelectOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
    }
  };

  return (
    <div className={className || "w-full"}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      <button
        ref={selectRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={clsx(
          // 基础样式
          'w-full',
          'bg-slate-800 border rounded-md',
          'text-left',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2',
          // 尺寸
          sizeStyles[size],
          // 状态
          error
            ? 'border-red-500 focus:ring-red-500/50'
            : isOpen
            ? 'border-sky-500 focus:ring-sky-500/50'
            : 'border-slate-600 focus:border-sky-500',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-900',
          'flex items-center justify-between'
        )}
      >
        <span className={clsx(!value && 'text-slate-500')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
          className={clsx(
            'text-slate-400 transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 overflow-hidden"
          >
            <p className="text-sm text-red-500">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen &&
        createPortal(
          <div
            className="fixed z-50"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
          >
            <motion.div
              ref={listRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="bg-slate-800 border border-slate-600 rounded-md shadow-xl max-h-60 overflow-auto"
            >
              {options.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => handleSelect(option)}
                  className={clsx(
                    'w-full px-3 py-2 text-left flex items-center justify-between',
                    'transition-colors duration-75',
                    'focus:outline-none',
                    // 状态
                    option.disabled && 'opacity-50 cursor-not-allowed',
                    !option.disabled && [
                      highlightedIndex === index && 'bg-slate-700',
                      option.value === value && 'bg-sky-500/20 text-sky-400',
                      option.value !== value && 'text-slate-300 hover:bg-slate-700',
                    ]
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={14} />}
                </button>
              ))}
            </motion.div>
          </div>,
          document.body
        )}
    </div>
  );
};
