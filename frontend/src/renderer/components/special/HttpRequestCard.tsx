/**
 * HttpRequestCard 组件
 * 显示 HTTP 请求的卡片组件
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Edit,
  Trash2,
  MoreVertical,
  Clock,
  Tag,
} from 'lucide-react';
import { Button, Badge } from '../ui';
import { HttpRequest } from '../../types';
import clsx from 'clsx';

interface HttpRequestCardProps {
  request: HttpRequest;
  selected: boolean;
  onClick: (id: number) => void;
  onSend: (id: number) => Promise<void>;
  onEdit: (request: HttpRequest) => void;
  onDelete: (id: number) => Promise<void>;
  sending?: boolean;
}

// 方法颜色映射
const methodColors: Record<string, string> = {
  GET: 'bg-sky-500',
  POST: 'bg-emerald-500',
  PUT: 'bg-amber-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
  HEAD: 'bg-slate-500',
  OPTIONS: 'bg-slate-500',
};

export const HttpRequestCard: React.FC<HttpRequestCardProps> = ({
  request,
  selected,
  onClick,
  onSend,
  onEdit,
  onDelete,
  sending = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  // 解析 headers
  let headers: Array<{ key: string; value: string }> = [];
  try {
    headers = JSON.parse(request.headers || '[]');
  } catch (e) {
    // headers parse error
  }

  const handleSend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onSend(request.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(request);
    setShowMenu(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(request.id);
    setShowMenu(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onClick(request.id)}
      className={clsx(
        'relative bg-slate-800 border rounded-lg p-3 cursor-pointer transition-all',
        'hover:border-slate-600 hover:shadow-md',
        selected && 'border-sky-500 ring-1 ring-sky-500/20'
      )}
    >
      {/* 头部：方法和URL */}
      <div className="flex items-start gap-2 mb-2">
        <span
          className={clsx(
            'px-2 py-0.5 rounded text-xs font-semibold text-white flex-shrink-0',
            methodColors[request.method] || 'bg-slate-500'
          )}
        >
          {request.method}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 truncate">{request.url}</p>
          {request.name && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{request.name}</p>
          )}
        </div>

        {/* 更多菜单 */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <MoreVertical size={14} className="text-slate-400" />
          </motion.button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-6 z-20 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
              >
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit size={12} />
                  编辑
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  删除
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* 底部：标签和时间 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {request.tags && request.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {request.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400"
                >
                  {tag}
                </span>
              ))}
              {request.tags.length > 2 && (
                <span className="text-xs text-slate-500">
                  +{request.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={10} />
            {formatDate(request.updated_at || request.created_at)}
          </span>

          <Button
            type="ghost"
            size="sm"
            icon={<Play size={10} />}
            onClick={handleSend}
            loading={sending}
            disabled={sending}
            className="!p-1 !h-6 !w-6"
          />
        </div>
      </div>

      {/* Headers 预览 */}
      {headers.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-1">
            {headers.slice(0, 3).map((header) => (
              <span
                key={header.key}
                className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-500"
              >
                {header.key}
              </span>
            ))}
            {headers.length > 3 && (
              <span className="text-xs text-slate-600">+{headers.length - 3} more</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
