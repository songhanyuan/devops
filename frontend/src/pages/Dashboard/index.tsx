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
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Text } = Typography

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const cpuOption = {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 16, bottom: 24, left: 40 },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11, formatter: '{value}%' },
    },
    series: [
      {
        data: [30, 25, 45, 60, 55, 40, 35],
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, color: '#4f46e5' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79, 70, 229, 0.2)' },
              { offset: 1, color: 'rgba(79, 70, 229, 0.02)' },
            ],
          },
        },
      },
    ],
  }

  const memoryOption = {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 16, bottom: 24, left: 40 },
    xAxis: {
      type: 'category',
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11, formatter: '{value}%' },
    },
    series: [
      {
        data: [65, 68, 70, 72, 75, 73, 70],
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ],
          },
        },
      },
    ],
  }

  const deployOption = {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 16, bottom: 24, left: 40 },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f5f5f5' } },
      axisLabel: { color: '#8c8c8c', fontSize: 11 },
    },
    series: [
      {
        data: [5, 8, 12, 6, 10, 3, 2],
        type: 'bar',
        barWidth: '40%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#818cf8' },
              { offset: 1, color: '#4f46e5' },
            ],
          },
        },
      },
    ],
  }

  const activities = [
    { color: '#4f46e5', title: 'admin 部署了 payment-service 到生产环境', time: '5 分钟前' },
    { color: '#10b981', title: 'web-gateway 健康检查恢复正常', time: '15 分钟前' },
    { color: '#f59e0b', title: 'db-server-03 CPU 使用率超过 80%', time: '30 分钟前' },
    { color: '#4f46e5', title: 'admin 更新了 redis 配置项', time: '1 小时前' },
    { color: '#10b981', title: 'K8s 集群 prod-cluster 连接测试通过', time: '2 小时前' },
    { color: '#ef4444', title: 'api-server-02 SSH 连接失败', time: '3 小时前' },
  ]

  const quickActions = [
    { icon: <PlusOutlined />, title: '添加主机', path: '/monitor/hosts' },
    { icon: <RocketOutlined />, title: '部署应用', path: '/deploy/apps' },
    { icon: <ClusterOutlined />, title: 'K8s 集群', path: '/k8s/clusters' },
    { icon: <SettingOutlined />, title: '配置管理', path: '/config' },
  ]

  return (
    <div>
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
            <ReactECharts option={cpuOption} style={{ height: 240 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="chart-card" title="内存使用率" bordered={false}>
            <ReactECharts option={memoryOption} style={{ height: 240 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card className="chart-card" title="本周部署次数" bordered={false}>
            <ReactECharts option={deployOption} style={{ height: 240 }} />
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
                    <div style={{ fontSize: 24, color: '#4f46e5', marginBottom: 8 }}>{action.icon}</div>
                    <Text style={{ fontSize: 13 }}>{action.title}</Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* Resource usage */}
        <Col xs={24} lg={8}>
          <Card className="section-card" title="资源概览" bordered={false}>
            <div style={{ padding: '8px 0' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>CPU 平均</Text>
                  <Text strong>42%</Text>
                </div>
                <Progress percent={42} showInfo={false} strokeColor="#4f46e5" size="small" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>内存平均</Text>
                  <Text strong>71%</Text>
                </div>
                <Progress percent={71} showInfo={false} strokeColor="#10b981" size="small" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>磁盘平均</Text>
                  <Text strong>58%</Text>
                </div>
                <Progress percent={58} showInfo={false} strokeColor="#f59e0b" size="small" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text>网络带宽</Text>
                  <Text strong>23%</Text>
                </div>
                <Progress percent={23} showInfo={false} strokeColor="#8b5cf6" size="small" />
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
    </div>
  )
}

export default Dashboard
