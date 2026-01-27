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
  Drawer,
  Descriptions,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
} from 'antd'
import {
  ReloadOutlined,
  ApiOutlined,
  SearchOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { k8sService, Cluster, K8sResource, K8sNamespace } from '@/services/k8s'

interface K8sServiceItem extends K8sResource {
  type?: string
  cluster_ip?: string
  external_ip?: string
  ports?: string
}

const ServiceList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([])
  const [selectedNs, setSelectedNs] = useState<string>('')
  const [services, setServices] = useState<K8sServiceItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentSvc, setCurrentSvc] = useState<K8sServiceItem | null>(null)
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

  const fetchServices = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const res = await k8sService.getServices(selectedCluster, selectedNs)
      setServices(res.data || [])
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClusters() }, [])
  useEffect(() => { if (selectedCluster) { fetchNamespaces(); fetchServices() } }, [selectedCluster])
  useEffect(() => { if (selectedCluster) fetchServices() }, [selectedNs])

  const filtered = services.filter((s) =>
    !keyword || s.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const typeCount = (t: string) => services.filter((s) => s.status === t).length

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setCreating(true)
      await k8sService.createService(selectedCluster, {
        name: values.name,
        namespace: values.namespace,
        type: values.type,
        ports: values.ports.filter((p: { port: number }) => p.port).map(
          (p: { port: number; targetPort: number; protocol?: string; nodePort?: number }) => ({
            port: p.port,
            targetPort: p.targetPort || p.port,
            protocol: p.protocol || 'TCP',
            nodePort: p.nodePort,
          })
        ),
        selector: values.selector
          ? Object.fromEntries(
              (values.selector as string).split(',').map((s: string) => s.trim().split('='))
            )
          : {},
      })
      message.success('Service 创建成功')
      setCreateVisible(false)
      form.resetFields()
      fetchServices()
    } catch { /* handled */ }
    finally { setCreating(false) }
  }

  const handleDelete = async (record: K8sServiceItem) => {
    try {
      await k8sService.deleteService(selectedCluster, record.namespace, record.name)
      message.success('删除成功')
      fetchServices()
    } catch { /* handled */ }
  }

  const columns: ColumnsType<K8sServiceItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (name: string, record) => (
        <a onClick={() => { setCurrentSvc(record); setDetailVisible(true) }}>
          {name}
        </a>
      ),
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', width: 140 },
    {
      title: '类型',
      dataIndex: 'status',
      key: 'type',
      width: 120,
      render: (s: string) => {
        const colorMap: Record<string, string> = { ClusterIP: 'blue', NodePort: 'green', LoadBalancer: 'purple', ExternalName: 'orange' }
        return <Tag color={colorMap[s] || 'default'}>{s}</Tag>
      },
    },
    {
      title: '镜像 / 端口',
      dataIndex: 'images',
      key: 'images',
      ellipsis: true,
      render: (images: string[]) => images?.join(', ') || '-',
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
          <h2>服务</h2>
          <p>跨集群查看和管理 Kubernetes Service 资源</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="Service 总数" value={services.length} prefix={<ApiOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="ClusterIP" value={typeCount('ClusterIP')} prefix={<NodeIndexOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f9f0ff' }}>
            <Statistic title="NodePort / LB" value={typeCount('NodePort') + typeCount('LoadBalancer')} prefix={<GlobalOutlined style={{ color: '#722ed1' }} />} />
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
              onChange={setSelectedCluster}
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
              placeholder="搜索 Service"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateVisible(true) }}>
              创建服务
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchServices}>刷新</Button>
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

      <Drawer
        title="Service 详情"
        width={560}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {currentSvc && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="名称">{currentSvc.name}</Descriptions.Item>
            <Descriptions.Item label="命名空间">{currentSvc.namespace}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag>{currentSvc.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="端口 / 选择器">
              {currentSvc.images?.join(', ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(currentSvc.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="创建服务"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        width={640}
      >
        <Form form={form} layout="vertical" initialValues={{ type: 'ClusterIP', ports: [{}] }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-z0-9][a-z0-9-]*$/, message: '小写字母、数字、中划线' }]}>
            <Input placeholder="例如: my-service" />
          </Form.Item>
          <Form.Item name="namespace" label="命名空间" rules={[{ required: true, message: '请选择命名空间' }]}>
            <Select placeholder="选择命名空间">
              {namespaces.map((ns) => (
                <Select.Option key={ns.name} value={ns.name}>{ns.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select>
              <Select.Option value="ClusterIP">ClusterIP</Select.Option>
              <Select.Option value="NodePort">NodePort</Select.Option>
              <Select.Option value="LoadBalancer">LoadBalancer</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="selector" label="选择器" extra="格式: key1=value1,key2=value2">
            <Input placeholder="app=myapp" />
          </Form.Item>
          <Form.List name="ports">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>端口映射</div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, 'port']} noStyle rules={[{ required: true, message: '端口' }]}>
                      <InputNumber placeholder="端口" min={1} max={65535} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'targetPort']} noStyle>
                      <InputNumber placeholder="目标端口" min={1} max={65535} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'protocol']} noStyle initialValue="TCP">
                      <Select style={{ width: 80 }}>
                        <Select.Option value="TCP">TCP</Select.Option>
                        <Select.Option value="UDP">UDP</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'nodePort']} noStyle>
                      <InputNumber placeholder="NodePort" min={30000} max={32767} style={{ width: 110 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加端口
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  )
}

export default ServiceList
