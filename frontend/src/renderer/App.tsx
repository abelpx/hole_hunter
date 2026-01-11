import { useEffect, useState } from 'react';
import { ContentLayout } from './components/layout';
import { TargetsPage } from './pages/TargetsPage';
import { ScansPage } from './pages/ScansPage';
import { VulnPage } from './pages/VulnPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReplayPage } from './pages/ReplayPage';
import { BrutePage } from './pages/BrutePage';
import { ReportsPage } from './pages/ReportsPage';
import { ToolsPage } from './pages/ToolsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { Button, Input, Select, Modal, Badge, Tag } from './components/ui';
import { Play, Plus, Trash2, Target as TargetIcon, Shield, Bell } from 'lucide-react';
import { getService } from './services/WailsService';

function App() {
  const [dbHealth, setDbHealth] = useState<string>('Checking...');
  const [platform, setPlatform] = useState<string>('');
  const [runtimeType, setRuntimeType] = useState<string>('Detecting...');
  const [showModal, setShowModal] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [showDashboard, setShowDashboard] = useState(true);
  const [showTargetsPage, setShowTargetsPage] = useState(false);
  const [showScansPage, setShowScansPage] = useState(false);
  const [showVulnPage, setShowVulnPage] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showReplayPage, setShowReplayPage] = useState(false);
  const [showBrutePage, setShowBrutePage] = useState(false);
  const [showReportsPage, setShowReportsPage] = useState(false);
  const [showToolsPage, setShowToolsPage] = useState(false);
  const [showTemplatesPage, setShowTemplatesPage] = useState(false);

  useEffect(() => {
    // 检查运行环境
    const checkEnvironment = async () => {
      const service = getService();
      const env = service.getEnvironment();

      if (env === 'wails') {
        setRuntimeType('Wails');
        setPlatform('desktop');
        try {
          const healthResult = await service.checkDatabaseHealth();
          if (healthResult.healthy) {
            setDbHealth(`Connected (${healthResult.type})`);
          } else {
            setDbHealth('Disconnected: ' + (healthResult.message || 'Unknown error'));
          }
        } catch (error: any) {
          setDbHealth('Error: ' + error.message);
        }
      } else if (env === 'electron') {
        setRuntimeType('Electron');
        const plat = service.getPlatform();
        setPlatform(plat);
        try {
          const healthResult = await (window as any).electronAPI.database.healthCheck();
          if (healthResult.success) {
            const { healthy, type } = healthResult.data;
            setDbHealth(healthy ? `Connected (${type})` : 'Disconnected');
          } else {
            setDbHealth('Error: ' + (healthResult as any).error);
          }
        } catch (error: any) {
          setDbHealth('Error: ' + error.message);
        }
      } else {
        // Browser 模式使用 Mock 服务
        setRuntimeType('Browser (Demo)');
        setPlatform('web');
        try {
          const healthResult = await service.checkDatabaseHealth();
          if (healthResult.healthy) {
            setDbHealth(`Mock Data (${healthResult.type})`);
          } else {
            setDbHealth('Mock Mode: ' + (healthResult.message || 'Demo mode active'));
          }
        } catch (error: any) {
          setDbHealth('Mock Mode: Demo active');
        }
      }
    };

    checkEnvironment();
  }, []);

  const handleMenuItemClick = (item: string) => {
    setActiveMenuItem(item);
    setShowDashboard(item === 'dashboard');
    setShowTargetsPage(item === 'targets');
    setShowScansPage(item === 'tasks');
    setShowVulnPage(item === 'vulnerabilities');
    setShowSettingsPage(item === 'settings');
    setShowReplayPage(item === 'replay');
    setShowBrutePage(item === 'brute');
    setShowReportsPage(item === 'reports');
    setShowToolsPage(item === 'tools');
    setShowTemplatesPage(item === 'templates');
  };

  return (
    <ContentLayout
      activeMenuItem={
        showDashboard ? 'dashboard' : showTargetsPage ? 'targets' : showScansPage ? 'tasks' : showVulnPage ? 'vulnerabilities' : showSettingsPage ? 'settings' : showReplayPage ? 'replay' : showBrutePage ? 'brute' : showReportsPage ? 'reports' : showToolsPage ? 'tools' : showTemplatesPage ? 'templates' : activeMenuItem
      }
      onMenuItemClick={handleMenuItemClick}
    >
      {showDashboard ? (
        <DashboardPage />
      ) : showTargetsPage ? (
        <TargetsPage onNavigate={handleMenuItemClick} />
      ) : showScansPage ? (
        <ScansPage />
      ) : showVulnPage ? (
        <VulnPage />
      ) : showSettingsPage ? (
        <SettingsPage />
      ) : showReplayPage ? (
        <ReplayPage />
      ) : showBrutePage ? (
        <BrutePage />
      ) : showReportsPage ? (
        <ReportsPage />
      ) : showToolsPage ? (
        <ToolsPage />
      ) : showTemplatesPage ? (
        <TemplatesPage />
      ) : (
        // 演示页面
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Shield size={32} className="text-white" />
              </div>
              <h1 className="text-5xl font-bold text-slate-100">
                HoleHunter
              </h1>
            </div>
            <p className="text-xl text-slate-400 mb-4">
              基于 Nuclei 的现代化安全测试工具
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Badge variant={runtimeType === 'Wails' ? 'success' : runtimeType === 'Electron' ? 'info' : 'default'}>
                {runtimeType}
              </Badge>
              <Badge variant="info">{platform || 'Unknown'}</Badge>
              <Badge variant={dbHealth.includes('Connected') ? 'success' : 'warning'}>
                {dbHealth}
              </Badge>
            </div>
            <Button
              type="primary"
              size="md"
              onClick={() => setShowDashboard(true)}
              className="mr-2"
            >
              进入仪表板
            </Button>
            <Button
              type="secondary"
              size="md"
              onClick={() => setShowTargetsPage(true)}
              className="mr-2"
            >
              进入目标管理
            </Button>
            <Button
              type="ghost"
              size="md"
              onClick={() => setShowScansPage(true)}
              className="mr-2"
            >
              进入扫描任务
            </Button>
            <Button
              type="ghost"
              size="md"
              onClick={() => setShowVulnPage(true)}
              className="mr-2"
            >
              进入漏洞列表
            </Button>
            <Button
              type="ghost"
              size="md"
              onClick={() => setShowReplayPage(true)}
              className="mr-2"
            >
              进入重放
            </Button>
            <Button
              type="ghost"
              size="md"
              onClick={() => setShowSettingsPage(true)}
            >
              进入设置
            </Button>
          </div>

          {/* UI 组件展示 */}
          <div className="space-y-8">
            {/* Buttons */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">按钮组件</h2>
              <div className="flex flex-wrap gap-3">
                <Button type="primary" icon={<Play size={16} />}>
                  主要按钮
                </Button>
                <Button type="secondary">次要按钮</Button>
                <Button type="ghost">幽灵按钮</Button>
                <Button type="danger" icon={<Trash2 size={16} />}>
                  危险按钮
                </Button>
                <Button type="primary" loading>
                  加载中
                </Button>
              </div>
            </div>

            {/* Input & Select */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">表单组件</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="目标名称"
                  placeholder="请输入目标名称"
                  prefix={<TargetIcon size={16} />}
                />
                <Input
                  label="目标 URL"
                  placeholder="https://example.com"
                  error="URL 格式不正确"
                />
                <Select
                  label="漏洞等级"
                  placeholder="请选择等级"
                  options={[
                    { value: 'critical', label: '严重' },
                    { value: 'high', label: '高危' },
                    { value: 'medium', label: '中危' },
                    { value: 'low', label: '低危' },
                  ]}
                  onChange={(value) => console.log(value)}
                />
              </div>
            </div>

            {/* Badges & Tags */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">标签组件</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Tag>production</Tag>
                  <Tag closable>web app</Tag>
                  <Tag color="#0EA5E9">custom color</Tag>
                </div>
              </div>
            </div>

            {/* Modal Demo */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">模态框</h2>
              <Button type="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
                打开模态框
              </Button>
            </div>

            {/* Environment Info */}
            {runtimeType === 'Browser' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <Bell size={16} />
                  当前运行在浏览器模式，桌面功能不可用
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        visible={showModal}
        title="添加新目标"
        onClose={() => setShowModal(false)}
        onConfirm={() => setShowModal(false)}
      >
        <div className="space-y-4">
          <Input label="目标名称" placeholder="请输入目标名称" />
          <Input label="目标 URL" placeholder="https://example.com" />
          <Select
            label="初始标签"
            placeholder="选择标签"
            options={[
              { value: 'production', label: '生产环境' },
              { value: 'staging', label: '预发布环境' },
              { value: 'dev', label: '开发环境' },
            ]}
            onChange={(value) => console.log(value)}
          />
        </div>
      </Modal>
    </ContentLayout>
  );
}

export default App;
