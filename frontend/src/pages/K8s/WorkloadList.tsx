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
  Steps,
  message,
  Popconfirm,
  Tooltip,
} from 'antd'
import {
  ReloadOutlined,
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ArrowsAltOutlined,
  RedoOutlined,
  MinusCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { k8sService, Cluster, K8sResource, K8sNamespace } from '@/services/k8s'

interface WorkloadListProps {
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet' | 'CronJob'
}

const kindConfig: Record<string, { title: string; desc: string; endpoint: string }> = {
  Deployment: { title: '无状态', desc: '管理无状态应用 Deployment 资源', endpoint: 'deployments' },
  StatefulSet: { title: '有状态', desc: '管理有状态应用 StatefulSet 资源', endpoint: 'statefulsets' },
  DaemonSet: { title: '守护进程集', desc: '管理守护进程集 DaemonSet 资源', endpoint: 'daemonsets' },
  CronJob: { title: '任务', desc: '管理定时任务 CronJob 资源', endpoint: 'cronjobs' },
}

const WorkloadList: React.FC<WorkloadListProps> = ({ kind }) => {
  const config = kindConfig[kind]

  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([])
  const [selectedNs, setSelectedNs] = useState<string>('')
  const [resources, setResources] = useState<K8sResource[]>([])
  const [keyword, setKeyword] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentResource, setCurrentResource] = useState<K8sResource | null>(null)

  // Create modal
  const [createVisible, setCreateVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [creating, setCreating] = useState(false)
  const [basicForm] = Form.useForm()
  const [containerForm] = Form.useForm()

  // Scale modal
  const [scaleVisible, setScaleVisible] = useState(false)
  const [scaleTarget, setScaleTarget] = useState<K8sResource | null>(null)
  const [scaleReplicas, setScaleReplicas] = useState(1)

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

  const fetchResources = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const res = await k8sService.getWorkloads(selectedCluster, kind, selectedNs)
      setResources(res.data || [])
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClusters() }, [])
  useEffect(() => {
    if (selectedCluster) {
      fetchNamespaces()
      fetchResources()
    }
  }, [selectedCluster, kind])
  useEffect(() => {
    if (selectedCluster) fetchResources()
  }, [selectedNs])

  const filtered = resources.filter((r) =>
    !keyword || r.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const runningCount = resources.filter((r) => r.status === 'Running' || r.status === 'Active' || r.ready === r.replicas).length
  const abnormalCount = resources.filter((r) => r.status === 'Failed' || r.status === 'CrashLoopBackOff' || (r.replicas > 0 && r.ready === 0)).length

  const handleCreate = async () => {
    try {
      const basic = await basicForm.validateFields()
      const container = await containerForm.validateFields()
      setCreating(true)

      const params = {
        name: basic.name,
        namespace: basic.namespace,
        replicas: basic.replicas || 1,
        labels: basic.labels ? Object.fromEntries(
          (basic.labels as string).split(',').map((l: string) => l.trim().split('='))
        ) : undefined,
        image: container.image,
        ports: container.ports?.filter((p: { containerPort: number }) => p.containerPort).map(
          (p: { containerPort: number; protocol?: string }) => ({ containerPort: p.containerPort, protocol: p.protocol || 'TCP' })
        ),
        env: container.env?.filter((e: { name: string; value: string }) => e.name).map(
          (e: { name: string; value: string }) => ({ name: e.name, value: e.value })
        ),
        cpu_request: container.cpu_request,
        cpu_limit: container.cpu_limit,
        memory_request: container.memory_request,
        memory_limit: container.memory_limit,
        schedule: kind === 'CronJob' ? basic.schedule : undefined,
      }

      const createFn = {
        Deployment: k8sService.createDeployment,
        StatefulSet: k8sService.createStatefulSet,
        DaemonSet: k8sService.createDaemonSet,
        CronJob: k8sService.createCronJob,
      }[kind]

      await createFn(selectedCluster, params)
      message.success(`${config.title}创建成功`)
      setCreateVisible(false)
      setCurrentStep(0)
      basicForm.resetFields()
      containerForm.resetFields()
      fetchResources()
    } catch { /* handled */ }
    finally { setCreating(false) }
  }

  const handleDelete = async (record: K8sResource) => {
    try {
      const deleteFn = {
        Deployment: k8sService.deleteDeployment,
        StatefulSet: k8sService.deleteStatefulSet,
        DaemonSet: k8sService.deleteDaemonSet,
        CronJob: k8sService.deleteCronJob,
      }[kind]
      await deleteFn(selectedCluster, record.namespace, record.name)
      message.success('删除成功')
      fetchResources()
    } catch { /* handled */ }
  }

  const handleScale = async () => {
    if (!scaleTarget) return
    try {
      const scaleFn = kind === 'Deployment' ? k8sService.scaleDeployment : k8sService.scaleStatefulSet
      await scaleFn(selectedCluster, scaleTarget.namespace, scaleTarget.name, scaleReplicas)
      message.success('伸缩成功')
      setScaleVisible(false)
      fetchResources()
    } catch { /* handled */ }
  }

  const handleRestart = async (record: K8sResource) => {
    try {
      await k8sService.restartDeployment(selectedCluster, record.namespace, record.name)
      message.success('重启已触发')
      fetchResources()
    } catch { /* handled */ }
  }

  const columns: ColumnsType<K8sResource> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 280,
      ellipsis: true,
      render: (name: string, record) => (
        <Tooltip title={name}>
          <a onClick={() => { setCurrentResource(record); setDetailVisible(true) }}>
            {name}
          </a>
        </Tooltip>
      ),
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', width: 140 },
    {
      title: '镜像',
      dataIndex: 'images',
      key: 'images',
      ellipsis: true,
      render: (images: string[]) => images?.join(', ') || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          Running: 'green', Active: 'green', Available: 'green',
          Pending: 'orange', Progressing: 'blue',
          Failed: 'red', CrashLoopBackOff: 'red',
        }
        return <Tag color={colorMap[s] || 'default'}>{s}</Tag>
      },
    },
  ]

  // Add replicas column for Deployment/StatefulSet
  if (kind === 'Deployment' || kind === 'StatefulSet') {
    columns.splice(3, 0, {
      title: '副本',
      key: 'replicas',
      width: 80,
      render: (_, r) => (
        <span style={{ color: r.ready === r.replicas ? '#52c41a' : '#faad14' }}>
          {r.ready}/{r.replicas}
        </span>
      ),
    })
  }

  // Add schedule column for CronJob
  if (kind === 'CronJob') {
    columns.splice(3, 0, {
      title: '调度表达式',
      dataIndex: 'schedule',
      key: 'schedule',
      width: 150,
      render: (s: string) => <code>{s || '-'}</code>,
    })
  }

  columns.push(
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
      width: kind === 'Deployment' ? 200 : kind === 'StatefulSet' ? 160 : 120,
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => { setCurrentResource(record); setDetailVisible(true) }}>
            详情
          </Button>
          {(kind === 'Deployment' || kind === 'StatefulSet') && (
            <Button
              type="link"
              size="small"
              icon={<ArrowsAltOutlined />}
              onClick={() => {
                setScaleTarget(record)
                setScaleReplicas(record.replicas)
                setScaleVisible(true)
              }}
            >
              伸缩
            </Button>
          )}
          {kind === 'Deployment' && (
            <Popconfirm title="确认重启此 Deployment？" onConfirm={() => handleRestart(record)}>
              <Button type="link" size="small" icon={<RedoOutlined />}>重启</Button>
            </Popconfirm>
          )}
          <Popconfirm title={`确认删除 ${record.name}？`} onConfirm={() => handleDelete(record)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  )

  const steps = [
    { title: '基本信息' },
    { title: '容器配置' },
    { title: '确认' },
  ]

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
        <Form form={basicForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }, { pattern: /^[a-z0-9][a-z0-9-]*$/, message: '小写字母、数字、中划线' }]}>
            <Input placeholder="例如: my-app" />
          </Form.Item>
          <Form.Item name="namespace" label="命名空间" rules={[{ required: true, message: '请选择命名空间' }]}>
            <Select placeholder="选择命名空间">
              {namespaces.map((ns) => (
                <Select.Option key={ns.name} value={ns.name}>{ns.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          {(kind === 'Deployment' || kind === 'StatefulSet') && (
            <Form.Item name="replicas" label="副本数" initialValue={1}>
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          )}
          {kind === 'CronJob' && (
            <Form.Item name="schedule" label="调度表达式 (Cron)" rules={[{ required: true, message: '请输入 Cron 表达式' }]}>
              <Input placeholder="例如: */5 * * * *" />
            </Form.Item>
          )}
          <Form.Item name="labels" label="标签" extra="格式: key1=value1,key2=value2">
            <Input placeholder="app=myapp,env=prod" />
          </Form.Item>
        </Form>
      )
    }
    if (currentStep === 1) {
      return (
        <Form form={containerForm} layout="vertical">
          <Form.Item name="image" label="容器镜像" rules={[{ required: true, message: '请输入镜像地址' }]}>
            <Input placeholder="例如: nginx:1.24" />
          </Form.Item>
          <Form.List name="ports">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>端口映射</div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, 'containerPort']} noStyle>
                      <InputNumber placeholder="容器端口" min={1} max={65535} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'protocol']} noStyle initialValue="TCP">
                      <Select style={{ width: 80 }}>
                        <Select.Option value="TCP">TCP</Select.Option>
                        <Select.Option value="UDP">UDP</Select.Option>
                      </Select>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
                  添加端口
                </Button>
              </>
            )}
          </Form.List>
          <Form.List name="env">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>环境变量</div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...restField} name={[name, 'name']} noStyle>
                      <Input placeholder="变量名" style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'value']} noStyle>
                      <Input placeholder="变量值" style={{ width: 200 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginBottom: 16 }}>
                  添加环境变量
                </Button>
              </>
            )}
          </Form.List>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cpu_request" label="CPU Request">
                <Input placeholder="例如: 100m" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cpu_limit" label="CPU Limit">
                <Input placeholder="例如: 500m" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="memory_request" label="Memory Request">
                <Input placeholder="例如: 128Mi" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="memory_limit" label="Memory Limit">
                <Input placeholder="例如: 512Mi" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )
    }
    // Step 2: Confirm
    const basicValues = basicForm.getFieldsValue()
    const containerValues = containerForm.getFieldsValue()
    return (
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="名称">{basicValues.name}</Descriptions.Item>
        <Descriptions.Item label="命名空间">{basicValues.namespace}</Descriptions.Item>
        {(kind === 'Deployment' || kind === 'StatefulSet') && (
          <Descriptions.Item label="副本数">{basicValues.replicas || 1}</Descriptions.Item>
        )}
        {kind === 'CronJob' && (
          <Descriptions.Item label="调度表达式">{basicValues.schedule}</Descriptions.Item>
        )}
        {basicValues.labels && (
          <Descriptions.Item label="标签">{basicValues.labels}</Descriptions.Item>
        )}
        <Descriptions.Item label="镜像">{containerValues.image}</Descriptions.Item>
        {containerValues.ports?.length > 0 && (
          <Descriptions.Item label="端口">
            {containerValues.ports.map((p: { containerPort: number; protocol?: string }, i: number) =>
              p.containerPort ? <Tag key={i}>{p.containerPort}/{p.protocol || 'TCP'}</Tag> : null
            )}
          </Descriptions.Item>
        )}
        {containerValues.env?.length > 0 && (
          <Descriptions.Item label="环境变量">
            {containerValues.env.map((e: { name: string; value: string }, i: number) =>
              e.name ? <Tag key={i}>{e.name}={e.value}</Tag> : null
            )}
          </Descriptions.Item>
        )}
        {(containerValues.cpu_request || containerValues.cpu_limit) && (
          <Descriptions.Item label="CPU">{containerValues.cpu_request || '-'} / {containerValues.cpu_limit || '-'}</Descriptions.Item>
        )}
        {(containerValues.memory_request || containerValues.memory_limit) && (
          <Descriptions.Item label="内存">{containerValues.memory_request || '-'} / {containerValues.memory_limit || '-'}</Descriptions.Item>
        )}
      </Descriptions>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>{config.title}</h2>
          <p>{config.desc}</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="总数" value={resources.length} prefix={<AppstoreOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="正常" value={runningCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card className="stat-card" bordered={false} style={{ background: '#fff2f0' }}>
            <Statistic title="异常" value={abnormalCount} prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} />
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
              placeholder={`搜索${config.title}`}
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Space>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)}>
              创建{config.title}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchResources}>刷新</Button>
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

      {/* Detail Drawer */}
      <Drawer
        title={`${config.title}详情`}
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {currentResource && (
          <>
            <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="名称">{currentResource.name}</Descriptions.Item>
              <Descriptions.Item label="命名空间">{currentResource.namespace}</Descriptions.Item>
              <Descriptions.Item label="类型">{kind}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={
                  currentResource.status === 'Running' || currentResource.status === 'Active' ? 'green' :
                  currentResource.status === 'Failed' ? 'red' : 'orange'
                }>{currentResource.status}</Tag>
              </Descriptions.Item>
              {(kind === 'Deployment' || kind === 'StatefulSet') && (
                <Descriptions.Item label="副本">{currentResource.ready}/{currentResource.replicas}</Descriptions.Item>
              )}
              {kind === 'CronJob' && currentResource.schedule && (
                <Descriptions.Item label="调度表达式"><code>{currentResource.schedule}</code></Descriptions.Item>
              )}
              <Descriptions.Item label="镜像">
                {currentResource.images?.map((img, i) => (
                  <Tag key={i} style={{ marginBottom: 4 }}>{img}</Tag>
                ))}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(currentResource.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>
            {currentResource.yaml && (
              <>
                <h4>YAML</h4>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 400, fontSize: 12 }}>
                  {currentResource.yaml}
                </pre>
              </>
            )}
          </>
        )}
      </Drawer>

      {/* Create Modal */}
      <Modal
        title={`创建${config.title}`}
        open={createVisible}
        onCancel={() => { setCreateVisible(false); setCurrentStep(0) }}
        width={640}
        footer={
          <Space>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>上一步</Button>
            )}
            {currentStep < 2 && (
              <Button type="primary" onClick={async () => {
                if (currentStep === 0) {
                  await basicForm.validateFields()
                } else if (currentStep === 1) {
                  await containerForm.validateFields()
                }
                setCurrentStep(currentStep + 1)
              }}>下一步</Button>
            )}
            {currentStep === 2 && (
              <Button type="primary" loading={creating} onClick={handleCreate}>确认创建</Button>
            )}
          </Space>
        }
      >
        <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />
        {renderStepContent()}
      </Modal>

      {/* Scale Modal */}
      <Modal
        title={`伸缩 - ${scaleTarget?.name}`}
        open={scaleVisible}
        onCancel={() => setScaleVisible(false)}
        onOk={handleScale}
      >
        <div style={{ padding: '16px 0' }}>
          <span>副本数: </span>
          <InputNumber min={0} max={100} value={scaleReplicas} onChange={(v) => setScaleReplicas(v || 0)} />
          <span style={{ marginLeft: 8, color: '#999' }}>当前: {scaleTarget?.replicas || 0}</span>
        </div>
      </Modal>
    </div>
  )
}

export default WorkloadList
