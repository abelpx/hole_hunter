/**
 * StatCard 组件
 * 统计卡片组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'text-slate-400',
  bgColor = 'bg-slate-800/50',
  borderColor = 'border-slate-700',
  trend,
  loading = false,
  onClick,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={`${bgColor} border ${borderColor} rounded-xl p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 标题 */}
          <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon size={18} className={color} />}
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
          </div>

          {/* 数值 */}
          {loading ? (
            <div className="h-8 bg-slate-700 rounded animate-pulse w-24" />
          ) : (
            <div className="text-3xl font-bold text-slate-100">{value}</div>
          )}

          {/* 趋势 */}
          {trend && !loading && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
              <span className="text-slate-500">vs 上周</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
