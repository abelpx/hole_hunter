/**
 * ScanChart 组件
 * 扫描趋势图表组件
 */

import React from 'react';
import { motion } from 'framer-motion';

export interface ScanChartData {
  date: string;
  count: number;
  vulnerabilities: number;
}

export interface ScanChartProps {
  data: ScanChartData[];
  title?: string;
  className?: string;
}

export const ScanChart: React.FC<ScanChartProps> = ({
  data,
  title = '扫描趋势',
  className = '',
}) => {
  if (data.length === 0) {
    return (
      <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">{title}</h3>
        <div className="flex items-center justify-center py-8 text-slate-500">
          暂无数据
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxVulns = Math.max(...data.map((d) => d.vulnerabilities), 1);

  // 计算平均值
  const avgScans = data.reduce((sum, d) => sum + d.count, 0) / data.length;
  const avgVulns = data.reduce((sum, d) => sum + d.vulnerabilities, 0) / data.length;

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-slate-400">扫描数</span>
            <span className="font-semibold text-slate-200">{avgScans.toFixed(1)}/天</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-slate-400">漏洞数</span>
            <span className="font-semibold text-slate-200">{avgVulns.toFixed(1)}/天</span>
          </div>
        </div>
      </div>

      {/* 柱状图 */}
      <div className="space-y-1">
        {data.map((item, index) => {
          const scanHeight = (item.count / maxCount) * 100;
          const vulnHeight = (item.vulnerabilities / maxVulns) * 100;

          // 格式化日期
          const date = new Date(item.date);
          const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

          return (
            <motion.div
              key={item.date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-3 group"
            >
              {/* 日期标签 */}
              <div className="w-14 text-xs text-slate-500 text-right flex-shrink-0">
                {dateLabel}
              </div>

              {/* 柱状图容器 */}
              <div className="flex-1 flex items-center gap-1 h-12">
                {/* 扫描数柱 */}
                <div className="flex-1 bg-slate-700/50 rounded overflow-hidden relative h-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${scanHeight}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="h-full bg-sky-500 rounded relative group-hover:bg-sky-400 transition-colors"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs text-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.count} 次扫描
                    </div>
                  </motion.div>
                </div>

                {/* 漏洞数柱 */}
                <div className="flex-1 bg-slate-700/50 rounded overflow-hidden relative h-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vulnHeight}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    className="h-full bg-amber-500 rounded relative group-hover:bg-amber-400 transition-colors"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-xs text-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      {item.vulnerabilities} 个漏洞
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 底部统计 */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-700">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-100">{data.length}</div>
          <div className="text-xs text-slate-500">总天数</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-sky-400">{data.reduce((sum, d) => sum + d.count, 0)}</div>
          <div className="text-xs text-slate-500">总扫描</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{data.reduce((sum, d) => sum + d.vulnerabilities, 0)}</div>
          <div className="text-xs text-slate-500">总漏洞</div>
        </div>
      </div>
    </div>
  );
};
