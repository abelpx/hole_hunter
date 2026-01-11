/**
 * ImportModal 组件
 * 导入 HTTP 请求的模态框
 */

import React, { useState } from 'react';
import { Modal, Select, Button, Badge } from '../ui';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: string, type: 'curl' | 'http') => Promise<void>;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [importType, setImportType] = useState<'curl' | 'http'>('curl');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!importData.trim()) {
      setError('请输入要导入的内容');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(importData, importType);
      setImportData('');
    } catch (err: any) {
      setError(err.message || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const examples = {
    curl: `curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token" \\
  -d '{"username":"admin","password":"123456"}'`,
    http: `POST https://api.example.com/users HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer token

{"username":"admin","password":"123456"}`,
  };

  return (
    <Modal
      visible={visible}
      title="导入 HTTP 请求"
      onClose={onClose}
      onConfirm={handleConfirm}
      confirmText="导入"
      width={700}
    >
      <div className="space-y-4">
        {/* 导入类型选择 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            导入类型
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setImportType('curl')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                importType === 'curl'
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-sm font-medium text-slate-200">cURL 命令</div>
              <div className="text-xs text-slate-500 mt-1">
                从 curl 命令导入
              </div>
            </button>
            <button
              onClick={() => setImportType('http')}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                importType === 'http'
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="text-sm font-medium text-slate-200">HTTP 请求</div>
              <div className="text-xs text-slate-500 mt-1">
                从原始 HTTP 请求导入
              </div>
            </button>
          </div>
        </div>

        {/* 导入内容输入 */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            粘贴 {importType === 'curl' ? 'cURL 命令' : 'HTTP 请求'}
          </label>
          <textarea
            className="w-full h-40 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            placeholder={examples[importType]}
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setImportData(examples[importType])}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              填充示例
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 支持说明 */}
        <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">支持格式:</strong>
            {importType === 'curl' ? (
              <>
                {' '}标准的 cURL 命令，包括 -H (headers), -d (data), -X (method) 等选项
              </>
            ) : (
              <>
                {' '}原始 HTTP 请求格式，包含请求行、headers 和 body
              </>
            )}
          </p>
        </div>
      </div>
    </Modal>
  );
};
