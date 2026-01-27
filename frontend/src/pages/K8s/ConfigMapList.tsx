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
  FileTextOutlined,
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { k8sService, Cluster, K8sConfigMap, K8sNamespace } from '@/services/k8s'

const ConfigMapList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([])
  const [selectedNs, setSelectedNs] = useState<string>('')
  const [configMaps, setConfigMaps] = useState<K8sConfigMap[]>([])
  const [keyword, setKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<K8sConfigMap | null>(null)
  const [saving, setSaving] = useState(false)
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

  const fetchConfigMaps = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const res = await k8sService.getConfigMaps(selectedCluster, selectedNs)
      setConfigMaps(res.data || [])
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClusters() }, [])
  useEffect(() => { if (selectedCluster) { fetchNamespaces(); fetchConfigMaps() } }, [selectedCluster])
  useEffect(() => { if (selectedCluster) fetchConfigMaps() }, [selectedNs])

  const filtered = configMaps.filter((c) =>
    !keyword || c.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const totalKeys = configMaps.reduce((sum, cm) => sum + Object.keys(cm.data || {}).length, 0)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ entries: [{ key: '', value: '' }] })
    setModalVisible(true)
  }

  const openEdit = (record: K8sConfigMap) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      namespace: record.namespace,
      entries: Object.entries(record.data || {}).map(([key, value]) => ({ key, value })),
    })
    setModalVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const dataMap: Record<string, string> = {}
      for (const entry of values.entries || []) {
        if (entry.key) dataMap[entry.key] = entry.value || ''
      }

      if (editing) {
        await k8sService.updateConfigMap(selectedCluster, editing.namespace, editing.name, dataMap)
        message.success('配置项更新成功')
      } else {
        await k8sService.createConfigMap(selectedCluster, {
          name: values.name,
          namespace: values.namespace,
          data: dataMap,
        })
        message.success('配置项创建成功')
      }
      setModalVisible(false)
      fetchConfigMaps()
    } catch { /* handled */ }
    finally { setSaving(false) }
  }

  const handleDelete = async (record: K8sConfigMap) => {
    try {
      await k8sService.deleteConfigMap(selectedCluster, record.namespace, record.name)
      message.success('删除成功')
      fetchConfigMaps()
    } catch { /* handled */ }
  }

  const columns: ColumnsType<K8sConfigMap> = [
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
      title: 'Keys',
      dataIndex: 'data',
      key: 'keys',
      render: (data: Record<string, string>) => {
        const keys = Object.keys(data || {})
        return keys.length > 0
          ? keys.map((k) => <Tag key={k}>{k}</Tag>)
          : <span style={{ color: '#999' }}>-</span>
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
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title={`确认删除 ${record.name}？`} onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>配置项</h2>
          <p>管理 Kubernetes ConfigMap 配置数据</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="ConfigMap 总数" value={configMaps.length} prefix={<FileTextOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={12}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="Key 总数" value={totalKeys} prefix={<FileTextOutlined style={{ color: '#52c41a' }} />} />
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
              placeholder="搜索 ConfigMap"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              创建配置项
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchConfigMaps}>刷新</Button>
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
        title={editing ? '编辑配置项' : '创建配置项'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-z0-9][a-z0-9.-]*$/, message: '小写字母、数字、点、中划线' }]}>
            <Input placeholder="例如: my-config" disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item name="namespace" label="命名空间" rules={[{ required: true, message: '请选择命名空间' }]}>
              <Select placeholder="选择命名空间">
                {namespaces.map((ns) => (
                  <Select.Option key={ns.name} value={ns.name}>{ns.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
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
                      <Input.TextArea placeholder="Value" style={{ width: 320 }} rows={1} />
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

export default ConfigMapList
