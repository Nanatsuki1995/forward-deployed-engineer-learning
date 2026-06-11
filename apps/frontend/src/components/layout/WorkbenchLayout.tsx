import {
  Bot,
  Database,
  FileText,
  LogOut,
  TicketCheck,
  Users,
} from 'lucide-react';
import { Button, Layout, Menu, Space, Tag, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/useAuth';
import { getRolePermissions, roleLabels } from '../../lib/workbench';

const { Content, Sider } = Layout;

export function WorkbenchLayout({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const permissions = getRolePermissions(user?.role);

  return (
    <Layout className="workbench-layout">
      <Sider className="workbench-sider" width={280}>
        <div className="brand">
          <div className="brand-mark">FDE</div>
          <div>
            <strong>AI 工单助手</strong>
            <span>React + NestJS 学习项目</span>
          </div>
        </div>

        <Menu
          className="nav-menu"
          defaultSelectedKeys={['tickets']}
          items={[
            {
              key: 'tickets',
              icon: <TicketCheck size={18} />,
              label: <a href="#tickets">工单工作台</a>,
            },
            {
              key: 'knowledge',
              icon: <FileText size={18} />,
              label: <a href="#knowledge">知识库</a>,
            },
            {
              key: 'ai',
              icon: <Bot size={18} />,
              label: <a href="#ai">AI 调用记录</a>,
            },
            {
              key: 'infra',
              icon: <Database size={18} />,
              label: <a href="#infra">部署基础</a>,
            },
          ]}
          mode="inline"
        />

        <section className="role-card">
          <Space align="start">
            <Users size={18} />
            <div>
              <Typography.Text type="secondary">当前角色</Typography.Text>
              <Typography.Title level={5}>
                {user ? `${user.name} / ${roleLabels[user.role]}` : '未连接'}
              </Typography.Title>
            </div>
          </Space>
          {user ? <Typography.Text type="secondary">{user.email}</Typography.Text> : null}
          <Space wrap>
            {permissions.capabilities.map((capability) => (
              <Tag color="green" key={capability}>
                {capability}
              </Tag>
            ))}
          </Space>
          <Button block icon={<LogOut size={16} />} onClick={() => void logout()}>
            退出登录
          </Button>
        </section>
      </Sider>

      <Layout>
        <Content className="workbench-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
