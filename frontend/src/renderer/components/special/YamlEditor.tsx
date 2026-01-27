/**
 * YAML 编辑器组件
 * 用于编辑 POC 模板的 YAML 内容
 */

import React, { useState, useEffect, useRef } from 'react';
import { FileCode, AlertCircle, CheckCircle2, Copy, Download, Upload } from 'lucide-react';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  onValidate?: (isValid: boolean, error?: string) => void;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder = defaultTemplate,
  onValidate,
}) => {
  const [content, setContent] = useState(value || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string; message?: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);
    onChange(newValue);

    // 清除之前的验证结果
    if (validationResult) {
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { getService } = await import('../../services/WailsService');
      const service = getService();
      const result = await service.validateCustomTemplate(content);

      setValidationResult(result);
      onValidate?.(result.valid, result.error);
    } catch (error) {
      setValidationResult({
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      });
      onValidate?.(false, error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `poc-template-${Date.now()}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        setContent(text);
        onChange(text);
      }
    };
    input.click();
  };

  const insertTemplate = (template: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = before + template + after;
    setContent(newContent);
    onChange(newContent);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + template.length, start + template.length);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-slate-400" />
          <span className="text-sm text-slate-300">
            {readOnly ? 'POC Template Viewer' : 'POC Template Editor'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              {/* 快速插入模板 - 只在编辑模式显示 */}
              <div className="relative group">
                <button
                  type="button"
                  className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                  onClick={() => insertTemplate(httpTemplate)}
                >
                  HTTP 模板
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors ml-1"
                  onClick={() => insertTemplate(matcherTemplate)}
                >
                  Matcher
                </button>
              </div>

              <div className="h-4 w-px bg-slate-600 mx-1" />

              {/* 上传按钮 - 只在编辑模式显示 */}
              <button
                type="button"
                onClick={handleUpload}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
                title="导入"
              >
                <Upload size={14} />
              </button>

              <div className="h-4 w-px bg-slate-600 mx-1" />
            </>
          )}

          {/* 文件操作 - 始终显示 */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="复制"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            title="下载"
          >
            <Download size={14} />
          </button>

          {!readOnly && (
            <>
              <div className="h-4 w-px bg-slate-600 mx-1" />

              {/* 验证按钮 - 只在编辑模式显示 */}
              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating || !content}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-slate-600 disabled:text-slate-400 transition-colors flex items-center gap-1"
              >
                {isValidating ? '验证中...' : '验证语法'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 验证结果 */}
      {validationResult && (
        <div className={`px-4 py-2 border-b ${
          validationResult.valid
            ? 'bg-emerald-900/30 border-emerald-700'
            : 'bg-red-900/30 border-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {validationResult.valid ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="text-red-400" />
            )}
            <span className={`text-sm ${
              validationResult.valid ? 'text-emerald-300' : 'text-red-300'
            }`}>
              {validationResult.valid ? validationResult.message : validationResult.error}
            </span>
          </div>
        </div>
      )}

      {/* 编辑器区域 */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className="w-full h-full px-4 py-3 bg-slate-900 text-slate-100 font-mono text-sm resize-none focus:outline-none"
          style={{ lineHeight: '1.6' }}
          spellCheck={false}
        />
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div>YAML Format</div>
      </div>
    </div>
  );
};

// 默认模板示例
const defaultTemplate = `id: custom-poc-example
info:
  name: Custom POC Template
  author: Your Name
  severity: high
  description: Description of your POC
  tags: custom,poc
  reference:
    - https://example.com

http:
  - method: GET
    path:
      - "{{BaseURL}}/api/vulnerable"

    matchers:
      - type: word
        words:
          - "vulnerable"
          - "exploit"
        condition: or
`;

// HTTP 模板片段
const httpTemplate = `http:
  - method: GET
    path:
      - "{{BaseURL}}/path/to/check"

    headers:
      User-Agent: Mozilla/5.0

    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200

      - type: word
        part: body
        words:
          - "specific_text"
`;

// Matcher 模板片段
const matcherTemplate = `matchers:
  - type: word
    part: body
    words:
      - "keyword1"
      - "keyword2"
    condition: or

  - type: regex
    part: body
    regex:
      - "(?i)error.*sql"

  - type: status
    status:
      - 500
      - 200
`;
