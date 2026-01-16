/**
 * 统一的加载状态组件
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = '加载中...',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-slate-500">
        <Loader2 size={size === 'sm' ? 16 : size === 'md' ? 24 : 32} className="animate-spin" />
        <span className={size === 'sm' ? 'text-sm' : 'text-base'}>{message}</span>
      </div>
    </div>
  );
};
