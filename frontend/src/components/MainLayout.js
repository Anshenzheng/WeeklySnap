import React from 'react';
import { Layout, Menu, Dropdown, Avatar, Button, message } from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const getMenuItems = () => {
    const items = [];

    if (user?.role === 'admin') {
      items.push(
        {
          key: '/teams',
          icon: <TeamOutlined />,
          label: '团队管理',
        },
        {
          key: '/users',
          icon: <UserOutlined />,
          label: '用户管理',
        }
      );
    }

    if (user?.role === 'member') {
      items.push({
        key: '/my-report',
        icon: <FileTextOutlined />,
        label: '填写周报',
      });
    }

    if (user?.role === 'manager' || user?.role === 'admin') {
      items.push(
        {
          key: '/reports',
          icon: <FileTextOutlined />,
          label: '周报列表',
        },
        {
          key: '/unsubmitted',
          icon: <DashboardOutlined />,
          label: '未提交统计',
        },
        {
          key: '/statistics',
          icon: <BarChartOutlined />,
          label: '数据统计',
        }
      );
    }

    return items;
  };

  const userMenu = {
    items: [
      {
        key: 'user',
        label: (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontWeight: 'bold' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {user?.role === 'admin' ? '系统管理员' : 
               user?.role === 'manager' ? '团队管理者' : '普通成员'}
            </div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark">
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.1)'
        }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>周记</h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header>
          <div className="header-title">团队周报收集系统</div>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Button type="text" style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <span>{user?.name}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
