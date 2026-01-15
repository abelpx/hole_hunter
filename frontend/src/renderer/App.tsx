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
import { CustomTemplatesPage } from './pages/CustomTemplatesPage';
import { Button, Input, Select, Modal, Badge, Tag } from './components/ui';
import { ErrorBoundary } from './components/common';
import { Play, Plus, Trash2, Target as TargetIcon, Shield, Bell } from 'lucide-react';
import { getService } from './services/WailsService';

type PageKey = 'dashboard' | 'targets' | 'tasks' | 'vulnerabilities' | 'settings' | 'replay' | 'brute' | 'reports' | 'tools' | 'templates' | 'custom-templates';

interface EnvironmentInfo {
  runtimeType: string;
  platform: string;
  dbHealth: string;
}

function App() {
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo>({
    runtimeType: 'Detecting...',
    platform: '',
    dbHealth: 'Checking...'
  });
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkEnvironment = async () => {
      const service = getService();
      const env = service.getEnvironment();

      let newEnvInfo: EnvironmentInfo;

      if (env === 'wails') {
        newEnvInfo = { runtimeType: 'Wails', platform: 'desktop', dbHealth: '' };
        try {
          const healthResult = await service.checkDatabaseHealth();
          newEnvInfo.dbHealth = healthResult.healthy
            ? `Connected (${healthResult.type})`
            : 'Disconnected: ' + (healthResult.message || 'Unknown error');
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          newEnvInfo.dbHealth = 'Error: ' + errMsg;
        }
      } else if (env === 'electron') {
        newEnvInfo = { runtimeType: 'Electron', platform: '', dbHealth: '' };
        const plat = service.getPlatform();
        newEnvInfo.platform = plat;
        try {
          const healthResult = await (window as any).electronAPI.database.healthCheck();
          if (healthResult.success) {
            const { healthy, type } = healthResult.data;
            newEnvInfo.dbHealth = healthy ? `Connected (${type})` : 'Disconnected';
          } else {
            newEnvInfo.dbHealth = 'Error: ' + (healthResult as any).error;
          }
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          newEnvInfo.dbHealth = 'Error: ' + errMsg;
        }
      } else {
        newEnvInfo = { runtimeType: 'Browser (Demo)', platform: 'web', dbHealth: '' };
        try {
          const healthResult = await service.checkDatabaseHealth();
          newEnvInfo.dbHealth = healthResult.healthy
            ? `Mock Data (${healthResult.type})`
            : 'Mock Mode: ' + (healthResult.message || 'Demo mode active');
        } catch (error: unknown) {
          newEnvInfo.dbHealth = 'Mock Mode: Demo active';
        }
      }

      setEnvInfo(newEnvInfo);
    };

    checkEnvironment();
  }, []);

  const handlePageChange = (page: PageKey) => {
    setActivePage(page);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'targets':
        return <TargetsPage onNavigate={(p) => handlePageChange(p as PageKey)} />;
      case 'tasks':
        return <ScansPage />;
      case 'vulnerabilities':
        return <VulnPage />;
      case 'settings':
        return <SettingsPage />;
      case 'replay':
        return <ReplayPage />;
      case 'brute':
        return <BrutePage />;
      case 'reports':
        return <ReportsPage />;
      case 'tools':
        return <ToolsPage />;
      case 'templates':
        return <TemplatesPage />;
      case 'custom-templates':
        return <CustomTemplatesPage />;
      default:
        return renderWelcomePage();
    }
  };

  const renderWelcomePage = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold text-slate-100">HoleHunter</h1>
        </div>
        <p className="text-xl text-slate-400 mb-4">基于 Nuclei 的现代化安全测试工具</p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Badge variant={envInfo.runtimeType === 'Wails' ? 'success' : envInfo.runtimeType === 'Electron' ? 'info' : 'default'}>
            {envInfo.runtimeType}
          </Badge>
          <Badge variant="info">{envInfo.platform || 'Unknown'}</Badge>
          <Badge variant={envInfo.dbHealth.includes('Connected') ? 'success' : 'warning'}>
            {envInfo.dbHealth}
          </Badge>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button type="primary" size="md" onClick={() => handlePageChange('dashboard')}>
            进入仪表板
          </Button>
          <Button type="secondary" size="md" onClick={() => handlePageChange('targets')}>
            进入目标管理
          </Button>
          <Button type="ghost" size="md" onClick={() => handlePageChange('tasks')}>
            进入扫描任务
          </Button>
          <Button type="ghost" size="md" onClick={() => handlePageChange('vulnerabilities')}>
            进入漏洞列表
          </Button>
          <Button type="ghost" size="md" onClick={() => handlePageChange('replay')}>
            进入重放
          </Button>
          <Button type="ghost" size="md" onClick={() => handlePageChange('settings')}>
            进入设置
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">按钮组件</h2>
          <div className="flex flex-wrap gap-3">
            <Button type="primary" icon={<Play size={16} />}>主要按钮</Button>
            <Button type="secondary">次要按钮</Button>
            <Button type="ghost">幽灵按钮</Button>
            <Button type="danger" icon={<Trash2 size={16} />}>危险按钮</Button>
            <Button type="primary" loading>加载中</Button>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">表单组件</h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="目标名称" placeholder="请输入目标名称" prefix={<TargetIcon size={16} />} />
            <Input label="目标 URL" placeholder="https://example.com" error="URL 格式不正确" />
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

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">模态框</h2>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            打开模态框
          </Button>
        </div>

        {envInfo.runtimeType === 'Browser' && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-amber-400 flex items-center gap-2">
              <Bell size={16} />
              当前运行在浏览器模式，桌面功能不可用
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo);
      }}
    >
      <ContentLayout
        activeMenuItem={activePage}
        onMenuItemClick={handlePageChange}
      >
        {activePage === '' ? renderWelcomePage() : renderPage()}
      </ContentLayout>

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
    </ErrorBoundary>
  );
}

export default App;
