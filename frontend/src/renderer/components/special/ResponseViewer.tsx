/**
 * ResponseViewer 组件
 * HTTP 响应查看器
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, XCircle, Clock, FileText, Database } from 'lucide-react';
import { HttpResponse } from '../../types';
import clsx from 'clsx';

interface ResponseViewerProps {
  response: HttpResponse | null;
  loading?: boolean;
}

// 状态颜色
const getStatusColor = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) return 'text-emerald-400';
  if (statusCode >= 300 && statusCode < 400) return 'text-sky-400';
  if (statusCode >= 400 && statusCode < 500) return 'text-amber-400';
  if (statusCode >= 500) return 'text-red-400';
  return 'text-slate-400';
};

const getStatusBg = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) return 'bg-emerald-500/10';
  if (statusCode >= 300 && statusCode < 400) return 'bg-sky-500/10';
  if (statusCode >= 400 && statusCode < 500) return 'bg-amber-500/10';
  if (statusCode >= 500) return 'bg-red-500/10';
  return 'bg-slate-500/10';
};

export const ResponseViewer: React.FC<ResponseViewerProps> = ({
  response,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'stats'>('body');

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="text-sky-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">发送请求中...</p>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">发送请求后查看响应</p>
        </div>
      </div>
    );
  }

  // 解析 headers
  let headers: Array<{ key: string; value: string }> = [];
  try {
    headers = JSON.parse(response.headers || '[]');
  } catch (e) {
    // headers parse error
  }

  // 尝试格式化 JSON body
  let formattedBody = response.body;
  try {
    const parsed = JSON.parse(response.body);
    formattedBody = JSON.stringify(parsed, null, 2);
  } catch (e) {
    // 不是 JSON，保持原样
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* 状态栏 */}
      <div className={clsx(
        'px-4 py-2 border-b border-slate-700 flex items-center justify-between',
        getStatusBg(response.status_code)
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'flex items-center gap-2',
            getStatusColor(response.status_code)
          )}>
            {response.status_code >= 200 && response.status_code < 300 ? (
              <CheckCircle2 size={16} />
            ) : (
              <XCircle size={16} />
            )}
            <span className="font-semibold">
              {response.status_code} {response.status_text}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDuration(response.duration)}
          </span>
          <span className="flex items-center gap-1">
            <Database size={12} />
            {formatBytes(response.body_size)}
          </span>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('body')}
          className={clsx(
            'px-4 py-2 text-sm border-b-2 transition-colors',
            activeTab === 'body'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          )}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={clsx(
            'px-4 py-2 text-sm border-b-2 transition-colors',
            activeTab === 'headers'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          )}
        >
          Headers
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={clsx(
            'px-4 py-2 text-sm border-b-2 transition-colors',
            activeTab === 'stats'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          )}
        >
          Statistics
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'body' && (
          <div className="p-4">
            {formattedBody ? (
              <pre className="bg-slate-900 rounded p-4 text-sm text-slate-300 overflow-x-auto whitespace-pre-wrap">
                {formattedBody}
              </pre>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">No response body</p>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="p-4">
            {headers.length > 0 ? (
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div
                    key={index}
                    className="flex gap-3 text-sm py-2 border-b border-slate-800"
                  >
                    <span className="text-sky-400 font-medium flex-shrink-0 min-w-[150px]">
                      {header.key}:
                    </span>
                    <span className="text-slate-300 break-all">{header.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">No headers</p>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Status Code</p>
                <p className={clsx('text-lg font-semibold', getStatusColor(response.status_code))}>
                  {response.status_code}
                </p>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Duration</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatDuration(response.duration)}
                </p>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Body Size</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatBytes(response.body_size)}
                </p>
              </div>
              <div className="bg-slate-800 rounded p-4">
                <p className="text-xs text-slate-400 mb-1">Header Size</p>
                <p className="text-lg font-semibold text-slate-200">
                  {formatBytes(response.header_size)}
                </p>
              </div>
            </div>
            <div className="mt-4 bg-slate-800 rounded p-4">
              <p className="text-xs text-slate-400 mb-1">Timestamp</p>
              <p className="text-sm text-slate-300">
                {new Date(response.timestamp).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
