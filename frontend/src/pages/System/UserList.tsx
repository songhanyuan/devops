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
  Switch,
  Card,
  Statistic,
} from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  KeyOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { userService, User, Role } from '@/services/user'
import dayjs from 'dayjs'

const UserList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await userService.list({ page, page_size: pageSize, keyword })
      setUsers(res.data.list || [])
      setTotal(res.data.total)
    } catch {
      message.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await userService.listRoles()
      setRoles(res.data || [])
    } catch {
      message.error('获取角色列表失败')
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [page, pageSize, keyword])

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: User) => {
    setEditingUser(record)
    form.setFieldsValue({
      ...record,
      status: record.status === 1,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await userService.delete(id)
      message.success('删除成功')
      fetchUsers()
    } catch {
      message.error('删除失败')
    }
  }

  const handleResetPassword = (id: string) => {
    setSelectedUserId(id)
    passwordForm.resetFields()
    setPasswordModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        ...values,
        status: values.status ? 1 : 0,
      }
      if (editingUser) {
        delete data.password
        delete data.username
        await userService.update(editingUser.id, data)
        message.success('更新成功')
      } else {
        await userService.create(data)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchUsers()
    } catch {
      message.error('提交失败')
    }
  }

  const handlePasswordSubmit = async () => {
    try {
      const values = await passwordForm.validateFields()
      await userService.resetPassword(selectedUserId, values.password)
      message.success('密码重置成功')
      setPasswordModalVisible(false)
    } catch {
      message.error('密码重置失败')
    }
  }

  const handleStatusChange = async (user: User, checked: boolean) => {
    try {
      await userService.update(user.id, { status: checked ? 1 : 0 })
      message.success('状态更新成功')
      fetchUsers()
    } catch {
      message.error('状态更新失败')
    }
  }

  const roleColorMap: Record<string, string> = {
    admin: 'red',
    operator: 'orange',
    develop: 'blue',
    viewer: 'default',
  }

  const totalCount = total || users.length
  const activeCount = users.filter((u) => u.status === 1).length
  const adminCount = users.filter((u) => u.role?.code === 'admin').length

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120 },
    { title: '姓名', dataIndex: 'real_name', key: 'real_name', width: 100 },
    { title: '邮箱', dataIndex: 'email', key: 'email', width: 180 },
    { title: '手机', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: Role) => (
        <Tag color={roleColorMap[role?.code] || 'default'}>
          {role?.name || '-'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number, record) => (
        <Switch
          checked={status === 1}
          onChange={(checked) => handleStatusChange(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
          disabled={record.username === 'admin'}
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      width: 160,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record.id)}
          >
            重置密码
          </Button>
          {record.username !== 'admin' && (
            <Popconfirm title="确定删除该用户?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-shell fade-in">
      <div className="page-hero">
        <div>
          <div className="page-hero-title">用户管理</div>
          <p className="page-hero-subtitle">管理平台用户、角色与权限</p>
        </div>
        <div className="page-hero-actions">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加用户
          </Button>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
            刷新
          </Button>
        </div>
      </div>

      <div className="metric-grid">
        <Card className="metric-card metric-card--primary" bordered={false}>
          <Statistic title="用户总数" value={totalCount} prefix={<TeamOutlined style={{ color: '#0ea5e9' }} />} />
        </Card>
        <Card className="metric-card metric-card--success" bordered={false}>
          <Statistic title="启用" value={activeCount} prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />} />
        </Card>
        <Card className="metric-card metric-card--warning" bordered={false}>
          <Statistic title="管理员" value={adminCount} prefix={<UserOutlined style={{ color: '#f59e0b' }} />} />
        </Card>
      </div>

      <Card className="section-card" bordered={false}>
      <div className="toolbar">
        <div className="toolbar-left">
          <Input.Search
            placeholder="搜索用户名、姓名、邮箱"
            allowClear
            style={{ width: 260 }}
            onSearch={(value) => {
              setKeyword(value)
              setPage(1)
            }}
          />
        </div>
        <div className="toolbar-right" />
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
          },
        }}
      />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 50, message: '用户名长度为 3-50 个字符' },
            ]}
          >
            <Input placeholder="用户名" disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 个字符' },
              ]}
            >
              <Input.Password placeholder="密码" />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="real_name" label="姓名">
            <Input placeholder="真实姓名" />
          </Form.Item>
          <Form.Item name="phone" label="手机">
            <Input placeholder="手机号码" />
          </Form.Item>
          <Form.Item
            name="role_id"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色">
              {roles.map((role) => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name} - {role.description}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {editingUser && (
            <Form.Item name="status" label="状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="重置密码"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => setPasswordModalVisible(false)}
        width={400}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password placeholder="输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserList
