/**
 * Sidebar 组件
 * 应用侧边栏导航
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Target,
  ClipboardList,
  AlertTriangle,
  FileText,
  Layers,
  Wrench,
  Settings,
  HelpCircle,
  RotateCcw,
  Zap,
  Code,
} from 'lucide-react';
import clsx from 'clsx';

// MenuItem 类型
export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  onClick?: () => void;
}

// Sidebar Props
export interface SidebarProps {
  menuItems?: MenuItem[];
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  defaultCollapsed?: boolean;
}

// 默认菜单项
const defaultMenuItems: MenuItem[] = [
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

export const Sidebar: React.FC<SidebarProps> = ({
  menuItems = defaultMenuItems,
  activeItem = 'targets',
  onItemClick,
  defaultCollapsed = false,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleItemClick = (item: MenuItem) => {
    if (onItemClick) {
      onItemClick(item.id);
    }
    item.onClick?.();
  };

  return (
    <motion.aside
      initial={{ width: collapsed ? 64 : 240 }}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full bg-slate-900 border-r border-slate-700/50 flex flex-col"
      style={{
        boxShadow: '1px 0 3px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Menu Items */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={clsx(
              'relative w-full flex items-center px-4 py-2.5',
              'transition-all duration-150',
              'hover:bg-slate-800',
              activeItem === item.id
                ? 'bg-sky-500/10 text-sky-400 border-r-2 border-sky-500'
                : 'text-slate-400 hover:text-slate-300'
            )}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Icon */}
            <span className={clsx('flex-shrink-0', collapsed && 'mx-auto')}>
              {item.icon}
            </span>

            {/* Label & Badge */}
            <AnimatePresence>
              {!collapsed && (
                <>
                  <span className="ml-3 flex-1 text-left text-sm font-medium">
                    {item.label}
                  </span>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-700/50">
        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            'w-full h-8 flex items-center justify-center',
            'text-slate-400 hover:text-slate-300',
            'hover:bg-slate-800 rounded-md',
            'transition-colors'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </motion.button>
      </div>
    </motion.aside>
  );
};
