import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Layout,
  Menu,
  Dropdown,
  Avatar,
  Space,
  Badge,
  Breadcrumb,
} from 'antd'
import {
  DashboardOutlined,
  DesktopOutlined,
  CloudServerOutlined,
  ClusterOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  BellOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '@/stores/auth'
import Logo from '@/components/Logo'

const { Header, Sider, Content } = Layout

interface MainLayoutProps {
  children: React.ReactNode
}

const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/monitor',
    icon: <DesktopOutlined />,
    label: '监控中心',
    children: [
      { key: '/monitor/hosts', label: '主机管理' },
    ],
  },
  {
    key: '/deploy',
    icon: <CloudServerOutlined />,
    label: '部署中心',
    children: [
      { key: '/deploy/apps', label: '应用管理' },
    ],
  },
  {
    key: '/k8s',
    icon: <ClusterOutlined />,
    label: 'Kubernetes',
    children: [
      { key: '/k8s/clusters', label: '集群管理' },
    ],
  },
  {
    key: '/config',
    icon: <SettingOutlined />,
    label: '配置中心',
  },
  {
    key: '/system',
    icon: <TeamOutlined />,
    label: '系统管理',
    children: [
      { key: '/system/users', label: '用户管理' },
    ],
  },
]

const breadcrumbMap: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/monitor': '监控中心',
  '/monitor/hosts': '主机管理',
  '/deploy': '部署中心',
  '/deploy/apps': '应用管理',
  '/k8s': 'Kubernetes',
  '/k8s/clusters': '集群管理',
  '/config': '配置中心',
  '/system': '系统管理',
  '/system/users': '用户管理',
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  const getSelectedKeys = () => {
    const path = location.pathname
    if (path.startsWith('/deploy/apps/')) return ['/deploy/apps']
    if (path.startsWith('/k8s/clusters/')) return ['/k8s/clusters']
    return [path]
  }

  const getOpenKeys = () => {
    const path = location.pathname
    if (path.startsWith('/monitor')) return ['/monitor']
    if (path.startsWith('/deploy')) return ['/deploy']
    if (path.startsWith('/k8s')) return ['/k8s']
    if (path.startsWith('/system')) return ['/system']
    return []
  }

  const getBreadcrumbs = () => {
    const path = location.pathname
    const parts = path.split('/').filter(Boolean)
    const items: { title: string }[] = []

    let current = ''
    for (const part of parts) {
      current += `/${part}`
      const label = breadcrumbMap[current]
      if (label) {
        items.push({ title: label })
      }
    }

    if (items.length === 0) {
      items.push({ title: '仪表盘' })
    }

    return items
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="sidebar-logo">
          {collapsed ? (
            <Logo color="#fff" width={32} />
          ) : (
            <Logo color="#fff" width={130} />
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'all 0.2s' }}>
        <Header
          className="app-header"
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Space size={16} align="center">
            <span
              className="header-trigger"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Breadcrumb items={getBreadcrumbs()} />
          </Space>
          <Space size={20}>
            <Badge count={0} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#595959', cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ background: '#4f46e5' }}
                  icon={<UserOutlined />}
                />
                <span style={{ fontWeight: 500, color: '#262626' }}>
                  {user?.real_name || user?.username}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: 20,
            padding: 24,
            background: '#f5f5f8',
            borderRadius: 0,
            minHeight: 'calc(100vh - 64px - 40px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
