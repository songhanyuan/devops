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
  GatewayOutlined,
  GlobalOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { k8sService, Cluster, K8sIngress, K8sNamespace } from '@/services/k8s'

const IngressList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([])
  const [selectedNs, setSelectedNs] = useState<string>('')
  const [ingresses, setIngresses] = useState<K8sIngress[]>([])
  const [keyword, setKeyword] = useState('')
  const [createVisible, setCreateVisible] = useState(false)
  const [creating, setCreating] = useState(false)
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

  const fetchIngresses = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const res = await k8sService.getIngresses(selectedCluster, selectedNs)
      setIngresses(res.data || [])
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClusters() }, [])
  useEffect(() => { if (selectedCluster) { fetchNamespaces(); fetchIngresses() } }, [selectedCluster])
  useEffect(() => { if (selectedCluster) fetchIngresses() }, [selectedNs])

  const filtered = ingresses.filter((i) =>
    !keyword || i.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const hostCount = new Set(ingresses.flatMap((i) => i.hosts || [])).size

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      await k8sService.createIngress(selectedCluster, {
        name: values.name,
        namespace: values.namespace,
        rules: values.rules.map((r: { host: string; path: string; backend: string; port: number }) => ({
          host: r.host,
          paths: [{ path: r.path || '/', backend: r.backend, port: r.port }],
        })),
      })
      message.success('路由创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchIngresses()
    } catch { /* handled */ }
    finally { setCreating(false) }
  }

  const handleDelete = async (record: K8sIngress) => {
    try {
      await k8sService.deleteIngress(selectedCluster, record.namespace, record.name)
      message.success('删除成功')
      fetchIngresses()
    } catch { /* handled */ }
  }

  const columns: ColumnsType<K8sIngress> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      ellipsis: true,
      render: (name: string) => <Tooltip title={name}><span style={{ fontWeight: 500 }}>{name}</span></Tooltip>,
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', width: 140 },
    {
      title: 'Hosts',
      dataIndex: 'hosts',
      key: 'hosts',
      render: (hosts: string[]) => hosts?.map((h, i) => <Tag key={i} color="blue">{h}</Tag>) || '-',
    },
    {
      title: '规则',
      dataIndex: 'rules',
      key: 'rules',
      render: (rules: K8sIngress['rules']) => (
        <Space direction="vertical" size={2}>
          {rules?.map((rule, i) =>
            rule.paths?.map((p, j) => (
              <span key={`${i}-${j}`} style={{ fontSize: 12 }}>
                <Tag>{rule.host}{p.path}</Tag> → {p.backend}:{p.port}
              </span>
            ))
          ) || '-'}
        </Space>
      ),
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
          <h2>路由</h2>
          <p>管理 Kubernetes Ingress 路由规则</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="Ingress 总数" value={ingresses.length} prefix={<GatewayOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={12}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="域名数" value={hostCount} prefix={<GlobalOutlined style={{ color: '#52c41a' }} />} />
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
              placeholder="搜索 Ingress"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
              创建路由
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchIngresses}>刷新</Button>
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
        title="创建路由"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-z0-9][a-z0-9-]*$/, message: '小写字母、数字、中划线' }]}>
            <Input placeholder="例如: my-ingress" />
          </Form.Item>
          <Form.Item name="namespace" label="命名空间" rules={[{ required: true, message: '请选择命名空间' }]}>
            <Select placeholder="选择命名空间">
              {namespaces.map((ns) => (
                <Select.Option key={ns.name} value={ns.name}>{ns.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.List name="rules" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>路由规则</div>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={8}>
                      <Col span={11}>
                        <Form.Item {...restField} name={[name, 'host']} label="域名" rules={[{ required: true, message: '请输入域名' }]}>
                          <Input placeholder="例如: example.com" />
                        </Form.Item>
                      </Col>
                      <Col span={11}>
                        <Form.Item {...restField} name={[name, 'path']} label="路径" initialValue="/">
                          <Input placeholder="/" />
                        </Form.Item>
                      </Col>
                      <Col span={2} style={{ display: 'flex', alignItems: 'center', paddingTop: 30 }}>
                        {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />}
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'backend']} label="后端服务" rules={[{ required: true, message: '请输入服务名' }]}>
                          <Input placeholder="服务名称" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'port']} label="端口" rules={[{ required: true, message: '请输入端口' }]}>
                          <Input type="number" placeholder="80" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加规则
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

export default IngressList
