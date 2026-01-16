/**
 * 统一的错误状态组件
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '加载失败',
  message,
  onRetry
}) => {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
      <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
      <p className="text-red-400 font-medium mb-2">{title}</p>
      <p className="text-slate-500 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          重试
        </button>
      )}
    </div>
  );
};
