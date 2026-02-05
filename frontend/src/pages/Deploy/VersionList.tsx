import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Select,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tooltip,
  Drawer,
  Descriptions,
} from 'antd'
import {
  TagsOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  EyeOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { appService, Application } from '@/services/app'

interface AppVersion {
  id: string
  app_id: string
  app_name: string
  version: string
  branch: string
  commit_id: string
  commit_msg: string
  build_status: 'success' | 'failed' | 'building' | 'pending'
  is_current: boolean
  deploy_count: number
  created_by: string
  created_at: string
  changelog: string
}

// Mock data
const mockVersions: AppVersion[] = [
  {
    id: '1', app_id: '1', app_name: 'web-frontend', version: 'v2.1.0', branch: 'main',
    commit_id: 'a1b2c3d', commit_msg: 'feat: 添加用户仪表盘', build_status: 'success',
    is_current: true, deploy_count: 3, created_by: 'admin', created_at: '2026-01-27T09:00:00Z',
    changelog: '- 新增用户仪表盘\n- 优化登录流程\n- 修复侧边栏样式问题',
  },
  {
    id: '2', app_id: '1', app_name: 'web-frontend', version: 'v2.0.1', branch: 'main',
    commit_id: 'e4f5g6h', commit_msg: 'fix: 修复登录跳转 bug', build_status: 'success',
    is_current: false, deploy_count: 5, created_by: 'admin', created_at: '2026-01-25T14:00:00Z',
    changelog: '- 修复登录后未正确跳转的问题\n- 修复权限校验逻辑',
  },
  {
    id: '3', app_id: '1', app_name: 'web-frontend', version: 'v2.0.0', branch: 'release/v2.0',
    commit_id: 'i7j8k9l', commit_msg: 'release: v2.0.0 正式发布', build_status: 'success',
    is_current: false, deploy_count: 8, created_by: 'dev01', created_at: '2026-01-20T10:00:00Z',
    changelog: '- 全新 UI 改版\n- 新增监控模块\n- 新增 K8s 集群管理\n- 性能优化',
  },
  {
    id: '4', app_id: '2', app_name: 'api-gateway', version: 'v1.5.0', branch: 'main',
    commit_id: 'm0n1o2p', commit_msg: 'feat: 添加限流中间件', build_status: 'success',
    is_current: true, deploy_count: 2, created_by: 'admin', created_at: '2026-01-26T16:00:00Z',
    changelog: '- 新增请求限流\n- 添加 API 审计日志',
  },
  {
    id: '5', app_id: '2', app_name: 'api-gateway', version: 'v1.4.2', branch: 'develop',
    commit_id: 'q3r4s5t', commit_msg: 'fix: 修复连接池泄漏', build_status: 'success',
    is_current: false, deploy_count: 4, created_by: 'dev01', created_at: '2026-01-22T11:00:00Z',
    changelog: '- 修复数据库连接池泄漏\n- 优化日志输出',
  },
]

const PipelineList: React.FC = () => {
  const [versions, setVersions] = useState<AppVersion[]>(mockVersions)
  const [loading, setLoading] = useState(false)
  const [apps, setApps] = useState<Application[]>([])
  const [selectedApp, setSelectedApp] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<AppVersion | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await appService.list({ page: 1, page_size: 100 })
        setApps(res.data.list || [])
      } catch { /* handled */ }
    }
    fetchApps()
  }, [])

  const filtered = versions.filter((v) =>
    !selectedApp || v.app_id === selectedApp
  )

  const currentCount = filtered.filter((v) => v.is_current).length

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const newVersion: AppVersion = {
        id: String(Date.now()),
        app_id: values.app_id,
        app_name: apps.find((a) => a.id === values.app_id)?.name || '',
        version: values.version,
        branch: values.branch || 'main',
        commit_id: Math.random().toString(36).slice(2, 9),
        commit_msg: values.commit_msg || '',
        build_status: 'pending',
        is_current: false,
        deploy_count: 0,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        changelog: values.changelog || '',
      }
      setVersions([newVersion, ...versions])
      setModalVisible(false)
      message.success('版本已创建')
    } catch { /* validation */ }
  }

  const handleRollback = (v: AppVersion) => {
    setVersions(versions.map((item) => ({
      ...item,
      is_current: item.app_id === v.app_id ? item.id === v.id : item.is_current,
    })))
    message.success(`已回滚到 ${v.version}`)
  }

  const handleDeploy = (v: AppVersion) => {
    setVersions(versions.map((item) =>
      item.id === v.id ? { ...item, deploy_count: item.deploy_count + 1, is_current: true } :
      item.app_id === v.app_id ? { ...item, is_current: false } : item
    ))
    message.success(`${v.version} 部署已触发`)
  }

  const columns: ColumnsType<AppVersion> = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      width: 130,
      render: (v: string, record) => (
        <Space>
          <a onClick={() => { setCurrentVersion(record); setDetailVisible(true) }}>
            <Tag color="blue">{v}</Tag>
          </a>
          {record.is_current && <Tag color="green">当前</Tag>}
        </Space>
      ),
    },
    {
      title: '应用',
      dataIndex: 'app_name',
      key: 'app_name',
      width: 140,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '分支',
      dataIndex: 'branch',
      key: 'branch',
      width: 140,
      render: (v: string) => <code>{v}</code>,
    },
    {
      title: 'Commit',
      dataIndex: 'commit_id',
      key: 'commit_id',
      width: 100,
      render: (v: string) => <code className="code-muted">{v}</code>,
    },
    {
      title: '提交信息',
      dataIndex: 'commit_msg',
      key: 'commit_msg',
      ellipsis: true,
    },
    {
      title: '构建状态',
      dataIndex: 'build_status',
      key: 'build_status',
      width: 100,
      render: (s: string) => {
        const map: Record<string, { text: string; color: string }> = {
          success: { text: '成功', color: 'success' },
          failed: { text: '失败', color: 'error' },
          building: { text: '构建中', color: 'processing' },
          pending: { text: '待构建', color: 'default' },
        }
        const cfg = map[s] || map.pending
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '部署次数',
      dataIndex: 'deploy_count',
      key: 'deploy_count',
      width: 90,
      render: (v: number) => v,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setCurrentVersion(record); setDetailVisible(true) }} />
          </Tooltip>
          <Tooltip title="部署此版本">
            <Button size="small" type="primary" icon={<RocketOutlined />} onClick={() => handleDeploy(record)} />
          </Tooltip>
          {!record.is_current && (
            <Popconfirm title={`确定回滚到 ${record.version}?`} onConfirm={() => handleRollback(record)}>
              <Tooltip title="回滚">
                <Button size="small" icon={<RollbackOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-shell fade-in">
      <div className="page-hero">
        <div>
          <div className="page-hero-title">版本管理</div>
          <p className="page-hero-subtitle">管理应用版本、发布和回滚操作</p>
        </div>
        <div className="page-hero-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalVisible(true) }}>
            创建版本
          </Button>
        </div>
      </div>

      <div className="metric-grid">
        <Card className="metric-card metric-card--primary" bordered={false}>
          <Statistic title="总版本数" value={filtered.length} prefix={<TagsOutlined style={{ color: '#0ea5e9' }} />} />
        </Card>
        <Card className="metric-card metric-card--success" bordered={false}>
          <Statistic title="当前版本" value={currentCount} prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />} />
        </Card>
        <Card className="metric-card metric-card--warning" bordered={false}>
          <Statistic title="待部署" value={filtered.filter((v) => v.deploy_count === 0).length} prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />} />
        </Card>
      </div>

      <Card className="section-card" bordered={false}>
        <div className="toolbar">
          <div className="toolbar-left">
            <Select
              style={{ width: 220 }}
              placeholder="全部应用"
              allowClear
              value={selectedApp || undefined}
              onChange={(v) => setSelectedApp(v || '')}
            >
              {apps.map((a) => (
                <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>
              ))}
            </Select>
          </div>
          <div className="toolbar-right">
            <Button icon={<ReloadOutlined />} onClick={() => setLoading(false)}>刷新</Button>
          </div>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="创建版本"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => setModalVisible(false)}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="app_id" label="应用" rules={[{ required: true, message: '请选择应用' }]}>
            <Select placeholder="选择应用">
              {apps.map((a) => (
                <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="version" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
            <Input placeholder="v1.0.0" />
          </Form.Item>
          <Form.Item name="branch" label="分支">
            <Input placeholder="main" />
          </Form.Item>
          <Form.Item name="commit_msg" label="提交信息">
            <Input placeholder="feat: 新功能描述" />
          </Form.Item>
          <Form.Item name="changelog" label="更新日志">
            <Input.TextArea rows={4} placeholder="- 新增功能 A&#10;- 修复 Bug B" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`版本 ${currentVersion?.version}`}
        width={560}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {currentVersion && (
          <>
            <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="版本号">
                <Space>
                  <Tag color="blue">{currentVersion.version}</Tag>
                  {currentVersion.is_current && <Tag color="green">当前版本</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="应用">{currentVersion.app_name}</Descriptions.Item>
              <Descriptions.Item label="分支">{currentVersion.branch}</Descriptions.Item>
              <Descriptions.Item label="Commit">{currentVersion.commit_id}</Descriptions.Item>
              <Descriptions.Item label="提交信息">{currentVersion.commit_msg}</Descriptions.Item>
              <Descriptions.Item label="构建状态">
                <Tag color={currentVersion.build_status === 'success' ? 'green' : 'default'}>
                  {currentVersion.build_status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="部署次数">{currentVersion.deploy_count}</Descriptions.Item>
              <Descriptions.Item label="创建人">{currentVersion.created_by}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(currentVersion.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            {currentVersion.changelog && (
              <>
                <h4 style={{ marginBottom: 12 }}>更新日志</h4>
                <Card style={{ background: '#fafafa' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                    {currentVersion.changelog}
                  </pre>
                </Card>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default PipelineList
