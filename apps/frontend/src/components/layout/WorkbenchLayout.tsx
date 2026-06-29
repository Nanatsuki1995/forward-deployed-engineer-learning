import {
  AuditOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Flex,
  Layout,
  Menu,
  Space,
  Tag,
  theme,
  Typography,
} from 'antd';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { getRolePermissions, roleLabels } from '../../lib/workbench';
import type { RolePermissions } from '../../lib/workbench';

const { Content, Sider, Header } = Layout;

const navItems: Array<{
  key: string;
  icon: ReactNode;
  label: string;
  visible?: (permissions: RolePermissions) => boolean;
}> = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/tickets', icon: <CheckSquareOutlined />, label: '工单管理' },
  {
    key: '/ai-costs',
    icon: <DollarCircleOutlined />,
    label: '成本仪表盘',
    visible: (permissions) => permissions.canViewAiCostDashboard,
  },
  { key: '/knowledge', icon: <FileTextOutlined />, label: '知识库' },
  { key: '/roadmap', icon: <NodeIndexOutlined />, label: '学习路线' },
  { key: '/audit', icon: <AuditOutlined />, label: '审计日志' },
];

function pathToBreadcrumb(pathname: string): { title: string }[] {
  const segments = [
    { title: '首页' },
  ];

  const item = navItems.find((n) => n.key === pathname);
  if (item && item.key !== '/') {
    segments.push({ title: item.label as string });
  }

  return segments;
}

export function WorkbenchLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const permissions = getRolePermissions(user?.role);
  const { token: themeToken } = theme.useToken();
  const visibleNavItems = navItems.filter(
    (item) => !item.visible || item.visible(permissions),
  );

  const firstPathSegment = location.pathname.split('/').filter(Boolean)[0];
  const selectedKey = firstPathSegment ? `/${firstPathSegment}` : '/';

  const userMenuItems = [
    {
      key: 'role',
      label: (
        <Flex vertical gap={2}>
          <Typography.Text strong>{user?.name ?? '未登录'}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {user ? roleLabels[user.role] : ''}
          </Typography.Text>
        </Flex>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => void logout(),
    },
  ];

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{
          background: themeToken.colorBgContainer,
          borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <Flex vertical style={{ height: '100%', minHeight: 0 }}>
          <Flex
            align="center"
            gap={12}
            style={{
              height: 64,
              padding: collapsed ? '0 20px' : '0 24px',
              borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
              flexShrink: 0,
            }}
          >
            <Flex
              align="center"
              justify="center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: themeToken.colorPrimary,
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              FD
            </Flex>
            {!collapsed && (
              <Typography.Text
                strong
                style={{ fontSize: 15, whiteSpace: 'nowrap' }}
              >
                AI 工单助手
              </Typography.Text>
            )}
          </Flex>

          <div
            data-testid="workbench-sider-menu-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowX: 'hidden',
              overflowY: 'auto',
              paddingBottom: 12,
              paddingTop: 8,
            }}
          >
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              style={{ borderInlineEnd: 'none' }}
              onClick={({ key }) => navigate(key)}
              items={visibleNavItems.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
              }))}
            />
          </div>

          {!collapsed && (
            <Flex
              vertical
              gap={8}
              style={{
                flexShrink: 0,
                margin: 16,
                padding: 14,
                borderRadius: 8,
                background: themeToken.colorFillAlter,
              }}
            >
              <Space>
                <TeamOutlined style={{ color: themeToken.colorTextTertiary }} />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {user ? roleLabels[user.role] : '未连接'}
                </Typography.Text>
              </Space>
              <Flex gap={4} wrap="wrap">
                {permissions.capabilities.slice(0, 3).map((c) => (
                  <Tag
                    color="green"
                    key={c}
                    style={{ fontSize: 11, margin: 0 }}
                  >
                    {c}
                  </Tag>
                ))}
              </Flex>
            </Flex>
          )}
        </Flex>
      </Sider>

      <Layout style={{ height: '100vh', minWidth: 0, overflow: 'hidden' }}>
        <Header
          style={{
            background: themeToken.colorBgContainer,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            padding: '0 24px',
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Flex align="center" gap={16}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <Breadcrumb items={pathToBreadcrumb(location.pathname)} />
          </Flex>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} size="small" style={{ background: themeToken.colorPrimary }} />
              {!collapsed && (
                <Typography.Text>{user?.name ?? '未登录'}</Typography.Text>
              )}
            </Space>
          </Dropdown>
        </Header>

        <Content
          data-testid="workbench-content-scroll"
          style={{
            padding: 24,
            background: themeToken.colorBgLayout,
            height: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
