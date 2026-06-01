import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAdminAuthStore } from '../stores/adminAuthStore';

const { Title } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a5632 100%)',
    }}>
      <Card style={{ width: 400, background: '#1e293b', borderColor: '#334155' }}
        styles={{ header: { borderColor: '#334155' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 48 }}>⚽</span>
          <Title level={3} style={{ color: '#ffd700', margin: '8px 0 0' }}>管理后台</Title>
        </div>
        <Form onFinish={handleSubmit} layout="vertical" size="large">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
            <Input prefix={<MailOutlined />} placeholder="管理员邮箱" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44 }}>
              管理员登录
            </Button>
          </Form.Item>
        </Form>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 12 }}>
          默认账户: admin@fifa2026.com / admin123456
        </p>
      </Card>
    </div>
  );
}
