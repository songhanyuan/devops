import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Tag,
  Select,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
} from 'antd'
import {
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { k8sService, Cluster, K8sSecret, K8sNamespace } from '@/services/k8s'

const SecretList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([])
  const [selectedNs, setSelectedNs] = useState<string>('')
  const [secrets, setSecrets] = useState<K8sSecret[]>([])
  const [keyword, setKeyword] = useState('')
  const [createVisible, setCreateVisible] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [form] = Form.useForm()

  const fetchClusters = async () => {
    try {
      const res = await k8sService.listClusters({ page: 1, page_size: 100 })
      const list = res.data.list || []
      setClusters(list)
      if (list.length > 0) setSelectedCluster(list[0].id)
    } catch { /* handled */ }
  }

  const fetchNamespaces = async () => {
    if (!selectedCluster) return
    try {
      const res = await k8sService.getNamespaces(selectedCluster)
      setNamespaces(res.data || [])
    } catch { /* handled */ }
  }

  const fetchSecrets = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const res = await k8sService.getSecrets(selectedCluster, selectedNs)
      setSecrets(res.data || [])
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClusters() }, [])
  useEffect(() => { if (selectedCluster) { fetchNamespaces(); fetchSecrets() } }, [selectedCluster])
  useEffect(() => { if (selectedCluster) fetchSecrets() }, [selectedNs])

  const filtered = secrets.filter((s) =>
    !keyword || s.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const typeCount = (t: string) => secrets.filter((s) => s.type === t).length

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      const dataMap: Record<string, string> = {}
      for (const entry of values.entries || []) {
        if (entry.key) dataMap[entry.key] = entry.value || ''
      }
      await k8sService.createSecret(selectedCluster, {
        name: values.name,
        namespace: values.namespace,
        type: values.type,
        data: dataMap,
      })
      message.success('保密字典创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchSecrets()
    } catch { /* handled */ }
    finally { setCreating(false) }
  }

  const handleDelete = async (record: K8sSecret) => {
    try {
      await k8sService.deleteSecret(selectedCluster, record.namespace, record.name)
      message.success('删除成功')
      fetchSecrets()
    } catch { /* handled */ }
  }

  const secretTypeColor: Record<string, string> = {
    Opaque: 'blue',
    'kubernetes.io/tls': 'green',
    'kubernetes.io/dockerconfigjson': 'purple',
    'kubernetes.io/service-account-token': 'orange',
  }

  const columns: ColumnsType<K8sSecret> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 260,
      ellipsis: true,
      render: (name: string) => <Tooltip title={name}><span style={{ fontWeight: 500 }}>{name}</span></Tooltip>,
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', width: 140 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 200,
      render: (t: string) => <Tag color={secretTypeColor[t] || 'default'}>{t}</Tag>,
    },
    {
      title: '数据',
      dataIndex: 'data',
      key: 'data',
      render: (data: Record<string, string>, record) => {
        const entries = Object.entries(data || {})
        if (entries.length === 0) return <span style={{ color: '#999' }}>-</span>
        return (
          <Space direction="vertical" size={2}>
            {entries.map(([k, v]) => {
              const revealKey = `${record.namespace}/${record.name}/${k}`
              const isRevealed = revealedKeys.has(revealKey)
              return (
                <span key={k} style={{ fontSize: 12 }}>
                  <Tag>{k}</Tag>
                  <span style={{ color: '#666', fontFamily: 'monospace' }}>
                    {isRevealed ? v : '••••••••'}
                  </span>
                  <Button
                    type="link"
                    size="small"
                    icon={isRevealed ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => toggleReveal(revealKey)}
                    style={{ padding: '0 4px' }}
                  />
                </span>
              )
            })}
          </Space>
        )
      },
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
      width: 80,
      render: (_, record) => (
        <Popconfirm title={`确认删除 ${record.name}？`} onConfirm={() => handleDelete(record)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>保密字典</h2>
          <p>管理 Kubernetes Secret 敏感数据</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="Secret 总数" value={secrets.length} prefix={<LockOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="Opaque" value={typeCount('Opaque')} prefix={<LockOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f9f0ff' }}>
            <Statistic title="TLS / Docker" value={typeCount('kubernetes.io/tls') + typeCount('kubernetes.io/dockerconfigjson')} prefix={<LockOutlined style={{ color: '#722ed1' }} />} />
          </Card>
        </Col>
      </Row>

      <Card className="section-card" bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <Select
              style={{ width: 200 }}
              placeholder="选择集群"
              value={selectedCluster || undefined}
              onChange={(v) => { setSelectedCluster(v); setSelectedNs('') }}
            >
              {clusters.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
            <Select
              style={{ width: 180 }}
              placeholder="全部命名空间"
              allowClear
              value={selectedNs || undefined}
              onChange={(v) => setSelectedNs(v || '')}
            >
              {namespaces.map((ns) => (
                <Select.Option key={ns.name} value={ns.name}>{ns.name}</Select.Option>
              ))}
            </Select>
            <Input
              placeholder="搜索 Secret"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateVisible(true) }}>
              创建保密字典
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchSecrets}>刷新</Button>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey={(r) => `${r.namespace}/${r.name}`}
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title="创建保密字典"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        width={640}
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'Opaque', entries: [{ key: '', value: '' }] }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-z0-9][a-z0-9.-]*$/, message: '小写字母、数字、点、中划线' }]}>
            <Input placeholder="例如: my-secret" />
          </Form.Item>
          <Form.Item name="namespace" label="命名空间" rules={[{ required: true, message: '请选择命名空间' }]}>
            <Select placeholder="选择命名空间">
              {namespaces.map((ns) => (
                <Select.Option key={ns.name} value={ns.name}>{ns.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Opaque">Opaque</Select.Option>
              <Select.Option value="kubernetes.io/tls">TLS (kubernetes.io/tls)</Select.Option>
              <Select.Option value="kubernetes.io/dockerconfigjson">Docker (kubernetes.io/dockerconfigjson)</Select.Option>
            </Select>
          </Form.Item>
          <Form.List name="entries">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>数据 (Key-Value)</div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, 'key']} noStyle rules={[{ required: true, message: '请输入 Key' }]}>
                      <Input placeholder="Key" style={{ width: 180 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} noStyle>
                      <Input.Password placeholder="Value" style={{ width: 320 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加数据项
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

export default SecretList
