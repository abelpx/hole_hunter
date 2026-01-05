/**
 * Header 组件
 * 应用顶部导航栏
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  Settings,
  User,
  Shield,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';

// NavItem 类型
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

// Header Props
export interface HeaderProps {
  logo?: React.ReactNode;
  navItems?: NavItem[];
  onSearch?: (query: string) => void;
  notifications?: number;
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  logo,
  navItems = [],
  onSearch,
  notifications = 0,
  onSettingsClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-30"
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="h-full flex items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {logo || (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Shield size={18} className="text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-100">HoleHunter</span>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-8">
          <form
            onSubmit={handleSearch}
            className={clsx(
              'relative transition-all duration-200',
              searchFocused && 'scale-105'
            )}
          >
            <Search
              size={16}
              className={clsx(
                'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
                searchFocused ? 'text-sky-400' : 'text-slate-500'
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="搜索目标、漏洞..."
              className={clsx(
                'w-full h-9 pl-10 pr-4',
                'bg-slate-800 border rounded-lg',
                'text-sm text-slate-100 placeholder-slate-500',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2',
                searchFocused
                  ? 'border-sky-500 focus:ring-sky-500/50'
                  : 'border-slate-700 focus:border-sky-500'
              )}
            />
          </form>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Bell size={18} />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSettingsClick}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Settings size={18} />
          </motion.button>

          {/* User */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
};
