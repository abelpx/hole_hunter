/**
 * VulnChart 组件
 * 漏洞统计图表组件（使用纯 CSS 实现，无需额外图表库）
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface VulnChartData {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  count: number;
  label: string;
}

export interface VulnChartProps {
  data: VulnChartData[];
  title?: string;
  type?: 'bar' | 'donut';
  className?: string;
}

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-sky-500',
  low: 'bg-slate-500',
  info: 'bg-slate-400',
};

const severityTextColors = {
  critical: 'text-red-400',
  high: 'text-amber-400',
  medium: 'text-sky-400',
  low: 'text-slate-400',
  info: 'text-slate-400',
};

export const VulnChart: React.FC<VulnChartProps> = ({
  data,
  title = '漏洞统计',
  type = 'bar',
  className = '',
}) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (type === 'bar') {
    const maxCount = Math.max(...data.map((d) => d.count));

    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item) => {
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const percentageOfTotal = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div key={item.severity}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-200">{item.count}</span>
                    <span className="text-xs text-slate-500">({percentageOfTotal.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full ${severityColors[item.severity]} rounded-full`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Donut Chart
  if (type === 'donut') {
    let currentAngle = 0;

    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            {/* SVG Donut Chart */}
            <svg width="200" height="200" viewBox="-1 -1 2 2" className="transform -rotate-90">
              {data.map((item) => {
                if (item.count === 0) return null;

                const percentage = total > 0 ? item.count / total : 0;
                const angle = percentage * Math.PI * 2;

                // Create arc path
                const x1 = Math.cos(currentAngle);
                const y1 = Math.sin(currentAngle);
                const x2 = Math.cos(currentAngle + angle);
                const y2 = Math.sin(currentAngle + angle);

                const largeArcFlag = angle > Math.PI ? 1 : 0;

                const pathData = [
                  `M 0 0`,
                  `L ${x1} ${y1}`,
                  `A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  `Z`,
                ].join(' ');

                currentAngle += angle;

                return (
                  <motion.path
                    key={item.severity}
                    d={pathData}
                    fill={severityColors[item.severity].replace('bg-', '')}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:opacity-80 transition-opacity"
                  />
                );
              })}

              {/* Center circle for donut effect */}
              <circle cx="0" cy="0" r="0.6" fill="#1e293b" />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-100">{total}</div>
                <div className="text-xs text-slate-500">总计</div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          {data.map((item) => (
            <div key={item.severity} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${severityColors[item.severity]}`} />
              <span className="text-sm text-slate-400">{item.label}</span>
              <span className={`text-sm font-medium ${severityTextColors[item.severity]}`}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
