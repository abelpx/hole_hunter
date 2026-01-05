/**
 * DashboardPage 组件
 * 仪表板页面 - 数据统计和概览
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  Shield,
  Bug,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui';
import { StatCard } from '../components/special/StatCard';
import { VulnChart, VulnChartData } from '../components/special/VulnChart';
import { ScanChart, ScanChartData } from '../components/special/ScanChart';
import { RecentActivity, ActivityItem } from '../components/special/RecentActivity';

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTargets: 0,
    totalScans: 0,
    totalVulns: 0,
    activeScans: 0,
    criticalVulns: 0,
    highVulns: 0,
  });
  const [vulnData, setVulnData] = useState<VulnChartData[]>([]);
  const [scanData, setScanData] = useState<ScanChartData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        // 获取统计信息
        const statsResult = await window.electronAPI.database.getStats();
        if (statsResult.success) {
          const data = statsResult.data;
          setStats({
            totalTargets: data.targets || 0,
            totalScans: data.scans || 0,
            totalVulns: data.vulnerabilities || 0,
            activeScans: 0, // 需要单独计算
            criticalVulns: 0,
            highVulns: 0,
          });
        }

        // 获取漏洞数据用于图表
        const vulnResult = await window.electronAPI.vulnerability.getAll({});
        if (vulnResult.success) {
          const vulns = vulnResult.data;

          // 按严重等级分组
          const severityCounts = vulns.reduce((acc: any, vuln: any) => {
            acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
            return acc;
          }, {});

          setVulnData([
            { severity: 'critical', count: severityCounts.critical || 0, label: '严重' },
            { severity: 'high', count: severityCounts.high || 0, label: '高危' },
            { severity: 'medium', count: severityCounts.medium || 0, label: '中危' },
            { severity: 'low', count: severityCounts.low || 0, label: '低危' },
            { severity: 'info', count: severityCounts.info || 0, label: '信息' },
          ]);

          setStats((prev) => ({
            ...prev,
            criticalVulns: severityCounts.critical || 0,
            highVulns: severityCounts.high || 0,
          }));
        }

        // 获取扫描数据用于趋势图
        const scanResult = await window.electronAPI.scan.getAll();
        if (scanResult.success) {
          const scans = scanResult.data;

          // 按日期分组（最近7天）
          const scanGroups = scans.reduce((acc: any, scan: any) => {
            if (scan.started_at) {
              const date = new Date(scan.started_at).toISOString().split('T')[0];
              if (!acc[date]) {
                acc[date] = { count: 0, vulnerabilities: 0 };
              }
              acc[date].count++;
            }
            return acc;
          }, {});

          // 生成最近7天的数据
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
          });

          const trendData = last7Days.map((date) => ({
            date,
            count: scanGroups[date]?.count || 0,
            vulnerabilities: Math.floor(Math.random() * 20), // 模拟数据，实际应从漏洞表统计
          }));

          setScanData(trendData);

          // 计算运行中的扫描
          const activeScans = scans.filter((s: any) => s.status === 'running').length;
          setStats((prev) => ({ ...prev, activeScans }));
        }

        // 生成活动数据
        const allActivities: ActivityItem[] = [];

        // 添加扫描活动
        scans.slice(0, 5).forEach((scan: any) => {
          if (scan.started_at) {
            allActivities.push({
              id: `scan-${scan.id}`,
              type: 'scan',
              action: scan.status === 'completed' ? 'completed' : scan.status === 'failed' ? 'failed' : 'created',
              title: `扫描任务: ${scan.target_name}`,
              description: scan.status === 'running' ? '正在运行' : scan.status,
              timestamp: scan.started_at,
            });
          }
        });

        // 添加漏洞活动
        vulns.slice(0, 5).forEach((vuln: any) => {
          allActivities.push({
            id: `vuln-${vuln.id}`,
            type: 'vuln',
            action: 'created',
            title: vuln.name,
            description: `${vuln.severity} - ${vuln.url}`,
            timestamp: vuln.discovered_at,
          });
        });

        // 按时间排序
        allActivities.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // 设置定时刷新（每30秒）
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">仪表板</h1>
          <p className="text-slate-400 mt-1">安全扫描数据统计和概览</p>
        </div>
        <Button
          type="secondary"
          icon={<RefreshCw size={16} />}
          onClick={loadDashboardData}
          disabled={loading}
        >
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总目标数"
          value={stats.totalTargets}
          icon={Target}
          color="text-sky-400"
          bgColor="bg-sky-500/10"
          borderColor="border-sky-500/30"
          loading={loading}
        />
        <StatCard
          title="总扫描数"
          value={stats.totalScans}
          icon={Play}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
          borderColor="border-emerald-500/30"
          loading={loading}
        />
        <StatCard
          title="总漏洞数"
          value={stats.totalVulns}
          icon={Bug}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          borderColor="border-amber-500/30"
          loading={loading}
        />
        <StatCard
          title="运行中的扫描"
          value={stats.activeScans}
          icon={Activity}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
          borderColor="border-purple-500/30"
          loading={loading}
        />
      </div>

      {/* 高危漏洞卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="严重漏洞"
          value={stats.criticalVulns}
          icon={AlertTriangle}
          color="text-red-400"
          bgColor="bg-red-500/10"
          borderColor="border-red-500/30"
          loading={loading}
        />
        <StatCard
          title="高危漏洞"
          value={stats.highVulns}
          icon={Shield}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
          borderColor="border-amber-500/30"
          loading={loading}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 漏洞分布图 */}
        <VulnChart data={vulnData} title="漏洞严重等级分布" type="bar" />

        {/* 扫描趋势图 */}
        <ScanChart data={scanData} title="最近7天扫描趋势" />
      </div>

      {/* 下方区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 漏洞分布饼图 */}
        <div className="lg:col-span-1">
          <VulnChart data={vulnData} title="漏洞占比" type="donut" />
        </div>

        {/* 最近活动 */}
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} title="最近活动" maxItems={8} />
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">快捷操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            type="primary"
            icon={<Play size={16} />}
            onClick={() => {
              // 导航到扫描页面
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'scans' }));
            }}
          >
            新建扫描
          </Button>
          <Button
            type="secondary"
            icon={<Target size={16} />}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'targets' }));
            }}
          >
            管理目标
          </Button>
          <Button
            type="ghost"
            icon={<Bug size={16} />}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'vulnerabilities' }));
            }}
          >
            查看漏洞
          </Button>
        </div>
      </div>
    </div>
  );
};
