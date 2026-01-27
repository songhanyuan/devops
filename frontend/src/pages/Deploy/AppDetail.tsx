import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  message,
  Typography,
  Badge,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  ArrowLeftOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { appService, Application } from '@/services/app'

const { Text } = Typography

const statusMap: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  pending: { text: '等待中', color: 'default', icon: <ClockCircleOutlined /> },
  running: { text: '部署中', color: 'processing', icon: <SyncOutlined spin /> },
  success: { text: '成功', color: 'success', icon: <CheckCircleOutlined /> },
  failed: { text: '失败', color: 'error', icon: <CloseCircleOutlined /> },
  rollback: { text: '已回滚', color: 'warning', icon: <SyncOutlined /> },
}

const AppDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<Application | null>(null)
  const [deployments, setDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deployModalVisible, setDeployModalVisible] = useState(false)
  const [deployForm] = Form.useForm()

  const fetchApp = async () => {
    if (!id) return
    try {
      const res = await appService.get(id)
      setApp(res.data)
    } catch {
      // handled
    }
  }

  const fetchDeployments = async () => {
    setLoading(true)
    try {
      const res = await appService.listDeployments(id!, { page: 1, page_size: 50 })
      setDeployments(res.data.list || [])
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApp()
    fetchDeployments()
  }, [id])

  const handleDeploy = async () => {
    try {
      const values = await deployForm.validateFields()
      await appService.createDeployment({ ...values, app_id: id })
      message.success('部署任务已创建')
      setDeployModalVisible(false)
      fetchDeployments()
    } catch {
      // validation
    }
  }

  const successCount = deployments.filter((d) => d.status === 'success').length
  const failedCount = deployments.filter((d) => d.status === 'failed').length

  const deployColumns: ColumnsType<any> = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (v: string) => <Tag color="blue">{v || '-'}</Tag>,
    },
    {
      title: '环境',
      dataIndex: 'env_name',
      key: 'env_name',
      width: 80,
      render: (v: string) => v || '-',
    },
    {
      title: '分支',
      dataIndex: 'branch',
      key: 'branch',
      width: 120,
      render: (v: string) => <code style={{ fontSize: 12, background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>{v || '-'}</code>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const s = statusMap[status] || statusMap.pending
        return <Badge status={s.color as any} text={s.text} />
      },
    },
    {
      title: '部署人',
      dataIndex: 'deploy_user',
      key: 'deploy_user',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (v: number) => v ? `${v}s` : '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/deploy/apps')} type="text" />
            <div>
              <h2>{app?.name || '应用详情'}</h2>
              <p>{app?.description || '查看应用信息和部署历史'}</p>
            </div>
          </Space>
        </div>
        <Button
          type="primary"
          icon={<RocketOutlined />}
          onClick={() => {
            deployForm.resetFields()
            deployForm.setFieldsValue({ branch: app?.branch })
            setDeployModalVisible(true)
          }}
        >
          发起部署
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="总部署次数" value={deployments.length} prefix={<RocketOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="成功" value={successCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#fff2f0' }}>
            <Statistic title="失败" value={failedCount} prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
      </Row>

      <Card className="section-card" bordered={false} style={{ marginBottom: 20 }}>
        <Descriptions column={3} labelStyle={{ fontWeight: 500 }}>
          <Descriptions.Item label="应用代码">
            <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{app?.code}</code>
          </Descriptions.Item>
          <Descriptions.Item label="应用类型">{app?.type}</Descriptions.Item>
          <Descriptions.Item label="开发语言">{app?.language || '-'}</Descriptions.Item>
          <Descriptions.Item label="默认分支">{app?.branch || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={app?.status === 1 ? 'success' : 'error'}>{app?.status === 1 ? '启用' : '禁用'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="仓库地址">
            <Text copyable style={{ fontSize: 13 }}>{app?.repo_url || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="部署路径" span={3}>{app?.deploy_path || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="section-card" title="部署记录" bordered={false}>
        <Table
          columns={deployColumns}
          dataSource={deployments}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title="发起部署"
        open={deployModalVisible}
        onOk={handleDeploy}
        onCancel={() => setDeployModalVisible(false)}
        okText="确认部署"
      >
        <Form form={deployForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="version" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
            <Input placeholder="v1.0.0" />
          </Form.Item>
          <Form.Item name="branch" label="分支">
            <Input placeholder="main" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="本次部署说明..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AppDetail
