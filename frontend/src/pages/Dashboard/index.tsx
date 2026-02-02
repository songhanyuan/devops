import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Typography, Progress } from 'antd'
import {
  DesktopOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  RocketOutlined,
  ClusterOutlined,
  SettingOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Text } = Typography

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const cpuOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#1a1a2e' },
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: '#eef0f3' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f5f5f7', type: 'dashed' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11, formatter: '{value}%' },
    },
    series: [
      {
        data: [30, 25, 45, 60, 55, 40, 35],
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 3, color: '#667eea' },
        itemStyle: { color: '#667eea', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 126, 234, 0.25)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.02)' },
            ],
          },
        },
      },
    ],
  }

  const memoryOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#1a1a2e' },
    },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: '#eef0f3' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f5f5f7', type: 'dashed' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11, formatter: '{value}%' },
    },
    series: [
      {
        data: [65, 68, 70, 72, 75, 73, 70],
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 3, color: '#11998e' },
        itemStyle: { color: '#11998e', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(17, 153, 142, 0.25)' },
              { offset: 1, color: 'rgba(17, 153, 142, 0.02)' },
            ],
          },
        },
      },
    ],
  }

  const deployOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#eee',
      borderWidth: 1,
      textStyle: { color: '#1a1a2e' },
    },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#eef0f3' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f5f5f7', type: 'dashed' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
    },
    series: [
      {
        data: [5, 8, 12, 6, 10, 3, 2],
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#a78bfa' },
              { offset: 1, color: '#667eea' },
            ],
          },
        },
      },
    ],
  }

  const activities = [
    { color: '#667eea', title: 'admin 部署了 payment-service 到生产环境', time: '5 分钟前' },
    { color: '#11998e', title: 'web-gateway 健康检查恢复正常', time: '15 分钟前' },
    { color: '#f59e0b', title: 'db-server-03 CPU 使用率超过 80%', time: '30 分钟前' },
    { color: '#667eea', title: 'admin 更新了 redis 配置项', time: '1 小时前' },
    { color: '#11998e', title: 'K8s 集群 prod-cluster 连接测试通过', time: '2 小时前' },
    { color: '#ef4444', title: 'api-server-02 SSH 连接失败', time: '3 小时前' },
  ]

  const quickActions = [
    { icon: <PlusOutlined />, title: '添加主机', path: '/monitor/hosts' },
    { icon: <RocketOutlined />, title: '部署应用', path: '/deploy/apps' },
    { icon: <ClusterOutlined />, title: 'K8s 集群', path: '/k8s/clusters' },
    { icon: <SettingOutlined />, title: '配置管理', path: '/config' },
  ]

  return (
    <div className="fade-in">
      {/* Welcome Section */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 8, letterSpacing: -0.5 }}>
          仪表盘
        </h1>
        <p style={{ fontSize: 15, color: '#8c8c8c', margin: 0 }}>
          欢迎回来，这是您的运维概览
        </p>
      </div>

      {/* Stat cards */}
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-blue" bordered={false}>
            <Statistic
              title="主机总数"
              value={12}
              prefix={<DesktopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-purple" bordered={false}>
            <Statistic
              title="应用总数"
              value={8}
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-green" bordered={false}>
            <Statistic
              title="在线主机"
              value={10}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card stat-card-orange" bordered={false}>
            <Statistic
              title="告警数量"
              value={2}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} lg={8}>
          <Card className="chart-card" title="CPU 使用率" bordered={false}>
            <ReactECharts option={cpuOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="chart-card" title="内存使用率" bordered={false}>
            <ReactECharts option={memoryOption} style={{ height: 260 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="chart-card" title="本周部署次数" bordered={false}>
            <ReactECharts option={deployOption} style={{ height: 260 }} />
          </Card>
        </Col>
      </Row>

      {/* Bottom section */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        {/* Quick Actions */}
        <Col xs={24} lg={8}>
          <Card className="section-card" title="快捷操作" bordered={false}>
            <Row gutter={[12, 12]}>
              {quickActions.map((action) => (
                <Col span={12} key={action.title}>
                  <div
                    className="quick-action-card"
                    onClick={() => navigate(action.path)}
                  >
                    <div style={{ marginBottom: 8 }}>{action.icon}</div>
                    <Text style={{ fontSize: 13, fontWeight: 500 }}>{action.title}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Resource usage */}
        <Col xs={24} lg={8}>
          <Card className="section-card" title="资源概览" bordered={false}>
            <div style={{ padding: '4px 0' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#5c5c6d' }}>CPU 平均</Text>
                  <Text strong style={{ color: '#667eea' }}>42%</Text>
                </div>
                <Progress
                  percent={42}
                  showInfo={false}
                  strokeColor={{ from: '#667eea', to: '#764ba2' }}
                  trailColor="#f0f0f5"
                  size="small"
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#5c5c6d' }}>内存平均</Text>
                  <Text strong style={{ color: '#11998e' }}>71%</Text>
                </div>
                <Progress
                  percent={71}
                  showInfo={false}
                  strokeColor={{ from: '#11998e', to: '#38ef7d' }}
                  trailColor="#f0f0f5"
                  size="small"
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#5c5c6d' }}>磁盘平均</Text>
                  <Text strong style={{ color: '#f59e0b' }}>58%</Text>
                </div>
                <Progress
                  percent={58}
                  showInfo={false}
                  strokeColor={{ from: '#f59e0b', to: '#fbbf24' }}
                  trailColor="#f0f0f5"
                  size="small"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#5c5c6d' }}>网络带宽</Text>
                  <Text strong style={{ color: '#8b5cf6' }}>23%</Text>
                </div>
                <Progress
                  percent={23}
                  showInfo={false}
                  strokeColor={{ from: '#8b5cf6', to: '#a78bfa' }}
                  trailColor="#f0f0f5"
                  size="small"
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={8}>
          <Card className="section-card" title="最近动态" bordered={false}>
            <div>
              {activities.map((item, i) => (
                <div className="activity-item" key={i}>
                  <div className="activity-dot" style={{ background: item.color }} />
                  <div className="activity-content">
                    <div className="activity-title">{item.title}</div>
                  </div>
                  <div className="activity-time">{item.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* System Status */}
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24}>
          <Card className="section-card" bordered={false}>
            <Row gutter={[40, 20]} align="middle">
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(17, 153, 142, 0.1) 0%, rgba(56, 239, 125, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <SafetyCertificateOutlined style={{ fontSize: 24, color: '#11998e' }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 13, color: '#8c8c8c' }}>系统状态</Text>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#11998e' }}>运行正常</div>
                  </div>
                </div>
              </Col>
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ThunderboltOutlined style={{ fontSize: 24, color: '#667eea' }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 13, color: '#8c8c8c' }}>今日部署</Text>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>6 次</div>
                  </div>
                </div>
              </Col>
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <WarningOutlined style={{ fontSize: 24, color: '#f59e0b' }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 13, color: '#8c8c8c' }}>待处理告警</Text>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#f59e0b' }}>2 条</div>
                  </div>
                </div>
              </Col>
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ClusterOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 13, color: '#8c8c8c' }}>K8s 集群</Text>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>3 个</div>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
