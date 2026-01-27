import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  Input,
  Select,
  Steps,
  Timeline,
  Drawer,
  message,
  Popconfirm,
  Tooltip,
  Progress,
} from 'antd'
import {
  PlusOutlined,
  BranchesOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { appService, Application } from '@/services/app'

interface Pipeline {
  id: string
  name: string
  app_id: string
  app_name: string
  branch: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  trigger: string
  stages: PipelineStage[]
  duration: number
  created_by: string
  created_at: string
  started_at: string
  finished_at: string
}

interface PipelineStage {
  name: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  duration: number
  log: string
}

// Mock data for demo
const mockPipelines: Pipeline[] = [
  {
    id: '1', name: '生产部署流水线', app_id: '1', app_name: 'web-frontend',
    branch: 'main', status: 'success', trigger: 'manual',
    stages: [
      { name: '代码拉取', status: 'success', duration: 5, log: 'Cloning repository...\nDone.' },
      { name: '代码构建', status: 'success', duration: 45, log: 'npm install...\nnpm run build...\nBuild completed.' },
      { name: '单元测试', status: 'success', duration: 30, log: 'Running tests...\n42 passed, 0 failed.' },
      { name: '镜像打包', status: 'success', duration: 20, log: 'Building docker image...\nPushed to registry.' },
      { name: '部署发布', status: 'success', duration: 15, log: 'Deploying to production...\nRollout complete.' },
    ],
    duration: 115, created_by: 'admin', created_at: '2026-01-27T10:00:00Z',
    started_at: '2026-01-27T10:00:05Z', finished_at: '2026-01-27T10:01:55Z',
  },
  {
    id: '2', name: '测试环境部署', app_id: '2', app_name: 'api-gateway',
    branch: 'develop', status: 'running', trigger: 'webhook',
    stages: [
      { name: '代码拉取', status: 'success', duration: 3, log: 'Done.' },
      { name: '代码构建', status: 'success', duration: 60, log: 'go build...\nDone.' },
      { name: '单元测试', status: 'running', duration: 0, log: 'Running tests...' },
      { name: '镜像打包', status: 'pending', duration: 0, log: '' },
      { name: '部署发布', status: 'pending', duration: 0, log: '' },
    ],
    duration: 63, created_by: 'admin', created_at: '2026-01-27T11:00:00Z',
    started_at: '2026-01-27T11:00:02Z', finished_at: '',
  },
  {
    id: '3', name: '预发布环境', app_id: '1', app_name: 'web-frontend',
    branch: 'release/v2.1', status: 'failed', trigger: 'manual',
    stages: [
      { name: '代码拉取', status: 'success', duration: 4, log: 'Done.' },
      { name: '代码构建', status: 'success', duration: 50, log: 'Build done.' },
      { name: '单元测试', status: 'failed', duration: 25, log: 'FAIL: TestAuth - expected 200, got 401' },
      { name: '镜像打包', status: 'skipped', duration: 0, log: '' },
      { name: '部署发布', status: 'skipped', duration: 0, log: '' },
    ],
    duration: 79, created_by: 'dev01', created_at: '2026-01-26T15:30:00Z',
    started_at: '2026-01-26T15:30:03Z', finished_at: '2026-01-26T15:31:22Z',
  },
]

const statusConfig: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  pending: { text: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
  running: { text: '运行中', color: 'processing', icon: <SyncOutlined spin /> },
  success: { text: '成功', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> },
  cancelled: { text: '已取消', color: 'warning', icon: <CloseCircleOutlined /> },
  skipped: { text: '跳过', color: 'default', icon: <ClockCircleOutlined /> },
}

const PipelineList: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>(mockPipelines)
  const [loading] = useState(false)
  const [apps, setApps] = useState<Application[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentPipeline, setCurrentPipeline] = useState<Pipeline | null>(null)
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

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      const newPipeline: Pipeline = {
        id: String(Date.now()),
        name: values.name,
        app_id: values.app_id,
        app_name: apps.find((a) => a.id === values.app_id)?.name || '',
        branch: values.branch || 'main',
        status: 'pending',
        trigger: 'manual',
        stages: [
          { name: '代码拉取', status: 'pending', duration: 0, log: '' },
          { name: '代码构建', status: 'pending', duration: 0, log: '' },
          { name: '单元测试', status: 'pending', duration: 0, log: '' },
          { name: '镜像打包', status: 'pending', duration: 0, log: '' },
          { name: '部署发布', status: 'pending', duration: 0, log: '' },
        ],
        duration: 0,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        started_at: '',
        finished_at: '',
      }
      setPipelines([newPipeline, ...pipelines])
      setModalVisible(false)
      message.success('流水线已创建')
    } catch { /* validation */ }
  }

  const handleRun = (p: Pipeline) => {
    setPipelines(pipelines.map((item) =>
      item.id === p.id ? { ...item, status: 'running' as const, started_at: new Date().toISOString() } : item
    ))
    message.success('流水线已触发')
  }

  const handleDelete = (id: string) => {
    setPipelines(pipelines.filter((p) => p.id !== id))
    message.success('已删除')
  }

  const successCount = pipelines.filter((p) => p.status === 'success').length
  const runningCount = pipelines.filter((p) => p.status === 'running').length
  const failedCount = pipelines.filter((p) => p.status === 'failed').length

  const columns: ColumnsType<Pipeline> = [
    {
      title: '流水线',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <a onClick={() => { setCurrentPipeline(record); setDetailVisible(true) }}>
          <Space>
            <BranchesOutlined />
            {name}
          </Space>
        </a>
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
      render: (v: string) => (
        <code style={{ fontSize: 12, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{v}</code>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const cfg = statusConfig[s] || statusConfig.pending
        return <Tag icon={cfg.icon} color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '阶段进度',
      key: 'progress',
      width: 180,
      render: (_, record) => {
        const done = record.stages.filter((s) => s.status === 'success').length
        const total = record.stages.length
        const pct = Math.round((done / total) * 100)
        const color = record.status === 'failed' ? '#ff4d4f' : record.status === 'success' ? '#52c41a' : '#4f46e5'
        return <Progress percent={pct} size="small" strokeColor={color} format={() => `${done}/${total}`} />
      },
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (v: number) => v ? `${v}s` : '-',
    },
    {
      title: '触发方式',
      dataIndex: 'trigger',
      key: 'trigger',
      width: 100,
      render: (v: string) => <Tag>{v === 'webhook' ? 'Webhook' : v === 'schedule' ? '定时' : '手动'}</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="查看">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setCurrentPipeline(record); setDetailVisible(true) }} />
          </Tooltip>
          {(record.status === 'pending' || record.status === 'failed') && (
            <Tooltip title="运行">
              <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleRun(record)} />
            </Tooltip>
          )}
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const getStepStatus = (status: string) => {
    if (status === 'success') return 'finish' as const
    if (status === 'running') return 'process' as const
    if (status === 'failed') return 'error' as const
    return 'wait' as const
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>CI/CD 流水线</h2>
          <p>管理持续集成和持续部署流水线</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalVisible(true) }}>
          新建流水线
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="成功" value={successCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#e6f7ff' }}>
            <Statistic title="运行中" value={runningCount} prefix={<SyncOutlined spin style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#fff2f0' }}>
            <Statistic title="失败" value={failedCount} prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
      </Row>

      <Card className="section-card" bordered={false}>
        <Table
          columns={columns}
          dataSource={pipelines}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="新建流水线"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => setModalVisible(false)}
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="流水线名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="生产部署流水线" />
          </Form.Item>
          <Form.Item name="app_id" label="关联应用" rules={[{ required: true, message: '请选择应用' }]}>
            <Select placeholder="选择应用">
              {apps.map((a) => (
                <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="branch" label="分支">
            <Input placeholder="main" />
          </Form.Item>
          <Form.Item name="trigger" label="触发方式" initialValue="manual">
            <Select>
              <Select.Option value="manual">手动触发</Select.Option>
              <Select.Option value="webhook">Webhook</Select.Option>
              <Select.Option value="schedule">定时触发</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={currentPipeline?.name || '流水线详情'}
        width={640}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {currentPipeline && (
          <>
            <div style={{ marginBottom: 24 }}>
              <Space>
                <Tag>{currentPipeline.app_name}</Tag>
                <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{currentPipeline.branch}</code>
                {(() => {
                  const cfg = statusConfig[currentPipeline.status]
                  return <Tag icon={cfg.icon} color={cfg.color}>{cfg.text}</Tag>
                })()}
                <span style={{ color: '#8c8c8c' }}>耗时 {currentPipeline.duration}s</span>
              </Space>
            </div>

            <h4 style={{ marginBottom: 16 }}>阶段进度</h4>
            <Steps
              size="small"
              current={currentPipeline.stages.findIndex((s) => s.status === 'running')}
              items={currentPipeline.stages.map((s) => ({
                title: s.name,
                status: getStepStatus(s.status),
                description: s.duration ? `${s.duration}s` : undefined,
              }))}
              style={{ marginBottom: 24 }}
            />

            <h4 style={{ marginBottom: 16 }}>执行日志</h4>
            <Timeline
              items={currentPipeline.stages.map((s) => ({
                color: s.status === 'success' ? 'green' : s.status === 'failed' ? 'red' : s.status === 'running' ? 'blue' : 'gray',
                children: (
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.name}</div>
                    {s.log && (
                      <pre style={{
                        background: '#1a1a2e',
                        color: '#e0e0e0',
                        padding: 12,
                        borderRadius: 6,
                        fontSize: 12,
                        maxHeight: 120,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {s.log}
                      </pre>
                    )}
                  </div>
                ),
              }))}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}

export default PipelineList
