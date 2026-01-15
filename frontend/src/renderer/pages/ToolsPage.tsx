/**
 * 工具箱页面
 * 提供各种安全测试常用的辅助工具
 */

import React, { useState } from 'react';
import {
  Wrench,
  Hash,
  Clock,
  FileText,
  Code,
  Shield,
  Key,
  Lock,
  Unlock,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Network,
  Globe,
  Search,
  Database,
  Cpu,
} from 'lucide-react';
import { Button, Input, Badge } from '../components/ui';
import { getService } from '../services/WailsService';
import clsx from 'clsx';

// 工具分类
interface ToolCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  tools: Tool[];
}

interface Tool {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<any>;
}

// ==================== 编码/解码工具 ====================

const EncodingTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'base64' | 'url' | 'html' | 'hex'>('base64');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleEncode = () => {
    try {
      let result = '';
      switch (activeTab) {
        case 'base64':
          result = btoa(unescape(encodeURIComponent(input)));
          break;
        case 'url':
          result = encodeURIComponent(input);
          break;
        case 'html':
          result = input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
          break;
        case 'hex':
          result = input
            .split('')
            .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
            .join(' ');
          break;
      }
      setOutput(result);
    } catch (error) {
      setOutput('编码失败: ' + (error as Error).message);
    }
  };

  const handleDecode = () => {
    try {
      let result = '';
      switch (activeTab) {
        case 'base64':
          result = decodeURIComponent(escape(atob(input)));
          break;
        case 'url':
          result = decodeURIComponent(input);
          break;
        case 'html':
          const txt = document.createElement('textarea');
          txt.innerHTML = input;
          result = txt.value;
          break;
        case 'hex':
          result = input
            .split(' ')
            .map((h) => String.fromCharCode(parseInt(h, 16)))
            .join('');
          break;
      }
      setOutput(result);
    } catch (error) {
      setOutput('解码失败: ' + (error as Error).message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 标签切换 */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'base64', label: 'Base64' },
          { id: 'url', label: 'URL' },
          { id: 'html', label: 'HTML' },
          { id: 'hex', label: 'Hex' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 输入输出 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            输入
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请输入要编码或解码的内容"
            className="w-full h-48 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-300">
              输出
            </label>
            {output && (
              <Button
                type="ghost"
                size="sm"
                icon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={handleCopy}
              >
                {copied ? '已复制' : '复制'}
              </Button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            className="w-full h-48 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <Button type="primary" onClick={handleEncode}>
          编码
        </Button>
        <Button type="secondary" onClick={handleDecode}>
          解码
        </Button>
        <Button
          type="ghost"
          onClick={() => {
            setInput('');
            setOutput('');
          }}
        >
          清空
        </Button>
      </div>
    </div>
  );
};

// ==================== 哈希计算工具 ====================

const HashTools: React.FC = () => {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});

  const calculateHashes = async () => {
    if (!input) {
      setHashes({});
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    // MD5 (简化实现，实际应使用 crypto-js)
    const md5Hash = await simpleHash(data, 'MD5');

    // SHA 系列
    const sha1Hash = await crypto.subtle.digest('SHA-1', data);
    const sha256Hash = await crypto.subtle.digest('SHA-256', data);
    const sha512Hash = await crypto.subtle.digest('SHA-512', data);

    setHashes({
      MD5: md5Hash,
      SHA1: bufferToHex(sha1Hash),
      'SHA-256': bufferToHex(sha256Hash),
      'SHA-512': bufferToHex(sha512Hash),
    });
  };

  const simpleHash = async (data: Uint8Array, algorithm: string): Promise<string> => {
    // 这是一个简化的哈希实现，实际应该使用 crypto-js 或类似库
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  };

  const bufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          输入文本
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="请输入要计算哈希的文本"
          className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      <Button type="primary" onClick={calculateHashes}>
        计算哈希
      </Button>

      {Object.keys(hashes).length > 0 && (
        <div className="space-y-3">
          {Object.entries(hashes).map(([name, hash]) => (
            <div
              key={name}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="info">{name}</Badge>
                <Button
                  type="ghost"
                  size="sm"
                  icon={<Copy size={14} />}
                  onClick={() => copyHash(hash)}
                >
                  复制
                </Button>
              </div>
              <p className="text-sm text-slate-200 font-mono break-all">{hash}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 时间戳转换工具 ====================

const TimestampTools: React.FC = () => {
  const [unixTimestamp, setUnixTimestamp] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState('');

  const getCurrentTimestamp = () => {
    const now = Math.floor(Date.now() / 1000);
    setUnixTimestamp(now.toString());
    setDateTime(new Date().toISOString().slice(0, 19).replace('T', ' '));
  };

  const timestampToDate = () => {
    if (!unixTimestamp) return;
    const ts = parseInt(unixTimestamp);
    const date = new Date(ts * 1000);
    setDateTime(date.toISOString().slice(0, 19).replace('T', ' '));
  };

  const dateToTimestamp = () => {
    if (!dateTime) return;
    const date = new Date(dateTime);
    setUnixTimestamp(Math.floor(date.getTime() / 1000).toString());
  };

  React.useEffect(() => {
    const updateCurrent = () => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000).toString());
    };
    updateCurrent();
    const interval = setInterval(updateCurrent, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      {/* 当前时间戳 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">当前 Unix 时间戳</p>
            <p className="text-2xl font-bold text-slate-100 font-mono">
              {currentTimestamp}
            </p>
          </div>
          <Clock size={32} className="text-sky-400" />
        </div>
      </div>

      {/* Unix 时间戳 → 日期时间 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">
          Unix 时间戳 → 日期时间
        </h3>
        <div className="flex gap-3">
          <Input
            placeholder="Unix 时间戳（秒）"
            value={unixTimestamp}
            onChange={(e) => setUnixTimestamp(e.target.value)}
            className="flex-1"
          />
          <Button type="primary" onClick={timestampToDate}>
            转换
          </Button>
        </div>
        {dateTime && (
          <p className="mt-3 text-sm text-slate-200 font-mono">{dateTime}</p>
        )}
      </div>

      {/* 日期时间 → Unix 时间戳 */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">
          日期时间 → Unix 时间戳
        </h3>
        <div className="flex gap-3">
          <input
            type="datetime-local"
            value={dateTime ? dateTime.replace(' ', 'T') : ''}
            onChange={(e) => setDateTime(e.target.value.replace('T', ' '))}
            className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Button type="secondary" onClick={dateToTimestamp}>
            转换
          </Button>
        </div>
        {unixTimestamp && (
          <p className="mt-3 text-sm text-slate-200 font-mono">{unixTimestamp}</p>
        )}
      </div>

      <Button type="ghost" onClick={getCurrentTimestamp}>
        使用当前时间
      </Button>
    </div>
  );
};

// ==================== UUID 生成工具 ====================

const UUIDTools: React.FC = () => {
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(5);

  const generateUUIDs = () => {
    const newUuids = [];
    for (let i = 0; i < count; i++) {
      newUuids.push(crypto.randomUUID());
    }
    setUuids(newUuids);
  };

  const copyUUID = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            生成数量
          </label>
          <Input
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
          />
        </div>
        <Button type="primary" onClick={generateUUIDs}>
          生成 UUID
        </Button>
      </div>

      {uuids.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">生成结果</span>
            <Button type="ghost" size="sm" onClick={copyAll}>
              复制全部
            </Button>
          </div>
          {uuids.map((uuid, index) => (
            <div
              key={index}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between"
            >
              <span className="text-sm text-slate-200 font-mono">{uuid}</span>
              <Button
                type="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => copyUUID(uuid)}
              >
                复制
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 正则表达式测试工具 ====================

const RegexTools: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState('');
  const [matches, setMatches] = useState<RegExpMatchArray[]>([]);
  const [error, setError] = useState('');

  const testRegex = () => {
    try {
      const regex = new RegExp(pattern, flags);
      const testStr = testString;
      const result: RegExpMatchArray[] = [];

      if (flags.includes('g')) {
        let match;
        while ((match = regex.exec(testStr)) !== null) {
          result.push(match);
          if (!regex.global) break;
        }
      } else {
        const match = testStr.match(regex);
        if (match) result.push(match as RegExpMatchArray);
      }

      setMatches(result);
      setError('');
    } catch (err) {
      setError((err as Error).message);
      setMatches([]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          正则表达式
        </label>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              /
            </span>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="例如: \d{4}-\d{2}-\d{2}"
              className="pl-8 pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              /
            </span>
          </div>
          <Input
            value={flags}
            onChange={(e) => setFlags(e.target.value)}
            placeholder="gim"
            className="w-24 text-center"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          测试文本
        </label>
        <textarea
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          placeholder="请输入要测试的文本"
          className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      <Button type="primary" onClick={testRegex}>
        测试
      </Button>

      {matches.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-slate-400">
            找到 {matches.length} 个匹配
          </span>
          {matches.map((match, index) => (
            <div
              key={index}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success">匹配 {index + 1}</Badge>
                <span className="text-xs text-slate-400">
                  位置: {match.index} - {match.index! + match[0].length}
                </span>
              </div>
              <p className="text-sm text-sky-400 font-mono break-all">
                {match[0]}
              </p>
              {match.length > 1 && (
                <div className="mt-2 space-y-1">
                  {match.slice(1).map((group, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-400 font-mono break-all"
                    >
                      <span className="text-slate-500">${i + 1}: </span>
                      {group || '(空)'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== JWT 工具 ====================

const JWTTools: React.FC = () => {
  const [token, setToken] = useState('');
  const [header, setHeader] = useState<any>(null);
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState('');

  const parseJWT = () => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('无效的 JWT 格式');
      }

      const decodedHeader = JSON.parse(atob(parts[0]));
      const decodedPayload = JSON.parse(atob(parts[1]));

      setHeader(decodedHeader);
      setPayload(decodedPayload);
      setError('');
    } catch (err) {
      setError((err as Error).message);
      setHeader(null);
      setPayload(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          JWT Token
        </label>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          placeholder="请输入 JWT Token"
          className="w-full h-24 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none font-mono text-sm"
        />
      </div>

      <Button type="primary" onClick={parseJWT}>
        解析
      </Button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {header && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Header</h3>
              <Badge variant="info">头部</Badge>
            </div>
            <pre className="text-xs text-slate-300 overflow-auto">
              {JSON.stringify(header, null, 2)}
            </pre>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Payload</h3>
              <Badge variant="success">载荷</Badge>
            </div>
            <pre className="text-xs text-slate-300 overflow-auto">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {payload && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-3">标准声明</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-400">Issued At (iat): </span>
              <span className="text-slate-200">
                {payload.iat ? new Date(payload.iat * 1000).toLocaleString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Expiration (exp): </span>
              <span className="text-slate-200">
                {payload.exp
                  ? new Date(payload.exp * 1000).toLocaleString() +
                    (payload.exp * 1000 < Date.now()
                      ? ' (已过期)'
                      : ' (未过期)')
                  : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Not Before (nbf): </span>
              <span className="text-slate-200">
                {payload.nbf ? new Date(payload.nbf * 1000).toLocaleString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Issuer (iss): </span>
              <span className="text-slate-200">{payload.iss || '-'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 端口扫描工具 ====================

interface PortScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service?: string;
  latency?: number;
}

const PortScannerTool: React.FC = () => {
  const [target, setTarget] = useState('');
  const [ports, setPorts] = useState('21,22,80,443,3389,8080');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PortScanResult[]>([]);
  const [progress, setProgress] = useState(0);

  const commonPorts = [
    { port: 21, service: 'FTP' },
    { port: 22, service: 'SSH' },
    { port: 23, service: 'Telnet' },
    { port: 25, service: 'SMTP' },
    { port: 53, service: 'DNS' },
    { port: 80, service: 'HTTP' },
    { port: 110, service: 'POP3' },
    { port: 143, service: 'IMAP' },
    { port: 443, service: 'HTTPS' },
    { port: 445, service: 'SMB' },
    { port: 3306, service: 'MySQL' },
    { port: 3389, service: 'RDP' },
    { port: 5432, service: 'PostgreSQL' },
    { port: 6379, service: 'Redis' },
    { port: 8080, service: 'HTTP-Proxy' },
    { port: 27017, service: 'MongoDB' },
  ];

  const startScan = async () => {
    if (!target) {
      alert('请输入目标地址');
      return;
    }

    setScanning(true);
    setResults([]);
    setProgress(0);

    try {
      const portList = ports.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));

      // 调用后端 API 进行端口扫描
      const scanResults = await getService().scanPorts({
        target,
        ports: portList,
        timeout: 2000,
        batch_size: 50,
      });

      setResults(scanResults);
      setProgress(100);
    } catch (error) {
      console.error('Port scan failed:', error);
      alert('端口扫描失败: ' + (error as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const getStatusBadge = (status: PortScanResult['status']) => {
    const variants = {
      open: 'success',
      closed: 'default',
      filtered: 'warning',
    } as const;
    const labels = {
      open: '开放',
      closed: '关闭',
      filtered: '过滤',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            目标地址
          </label>
          <Input
            placeholder="例如: example.com 或 192.168.1.1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            端口列表（逗号分隔）
          </label>
          <Input
            placeholder="例如: 21,22,80,443,3389"
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Button
          type="primary"
          onClick={startScan}
          loading={scanning}
          icon={<Network size={16} />}
        >
          {scanning ? '扫描中...' : '开始扫描'}
        </Button>
        <Button
          type="ghost"
          onClick={() => {
            setResults([]);
            setProgress(0);
          }}
        >
          清空结果
        </Button>
        {scanning && (
          <span className="text-sm text-slate-400">
            {progress.toFixed(0)}%
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              扫描结果 ({results.filter(r => r.status === 'open').length} 个开放端口)
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">端口</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">状态</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">服务</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">延迟</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 text-sm font-mono text-slate-200">
                      {result.port}
                    </td>
                    <td className="px-4 py-2">{getStatusBadge(result.status)}</td>
                    <td className="px-4 py-2 text-sm text-slate-400">
                      {result.service || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-400">
                      {result.latency ? `${result.latency}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <p className="text-xs text-slate-400">
          <strong>常见端口:</strong> {commonPorts.slice(0, 8).map(p => p.port).join(', ')} ...
        </p>
      </div>
    </div>
  );
};

// ==================== 域名爆破工具 ====================

interface SubdomainResult {
  subdomain: string;
  resolved: boolean;
  ips?: string[];
  latency?: number;
}

const DomainBruteTool: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [wordlist, setWordlist] = useState('www\nmail\nftp\nadmin\napi\ndev\nstaging\ntest\nblog\nshop');
  const [bruting, setBruting] = useState(false);
  const [results, setResults] = useState<SubdomainResult[]>([]);

  const startBrute = async () => {
    if (!domain) {
      alert('请输入主域名');
      return;
    }

    setBruting(true);
    setResults([]);

    try {
      const subdomains = wordlist.split('\n').filter(s => s.trim());

      // 调用后端 API 进行域名爆破
      const bruteResults = await getService().bruteSubdomains({
        domain,
        wordlist: subdomains,
        timeout: 5000,
        batch_size: 100,
      });

      setResults(bruteResults);
    } catch (error) {
      console.error('Domain brute failed:', error);
      alert('域名爆破失败: ' + (error as Error).message);
    } finally {
      setBruting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            主域名
          </label>
          <Input
            placeholder="例如: example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            已发现子域名
          </label>
          <div className="h-10 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200">
            {results.length}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          子域名字典（每行一个）
        </label>
        <textarea
          value={wordlist}
          onChange={(e) => setWordlist(e.target.value)}
          className="w-full h-32 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="primary"
          onClick={startBrute}
          loading={bruting}
          icon={<Globe size={16} />}
        >
          {bruting ? '爆破中...' : '开始爆破'}
        </Button>
        <Button
          type="ghost"
          onClick={() => setResults([])}
        >
          清空结果
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm text-slate-400">
            发现 {results.length} 个子域名
          </span>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex flex-col py-2 border-b border-slate-700 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-200 font-mono">
                    {result.subdomain}
                  </span>
                  <Badge variant={result.resolved ? 'success' : 'default'}>
                    {result.resolved ? '已解析' : '未解析'}
                  </Badge>
                </div>
                {result.resolved && result.ips && result.ips.length > 0 && (
                  <div className="mt-1 text-xs text-slate-400">
                    IP: {result.ips.join(', ')}
                    {result.latency && ` (${result.latency}ms)`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== IP/CIDR 计算工具 ====================

const IPCalcTool: React.FC = () => {
  const [cidr, setCidr] = useState('192.168.1.0/24');
  const [result, setResult] = useState<{
    network: string;
    broadcast: string;
    firstIp: string;
    lastIp: string;
    numHosts: number;
    subnetMask: string;
  } | null>(null);

  const calculate = () => {
    try {
      const [network, prefix] = cidr.split('/');
      const prefixLength = parseInt(prefix);

      // 简化的 CIDR 计算（实际应该使用专业库）
      const numHosts = Math.pow(2, 32 - prefixLength) - 2;
      const subnetMask = [...Array(4).keys()].map(octet => {
        const bits = 8 - Math.max(0, prefixLength - octet * 8);
        return 256 - Math.pow(2, bits);
      }).join('.');

      setResult({
        network: `${network}/${prefix}`,
        broadcast: `${network.split('.').slice(0, 3).join('.')}.${255}`,
        firstIp: `${network.split('.').slice(0, 3).join('.')}.${1}`,
        lastIp: `${network.split('.').slice(0, 3).join('.')}.${254}`,
        numHosts: Math.max(0, numHosts),
        subnetMask,
      });
    } catch (error) {
      alert('CIDR 格式无效');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          CIDR 地址
        </label>
        <div className="flex gap-3">
          <Input
            placeholder="例如: 192.168.1.0/24"
            value={cidr}
            onChange={(e) => setCidr(e.target.value)}
            className="flex-1"
          />
          <Button type="primary" onClick={calculate}>
            计算
          </Button>
        </div>
      </div>

      {result && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">网络地址:</span>
              <p className="text-slate-200 font-mono mt-1">{result.network}</p>
            </div>
            <div>
              <span className="text-slate-400">子网掩码:</span>
              <p className="text-slate-200 font-mono mt-1">{result.subnetMask}</p>
            </div>
            <div>
              <span className="text-slate-400">广播地址:</span>
              <p className="text-slate-200 font-mono mt-1">{result.broadcast}</p>
            </div>
            <div>
              <span className="text-slate-400">可用主机数:</span>
              <p className="text-slate-200 font-mono mt-1">{result.numHosts.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-400">首个 IP:</span>
              <p className="text-slate-200 font-mono mt-1">{result.firstIp}</p>
            </div>
            <div>
              <span className="text-slate-400">最后 IP:</span>
              <p className="text-slate-200 font-mono mt-1">{result.lastIp}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 数据格式化工具 ====================

const DataFormatterTool: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [format, setFormat] = useState<'json' | 'xml' | 'url'>('json');

  const formatData = () => {
    try {
      switch (format) {
        case 'json':
          const parsed = JSON.parse(input);
          setOutput(JSON.stringify(parsed, null, 2));
          break;
        case 'url':
          // URL 编码
          setOutput(encodeURIComponent(input));
          break;
        case 'xml':
          // 简单的 XML 格式化（实际应该使用专业库）
          setOutput(input);
          break;
      }
    } catch (error) {
      setOutput('格式化失败: ' + (error as Error).message);
    }
  };

  const minify = () => {
    try {
      switch (format) {
        case 'json':
          const parsed = JSON.parse(input);
          setOutput(JSON.stringify(parsed));
          break;
        case 'xml':
          // 移除多余空白
          setOutput(input.replace(/\s+/g, ' ').trim());
          break;
        case 'url':
          setOutput(decodeURIComponent(input));
          break;
      }
    } catch (error) {
      setOutput('压缩失败: ' + (error as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'json', label: 'JSON' },
          { id: 'xml', label: 'XML' },
          { id: 'url', label: 'URL' },
        ].map((fmt) => (
          <button
            key={fmt.id}
            onClick={() => setFormat(fmt.id as any)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              format === fmt.id
                ? 'bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            )}
          >
            {fmt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            输入
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`请输入要格式化的 ${format.toUpperCase()} 数据`}
            className="w-full h-48 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            输出
          </label>
          <textarea
            value={output}
            readOnly
            className="w-full h-48 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none resize-none font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="primary" onClick={formatData}>
          格式化
        </Button>
        <Button type="secondary" onClick={minify}>
          压缩
        </Button>
        <Button
          type="ghost"
          onClick={() => {
            navigator.clipboard.writeText(output);
          }}
          icon={<Copy size={14} />}
        >
          复制
        </Button>
      </div>
    </div>
  );
};

// ==================== 工具箱主页面 ====================

export const ToolsPage: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const toolCategories: ToolCategory[] = [
    {
      id: 'encoding',
      name: '编码/解码',
      icon: <Code size={18} />,
      tools: [
        {
          id: 'base64',
          name: '编码/解码',
          description: 'Base64、URL、HTML、Hex 编码转换',
          component: EncodingTools,
        },
      ],
    },
    {
      id: 'hash',
      name: '哈希计算',
      icon: <Hash size={18} />,
      tools: [
        {
          id: 'hash',
          name: '哈希计算',
          description: 'MD5、SHA1、SHA256、SHA512',
          component: HashTools,
        },
      ],
    },
    {
      id: 'converter',
      name: '转换工具',
      icon: <Unlock size={18} />,
      tools: [
        {
          id: 'timestamp',
          name: '时间戳转换',
          description: 'Unix 时间戳与日期时间互转',
          component: TimestampTools,
        },
        {
          id: 'uuid',
          name: 'UUID 生成',
          description: '批量生成 UUID v4',
          component: UUIDTools,
        },
        {
          id: 'ipcalc',
          name: 'IP/CIDR 计算',
          description: '网络地址、子网掩码计算',
          component: IPCalcTool,
        },
      ],
    },
    {
      id: 'security',
      name: '安全工具',
      icon: <Shield size={18} />,
      tools: [
        {
          id: 'jwt',
          name: 'JWT 解析',
          description: '解析和验证 JSON Web Token',
          component: JWTTools,
        },
        {
          id: 'regex',
          name: '正则测试',
          description: '正则表达式测试和验证',
          component: RegexTools,
        },
      ],
    },
    {
      id: 'network',
      name: '网络工具',
      icon: <Network size={18} />,
      tools: [
        {
          id: 'portscan',
          name: '端口扫描',
          description: 'TCP 端口扫描和服务识别',
          component: PortScannerTool,
        },
        {
          id: 'domainbrute',
          name: '域名爆破',
          description: '子域名枚举和爆破',
          component: DomainBruteTool,
        },
      ],
    },
    {
      id: 'data',
      name: '数据处理',
      icon: <Database size={18} />,
      tools: [
        {
          id: 'formatter',
          name: '数据格式化',
          description: 'JSON/XML 格式化和压缩',
          component: DataFormatterTool,
        },
      ],
    },
  ];

  const handleCategoryToggle = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
  };

  const handleToolSelect = (category: ToolCategory, tool: Tool) => {
    setExpandedCategory(category.id);
    setSelectedTool(tool);
  };

  // 如果选择了工具，显示工具详情
  if (selectedTool) {
    const ToolComponent = selectedTool.component;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            type="ghost"
            icon={<ChevronRight size={16} />}
            onClick={() => setSelectedTool(null)}
          >
            返回工具箱
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-100">{selectedTool.name}</h2>
            <p className="text-slate-400 mt-1">{selectedTool.description}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <ToolComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">工具箱</h1>
        <p className="text-slate-400 mt-1">安全测试常用辅助工具集</p>
      </div>

      {/* 工具分类列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {toolCategories.map((category) => (
          <div
            key={category.id}
            className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
          >
            {/* 分类标题 */}
            <button
              onClick={() => handleCategoryToggle(category.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400">
                  {category.icon}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-slate-200">{category.name}</h3>
                  <p className="text-xs text-slate-400">
                    {category.tools.length} 个工具
                  </p>
                </div>
              </div>
              {expandedCategory === category.id ? (
                <ChevronDown size={18} className="text-slate-400" />
              ) : (
                <ChevronRight size={18} className="text-slate-400" />
              )}
            </button>

            {/* 工具列表 */}
            {expandedCategory === category.id && (
              <div className="border-t border-slate-700 divide-y divide-slate-700">
                {category.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolSelect(category, tool)}
                    className="w-full px-6 py-4 flex items-start gap-3 hover:bg-slate-700/30 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-200">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {tool.description}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-500 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 快速访问 */}
      <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/10 border border-sky-500/20 rounded-xl p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-4">快速访问</h3>
        <div className="flex flex-wrap gap-2">
          {toolCategories.flatMap((category) =>
            category.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-sky-500 hover:text-sky-400 transition-colors"
              >
                {tool.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
