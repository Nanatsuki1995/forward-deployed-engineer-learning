import { MailOutlined, SafetyCertificateOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Form,
  Input,
  Segmented,
  Space,
  Typography,
} from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { demoAccounts, getErrorMessage } from '../lib/workbench';

interface LoginFormValues {
  email: string;
  password: string;
}

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const location = useLocation();
  const navigate = useNavigate();
  const { error: authError, login, status } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState('agent@example.com');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate replace to="/" />;
  }

  async function handleSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await login(values);
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? '/', { replace: true });
    } catch (requestError) {
      setSubmitError(getErrorMessage(requestError, '登录失败，请检查账号密码'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectDemoAccount(email: string) {
    setSelectedEmail(email);
    setSubmitError(null);
    form.setFieldsValue({
      email,
      password: 'password123',
    });
  }

  return (
    <main className="auth-screen">
      <section className="login-panel">
        <div className="login-heading">
          <div className="login-mark">
            <SafetyCertificateOutlined style={{ fontSize: 28 }} />
          </div>
          <div>
            <Typography.Text className="eyebrow">Secure Workspace</Typography.Text>
            <Typography.Title level={1}>登录 AI 工单助手</Typography.Title>
          </div>
        </div>

        <Form<LoginFormValues>
          form={form}
          initialValues={{
            email: selectedEmail,
            password: 'password123',
          }}
          layout="vertical"
          onFinish={(values) => void handleSubmit(values)}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input
              autoComplete="email"
              inputMode="email"
              prefix={<MailOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              autoComplete="current-password"
              prefix={<SafetyCertificateOutlined />}
              size="large"
            />
          </Form.Item>

          {submitError || authError ? (
            <Alert
              className="login-alert"
              showIcon
              message={submitError ?? authError}
              type="error"
            />
          ) : null}

          <Button
            block
            htmlType="submit"
            icon={<LoginOutlined />}
            loading={isSubmitting}
            size="large"
            type="primary"
          >
            登录
          </Button>
        </Form>

        <Space className="demo-section" direction="vertical" size={10}>
          <Typography.Text strong>演示账号</Typography.Text>
          <Segmented
            block
            onChange={(value) => selectDemoAccount(value as string)}
            options={demoAccounts.map((account) => ({
              label: (
                <span className="demo-option">
                  <UserOutlined style={{ fontSize: 16 }} />
                  <strong>{account.label}</strong>
                  <small>{account.email}</small>
                </span>
              ),
              value: account.email,
            }))}
            value={selectedEmail}
          />
          <Typography.Text type="secondary">
            所有演示账号密码均为 password123
          </Typography.Text>
        </Space>
      </section>
    </main>
  );
}
