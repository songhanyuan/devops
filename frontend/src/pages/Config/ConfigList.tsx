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
  Card,
  Switch,
  Drawer,
  Timeline,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  HistoryOutlined,
  LockOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { configService, ConfigItem, ConfigHistory } from '@/services/config'

const { Text } = Typography

const envOptions = [
  { label: '开发', value: 'dev', color: '#52c41a' },
  { label: '测试', value: 'test', color: '#faad14' },
  { label: '预发', value: 'staging', color: '#1890ff' },
  { label: '生产', value: 'prod', color: '#f5222d' },
]

const ConfigList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [envFilter, setEnvFilter] = useState<string>('')
  const [keyword, setKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null)
  const [historyVisible, setHistoryVisible] = useState(false)
  const [history, setHistory] = useState<ConfigHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [form] = Form.useForm()

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res = await configService.list({ page, page_size: pageSize, env_code: envFilter, keyword })
      setConfigs(res.data.list || [])
      setTotal(res.data.total)
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [page, pageSize, envFilter, keyword])

  const handleAdd = () => {
    setEditingConfig(null)
    form.resetFields()
    form.setFieldsValue({ value_type: 'string', env_code: 'dev', is_secret: false })
    setModalVisible(true)
  }

  const handleEdit = (record: ConfigItem) => {
    setEditingConfig(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await configService.delete(id)
      message.success('删除成功')
      fetchConfigs()
    } catch {
      // handled
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingConfig) {
        await configService.update(editingConfig.id, { value: values.value, description: values.description })
        message.success('更新成功')
      } else {
        await configService.create(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchConfigs()
    } catch {
      // validation
    }
  }

  const handleViewHistory = async (record: ConfigItem) => {
    setHistoryVisible(true)
    setHistoryLoading(true)
    try {
      const res = await configService.getHistory(record.id, 20)
      setHistory(res.data || [])
    } catch {
      // handled
    } finally {
      setHistoryLoading(false)
    }
  }

  const columns: ColumnsType<ConfigItem> = [
    {
      title: '配置键',
      dataIndex: 'key',
      key: 'key',
      width: 200,
      render: (key: string, record) => (
        <Space>
          <code style={{ fontSize: 13, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{key}</code>
          {record.is_secret && <LockOutlined style={{ color: '#faad14', fontSize: 12 }} />}
        </Space>
      ),
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      width: 200,
      ellipsis: true,
      render: (value: string, record) =>
        record.is_secret
          ? <Text type="secondary">******</Text>
          : <span>{value}</span>,
    },
    {
      title: '类型',
      dataIndex: 'value_type',
      key: 'value_type',
      width: 80,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '环境',
      dataIndex: 'env_code',
      key: 'env_code',
      width: 80,
      render: (code: string) => {
        const env = envOptions.find((e) => e.value === code)
        return env ? <Tag color={env.color}>{env.label}</Tag> : code
      },
    },
    { title: '应用', dataIndex: 'app_code', key: 'app_code', width: 100, render: (v: string) => v || <Text type="secondary">全局</Text> },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 60,
      render: (v: number) => <Tag color="blue">v{v}</Tag>,
    },
    { title: '描述', dataIndex: 'description', key: 'description', width: 150, ellipsis: true },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)}>历史</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
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
          <h2>配置管理</h2>
          <p>集中管理应用配置项，支持多环境、加密存储和版本追溯</p>
        </div>
      </div>

      <Card className="section-card" bordered={false}>
        <div style={{ padding: '0 0 16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加配置</Button>
            <Select
              style={{ width: 120 }}
              placeholder="选择环境"
              allowClear
              value={envFilter || undefined}
              onChange={(v) => { setEnvFilter(v || ''); setPage(1) }}
              options={envOptions}
            />
            <Input.Search
              placeholder="搜索配置键"
              allowClear
              style={{ width: 200 }}
              onSearch={(v) => { setKeyword(v); setPage(1) }}
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={fetchConfigs}>刷新</Button>
        </div>

        <Table
          columns={columns}
          dataSource={configs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
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
        title={editingConfig ? '编辑配置' : '添加配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="key" label="配置键" rules={[{ required: true, message: '请输入配置键' }]}>
            <Input placeholder="app.database.host" disabled={!!editingConfig} />
          </Form.Item>
          <Form.Item name="value" label="配置值">
            <Input.TextArea rows={3} placeholder="配置值内容" />
          </Form.Item>
          <Form.Item name="value_type" label="值类型">
            <Select disabled={!!editingConfig}>
              <Select.Option value="string">String</Select.Option>
              <Select.Option value="json">JSON</Select.Option>
              <Select.Option value="yaml">YAML</Select.Option>
              <Select.Option value="text">Text</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="env_code" label="环境" rules={[{ required: true }]}>
            <Select options={envOptions} disabled={!!editingConfig} />
          </Form.Item>
          <Form.Item name="app_code" label="所属应用">
            <Input placeholder="留空表示全局配置" disabled={!!editingConfig} />
          </Form.Item>
          <Form.Item name="is_secret" label="加密存储" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" disabled={!!editingConfig} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="变更历史"
        open={historyVisible}
        onClose={() => setHistoryVisible(false)}
        width={480}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#bfbfbf' }}>暂无变更记录</div>
        ) : (
          <Timeline
            items={history.map((h) => ({
              color: h.action === 'create' ? 'green' : 'blue',
              children: (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {h.action === 'create' ? '创建' : '更新'} - v{h.version}
                  </div>
                  {h.action === 'update' && (
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                      <div>旧值: <code>{h.old_value || '-'}</code></div>
                      <div>新值: <code>{h.new_value || '-'}</code></div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#bfbfbf' }}>
                    {h.username} - {dayjs(h.created_at).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                </div>
              ),
            }))}
          />
        )}
      </Drawer>
    </div>
  )
}

export default ConfigList
