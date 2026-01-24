/**
 * ContentLayout 组件
 * 主布局组件，包含 Header 和 Sidebar
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  ClipboardList,
  AlertTriangle,
  FileText,
  Layers,
  Wrench,
  Settings,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Header } from './Header';
import { Sidebar, MenuItem } from './Sidebar';
import clsx from 'clsx';
import { getService } from '../../services/WailsService';

// Layout Props
export interface ContentLayoutProps {
  children: React.ReactNode;
  menuItems?: MenuItem[];
  activeMenuItem?: string;
  onMenuItemClick?: (itemId: string) => void;
  showHeader?: boolean;
  showSidebar?: boolean;
  headerProps?: React.ComponentProps<typeof Header>;
}

// 默认菜单项定义（带图标）
const baseMenuItems: MenuItem[] = [
  { id: 'dashboard', label: '仪表板', icon: <Target size={18} /> },
  { id: 'targets', label: '目标管理', icon: <Target size={18} /> },
  { id: 'tasks', label: '扫描任务', icon: <ClipboardList size={18} /> },
  { id: 'vulnerabilities', label: '漏洞列表', icon: <AlertTriangle size={18} /> },
  { id: 'replay', label: 'HTTP 重放', icon: <RotateCcw size={18} /> },
  { id: 'brute', label: '暴力破解', icon: <Zap size={18} /> },
  { id: 'reports', label: '扫描报告', icon: <FileText size={18} /> },
  { id: 'poc', label: 'PoC 管理', icon: <Layers size={18} /> },
  { id: 'tools', label: '工具箱', icon: <Wrench size={18} /> },
  { id: 'settings', label: '系统设置', icon: <Settings size={18} /> },
];

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  children,
  menuItems: customMenuItems,
  activeMenuItem,
  onMenuItemClick,
  showHeader = true,
  showSidebar = true,
  headerProps,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [vulnCount, setVulnCount] = useState(0);

  // 加载漏洞统计
  const loadVulnCount = useCallback(async () => {
    try {
      const service = getService();
      const vulns = await service.getAllVulnerabilities();
      // 只统计未标记为误报的漏洞
      const activeVulns = vulns.filter(v => !v.is_false_positive && !v.false_positive);
      setVulnCount(activeVulns.length);
    } catch (error) {
      console.error('[ContentLayout] Failed to load vuln count:', error);
    }
  }, []);

  // 初始加载和定期刷新
  useEffect(() => {
    loadVulnCount();

    // 每 30 秒刷新一次统计数据
    const interval = setInterval(loadVulnCount, 30000);
    return () => clearInterval(interval);
  }, [loadVulnCount]);

  // 更新菜单项，添加实时漏洞数量
  const menuItems = React.useMemo(() => {
    if (customMenuItems) {
      return customMenuItems;
    }
    // 更新漏洞列表的 badge
    return baseMenuItems.map(item => {
      if (item.id === 'vulnerabilities') {
        return {
          ...item,
          badge: vulnCount > 0 ? vulnCount : undefined,
        };
      }
      return item;
    });
  }, [customMenuItems, vulnCount]);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      {showHeader && <Header {...headerProps} />}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar
            menuItems={menuItems}
            activeItem={activeMenuItem}
            onItemClick={onMenuItemClick}
            defaultCollapsed={sidebarCollapsed}
          />
        )}

        {/* Content */}
        <main
          className={clsx(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'bg-slate-900'
          )}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#475569 #1e293b',
          }}
        >
          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        main::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        main::-webkit-scrollbar-track {
          background: transparent;
        }
        main::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }
        main::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};
