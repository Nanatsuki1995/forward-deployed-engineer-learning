import { CheckCircleOutlined, FormOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Radio, Result, Select, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api/client';

const { TextArea } = Input;
const { Title, Text } = Typography;

const categoryOptions = [
  { value: '权限问题', label: '权限问题' },
  { value: '数据异常', label: '数据异常' },
  { value: '系统故障', label: '系统故障' },
  { value: '功能咨询', label: '功能咨询' },
  { value: '账号问题', label: '账号问题' },
  { value: '报表需求', label: '报表需求' },
  { value: '接口对接', label: '接口对接' },
  { value: '其他', label: '其他' },
];

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export function SubmitPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const { message } = App.useApp();

  const handleFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const ticket = await api.createPublicTicket({
        title: values.title as string,
        description: values.description as string,
        category: values.category as string | undefined,
        priority: values.priority as string | undefined,
        submitterName: values.submitterName as string | undefined,
        submitterPhone: values.submitterPhone as string | undefined,
        submitterEmail: values.submitterEmail as string | undefined,
        tags: values.tags as string[] | undefined,
      });
      setTicketId(ticket.id);
      setSubmitted(true);
      message.success('工单提交成功！');
    } catch {
      message.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: 16,
        }}
      >
        <Card style={{ width: '100%', maxWidth: 480 }}>
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            title="工单提交成功"
            subTitle={
              <span>
                工单编号：<Typography.Text code>{ticketId}</Typography.Text>
                ，我们会尽快处理您的问题。
              </span>
            }
            extra={[
              <Button
                key="new"
                type="primary"
                onClick={() => {
                  setSubmitted(false);
                  form.resetFields();
                }}
              >
                提交新工单
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 16,
      }}
    >
      <Card
        style={{ width: '100%', maxWidth: 480 }}
        styles={{ body: { padding: '32px 32px 36px' } }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: '#eff6ff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <FormOutlined style={{ fontSize: 26, color: '#3b82f0' }} />
          </div>
          <Title level={4} style={{ margin: '0 0 4px' }}>
            提交工单
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            请描述您的问题，我们会尽快处理
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          size="large"
        >
          {/* Required fields */}
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入工单标题' }]}
          >
            <Input placeholder="一句话描述问题" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="description"
            label="详细描述"
            rules={[{ required: true, message: '请描述问题详情' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细描述遇到的问题，如发生时间、影响范围等"
              maxLength={2000}
              showCount
            />
          </Form.Item>

          {/* Optional: priority + category side by side */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="priority" label="优先级" style={{ flex: 1 }}>
              <Radio.Group optionType="button" buttonStyle="solid" size="middle">
                {priorityOptions.map((opt) => (
                  <Radio.Button key={opt.value} value={opt.value}>
                    {opt.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item name="category" label="分类" style={{ flex: 1 }}>
              <Select
                placeholder="选择问题类型"
                options={categoryOptions}
                allowClear
              />
            </Form.Item>
          </div>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后回车" />
          </Form.Item>

          {/* Contact info */}
          <Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginBottom: 12 }}
          >
            联系信息（选填，方便我们反馈处理结果）
          </Text>

          <Form.Item name="submitterName">
            <Input placeholder="姓名" />
          </Form.Item>

          <Form.Item name="submitterPhone">
            <Input placeholder="手机号" />
          </Form.Item>

          <Form.Item
            name="submitterEmail"
            rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          >
            <Input placeholder="邮箱" type="email" />
          </Form.Item>

          {/* Submit button */}
          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              size="large"
              style={{ height: 46, fontSize: 16, fontWeight: 600 }}
            >
              提交工单
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
