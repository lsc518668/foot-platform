import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, theme } from 'antd';
import {
  DashboardOutlined, TrophyOutlined, TeamOutlined, PercentageOutlined,
  UserOutlined, CheckCircleOutlined, FileTextOutlined, SettingOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, AuditOutlined, ReadOutlined,
} from '@ant-design/icons';
import { useAdminAuthStore } from '../../stores/adminAuthStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/matches', icon: <TrophyOutlined />, label: '比赛管理' },
  { key: '/teams', icon: <TeamOutlined />, label: '球队管理' },
  { key: '/odds', icon: <PercentageOutlined />, label: '赔率管理' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/settlements', icon: <CheckCircleOutlined />, label: '结算管理' },
  { key: '/bets', icon: <FileTextOutlined />, label: '投注记录' },
  { key: '/config', icon: <SettingOutlined />, label: '系统设置' },
  { key: '/admin-news', icon: <ReadOutlined />, label: '新闻管理' },
  { key: '/audit', icon: <AuditOutlined />, label: '审计日志' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ background: '#1a1a2e', borderRight: '1px solid #16213e' }}
        width={220}
      >
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid #16213e', padding: '0 16px',
        }}>
          <span style={{ fontSize: collapsed ? 20 : 24, marginRight: collapsed ? 0 : 8 }}>⚽</span>
          {!collapsed && <span style={{ color: '#ffd700', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>管理后台</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ background: 'transparent', borderRight: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#1e293b', padding: '0 24px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#94a3b8', fontSize: 16 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#94a3b8' }}>👤 {username || '管理员'}</span>
            <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button>
          </div>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#1e293b', borderRadius: 12, minHeight: 280 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
