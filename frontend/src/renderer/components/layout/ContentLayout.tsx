/**
 * ContentLayout 组件
 * 主布局组件，包含 Header 和 Sidebar
 */

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar, MenuItem } from './Sidebar';
import clsx from 'clsx';

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

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  children,
  menuItems,
  activeMenuItem,
  onMenuItemClick,
  showHeader = true,
  showSidebar = true,
  headerProps,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
