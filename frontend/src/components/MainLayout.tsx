import React, { useState, useCallback, useRef, useEffect } from 'react'
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
  DeploymentUnitOutlined,
  ApiOutlined,
  ContainerOutlined,
  BranchesOutlined,
  TagsOutlined,
  DatabaseOutlined,
  HddOutlined,
  FieldTimeOutlined,
  GatewayOutlined,
  FileTextOutlined,
  LockOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '@/stores/auth'

const { Header, Content } = Layout

interface MainLayoutProps {
  children: React.ReactNode
}

const MIN_WIDTH = 160
const MAX_WIDTH = 360
const DEFAULT_WIDTH = 220

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
      { key: '/deploy/apps', label: '应用管理', icon: <DeploymentUnitOutlined /> },
      { key: '/deploy/pipelines', label: 'CI/CD 流水线', icon: <BranchesOutlined /> },
      { key: '/deploy/versions', label: '版本管理', icon: <TagsOutlined /> },
    ],
  },
  {
    key: '/k8s',
    icon: <ClusterOutlined />,
    label: 'Kubernetes',
    children: [
      { key: '/k8s/clusters', label: '集群管理', icon: <ClusterOutlined /> },
      {
        type: 'group',
        label: '工作负载',
        children: [
          { key: '/k8s/workloads/deployments', label: '无状态', icon: <DeploymentUnitOutlined /> },
          { key: '/k8s/workloads/statefulsets', label: '有状态', icon: <DatabaseOutlined /> },
          { key: '/k8s/workloads/daemonsets', label: '守护进程集', icon: <HddOutlined /> },
          { key: '/k8s/workloads/cronjobs', label: '任务', icon: <FieldTimeOutlined /> },
          { key: '/k8s/workloads/pods', label: '容器组', icon: <ContainerOutlined /> },
        ],
      },
      {
        type: 'group',
        label: '网络',
        children: [
          { key: '/k8s/network/services', label: '服务', icon: <ApiOutlined /> },
          { key: '/k8s/network/ingresses', label: '路由', icon: <GatewayOutlined /> },
        ],
      },
      {
        type: 'group',
        label: '配置管理',
        children: [
          { key: '/k8s/config/configmaps', label: '配置项', icon: <FileTextOutlined /> },
          { key: '/k8s/config/secrets', label: '保密字典', icon: <LockOutlined /> },
        ],
      },
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
  '/deploy/pipelines': 'CI/CD 流水线',
  '/deploy/versions': '版本管理',
  '/k8s': 'Kubernetes',
  '/k8s/clusters': '集群管理',
  '/k8s/workloads': '工作负载',
  '/k8s/workloads/deployments': '无状态',
  '/k8s/workloads/statefulsets': '有状态',
  '/k8s/workloads/daemonsets': '守护进程集',
  '/k8s/workloads/cronjobs': '任务',
  '/k8s/workloads/pods': '容器组',
  '/k8s/network': '网络',
  '/k8s/network/services': '服务',
  '/k8s/network/ingresses': '路由',
  '/k8s/config': '配置管理',
  '/k8s/config/configmaps': '配置项',
  '/k8s/config/secrets': '保密字典',
  '/config': '配置中心',
  '/system': '系统管理',
  '/system/users': '用户管理',
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [siderWidth, setSiderWidth] = useState(DEFAULT_WIDTH)
  const [collapsed, setCollapsed] = useState(false)
  const widthBeforeCollapse = useRef(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX))
      setSiderWidth(newWidth)
      setCollapsed(false)
      widthBeforeCollapse.current = newWidth
    }
    const onMouseUp = () => {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false)
      setSiderWidth(widthBeforeCollapse.current)
    } else {
      widthBeforeCollapse.current = siderWidth
      setCollapsed(true)
      setSiderWidth(64)
    }
  }

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
    if (path.startsWith('/deploy/pipelines/')) return ['/deploy/pipelines']
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

  const actualWidth = collapsed ? 64 : siderWidth

  return (
    <Layout className="app-shell" style={{ minHeight: '100vh' }}>
      <div
        className="app-sider"
        style={{
          width: actualWidth,
          minWidth: actualWidth,
          maxWidth: actualWidth,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: dragging.current ? 'none' : 'width 0.2s, min-width 0.2s, max-width 0.2s',
          boxShadow: '6px 0 24px rgba(15, 23, 42, 0.12)',
        }}
      >
        <div className="sidebar-logo">
          <span style={{ fontSize: collapsed ? 18 : 20, fontWeight: 700, letterSpacing: collapsed ? 0 : 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {collapsed ? 'D' : 'DevOps'}
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Menu
            theme="dark"
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ background: 'transparent', borderRight: 'none' }}
          />
        </div>
        {/* Drag handle */}
        {!collapsed && (
          <div
            onMouseDown={handleMouseDown}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 4,
              cursor: 'col-resize',
              zIndex: 11,
              background: 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14, 165, 233, 0.35)' }}
            onMouseLeave={(e) => { if (!dragging.current) e.currentTarget.style.background = 'transparent' }}
          />
        )}
      </div>
      <Layout style={{ marginLeft: actualWidth, transition: dragging.current ? 'none' : 'margin-left 0.2s' }}>
        <Header
          className="app-header"
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
          }}
        >
          <Space size={16} align="center">
            <span className="header-trigger" onClick={toggleCollapse}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Breadcrumb items={getBreadcrumbs()} />
          </Space>
          <Space size={20}>
            <Badge count={0} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#334155', cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  style={{ background: '#0ea5e9' }}
                  icon={<UserOutlined />}
                />
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {user?.real_name || user?.username}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          className="app-content"
          style={{ borderRadius: 0 }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
