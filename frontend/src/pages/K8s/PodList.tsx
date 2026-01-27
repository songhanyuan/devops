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
  Tooltip,
} from 'antd'
import {
  ReloadOutlined,
  ContainerOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { k8sService, Cluster, K8sResource, K8sNamespace } from '@/services/k8s'

const PodList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [namespaces, setNamespaces] = useState<K8sNamespace[]>([])
  const [selectedNs, setSelectedNs] = useState<string>('')
  const [pods, setPods] = useState<K8sResource[]>([])
  const [keyword, setKeyword] = useState('')
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentPod, setCurrentPod] = useState<K8sResource | null>(null)

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

  const fetchPods = async () => {
    if (!selectedCluster) return
    setLoading(true)
    try {
      const res = await k8sService.getPods(selectedCluster, selectedNs)
      setPods(res.data || [])
    } catch { /* handled */ }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchClusters() }, [])
  useEffect(() => { if (selectedCluster) { fetchNamespaces(); fetchPods() } }, [selectedCluster])
  useEffect(() => { if (selectedCluster) fetchPods() }, [selectedNs])

  const filtered = pods.filter((p) =>
    !keyword || p.name.toLowerCase().includes(keyword.toLowerCase())
  )

  const runningCount = pods.filter((p) => p.status === 'Running').length
  const pendingCount = pods.filter((p) => p.status === 'Pending').length
  const failedCount = pods.filter((p) => p.status === 'Failed' || p.status === 'CrashLoopBackOff').length

  const columns: ColumnsType<K8sResource> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 320,
      ellipsis: true,
      render: (name: string, record) => (
        <Tooltip title={name}>
          <a onClick={() => { setCurrentPod(record); setDetailVisible(true) }}>
            {name}
          </a>
        </Tooltip>
      ),
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', width: 140 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const colorMap: Record<string, string> = {
          Running: 'green',
          Pending: 'orange',
          Succeeded: 'blue',
          Failed: 'red',
          CrashLoopBackOff: 'red',
          ContainerCreating: 'cyan',
          Terminating: 'default',
        }
        return <Tag color={colorMap[s] || 'default'}>{s}</Tag>
      },
    },
    {
      title: '副本',
      key: 'replicas',
      width: 80,
      render: (_, r) => (
        <span style={{ color: r.ready === r.replicas ? '#52c41a' : '#faad14' }}>
          {r.ready}/{r.replicas}
        </span>
      ),
    },
    {
      title: '镜像',
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
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h2>容器组</h2>
          <p>跨集群查看和管理 Kubernetes Pod 资源</p>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={6}>
          <Card className="stat-card" bordered={false} style={{ background: '#f0f5ff' }}>
            <Statistic title="Pod 总数" value={pods.length} prefix={<ContainerOutlined style={{ color: '#4f46e5' }} />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="stat-card" bordered={false} style={{ background: '#f6ffed' }}>
            <Statistic title="Running" value={runningCount} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="stat-card" bordered={false} style={{ background: '#fffbe6' }}>
            <Statistic title="Pending" value={pendingCount} prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={6}>
          <Card className="stat-card" bordered={false} style={{ background: '#fff2f0' }}>
            <Statistic title="Failed" value={failedCount} prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} />
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
              placeholder="搜索 Pod"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPods}>刷新</Button>
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
        title="Pod 详情"
        width={560}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {currentPod && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="名称">{currentPod.name}</Descriptions.Item>
            <Descriptions.Item label="命名空间">{currentPod.namespace}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={currentPod.status === 'Running' ? 'green' : 'orange'}>{currentPod.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="就绪">{currentPod.ready}/{currentPod.replicas}</Descriptions.Item>
            <Descriptions.Item label="镜像">
              {currentPod.images?.map((img, i) => (
                <Tag key={i} style={{ marginBottom: 4 }}>{img}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(currentPod.created_at).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}

export default PodList
