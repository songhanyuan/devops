import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  InputNumber,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  ApiOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { hostService, Host, HostGroup } from '@/services/host'

const HostList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [hosts, setHosts] = useState<Host[]>([])
  const [groups, setGroups] = useState<HostGroup[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingHost, setEditingHost] = useState<Host | null>(null)
  const [form] = Form.useForm()

  const fetchHosts = async () => {
    setLoading(true)
    try {
      const res = await hostService.list({ page, page_size: pageSize })
      setHosts(res.data.list || [])
      setTotal(res.data.total)
    } catch {
      // Error handled
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const res = await hostService.listGroups()
      setGroups(res.data || [])
    } catch {
      // Error handled
    }
  }

  useEffect(() => {
    fetchHosts()
    fetchGroups()
  }, [page, pageSize])

  const handleAdd = () => {
    setEditingHost(null)
    form.resetFields()
    form.setFieldsValue({ port: 22, auth_type: 'password' })
    setModalVisible(true)
  }

  const handleEdit = (record: Host) => {
    setEditingHost(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await hostService.delete(id)
      message.success('删除成功')
      fetchHosts()
    } catch {
      // Error handled
    }
  }

  const handleTestConnection = async (id: string) => {
    try {
      await hostService.testConnection(id)
      message.success('连接成功')
      fetchHosts()
    } catch {
      // Error handled
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingHost) {
        await hostService.update(editingHost.id, values)
        message.success('更新成功')
      } else {
        await hostService.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchHosts()
    } catch {
      // Validation error
    }
  }

  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '离线', color: 'error' },
    1: { text: '在线', color: 'success' },
    2: { text: '未知', color: 'default' },
  }

  const onlineCount = hosts.filter((h) => h.status === 1).length
  const offlineCount = hosts.filter((h) => h.status === 0).length

  const columns: ColumnsType<Host> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'IP 地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (ip: string) => <code style={{ fontSize: 13, background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{ip}</code>,
    },
    { title: '端口', dataIndex: 'port', key: 'port', width: 70 },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '分组',
      dataIndex: 'group',
      key: 'group',
      width: 120,
      render: (group: HostGroup) => group?.name ? <Tag>{group.name}</Tag> : <span style={{ color: '#bfbfbf' }}>-</span>,
    },
    { title: '操作系统', dataIndex: 'os', key: 'os', width: 120 },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_, record) => (
        <Space>
          <Tooltip title="测试连接">
            <Button size="small" icon={<ApiOutlined />} onClick={() => handleTestConnection(record.id)} />
          </Tooltip>
          <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除此主机?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>主机管理</h2>
          <p>管理和监控所有服务器资源</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="主机总数" value={total} prefix={<DesktopOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="在线" value={onlineCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#fff2f0' }}>
            <Statistic title="离线" value={offlineCount} prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} />
          </Card>
        </Col>
      </Row>

      <Card className="section-card" bordered={false}>
        <div style={{ padding: '0 0 16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加主机
            </Button>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={fetchHosts}>刷新</Button>
        </div>

        <Table
          columns={columns}
          dataSource={hosts}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>

      <Modal
        title={editingHost ? '编辑主机' : '添加主机'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input placeholder="主机名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ip" label="IP 地址" rules={[{ required: true }]}>
                <Input placeholder="192.168.1.1" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="port" label="SSH 端口">
                <InputNumber min={1} max={65535} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="username" label="用户名">
                <Input placeholder="root" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="auth_type" label="认证方式">
                <Select>
                  <Select.Option value="password">密码</Select.Option>
                  <Select.Option value="key">密钥</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="password" label="密码">
            <Input.Password placeholder="SSH 密码" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="group_id" label="分组">
                <Select allowClear placeholder="选择分组">
                  {groups.map((g) => (
                    <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="os" label="操作系统">
                <Input placeholder="CentOS 7" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default HostList
