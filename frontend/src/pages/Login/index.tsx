import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Checkbox, message } from 'antd'
import { UserOutlined, LockOutlined, CloudServerOutlined } from '@ant-design/icons'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [loading, setLoading] = React.useState(false)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await authService.login(values)
      setAuth(res.data.token, res.data.user)
      message.success('登录成功')
      navigate('/')
    } catch {
      // Error handled by interceptor
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Floating shapes */}
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        top: '10%',
        left: '5%',
        animation: 'float 15s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
        bottom: '15%',
        right: '10%',
        animation: 'float 20s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
        top: '50%',
        right: '20%',
        animation: 'float 18s ease-in-out infinite',
      }} />

      <div className="login-card-wrapper">
        {/* Icon */}
        <div className="login-icon">
          <CloudServerOutlined />
        </div>

        <h1 className="login-heading">DevOps 运维平台</h1>
        <p className="login-desc">统一管理您的服务器和应用</p>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
          initialValues={{ remember: true }}
          className="login-form"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 28 }}>
            <Checkbox>记住登录状态</Checkbox>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              className="login-btn"
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div className="login-footer">
          <div style={{ marginBottom: 8 }}>演示账号: admin / admin123</div>
          <div style={{ color: 'var(--ink-muted)', fontSize: 12 }}>DevOps Platform v1.0</div>
        </div>
      </div>
    </div>
  )
}

export default Login
