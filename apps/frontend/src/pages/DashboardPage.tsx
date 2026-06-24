import {
  CheckSquareOutlined,
  DashboardOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api, type HealthResponse, type Ticket } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { getRolePermissions, roleLabels } from '../lib/workbench';

export function DashboardPage() {
  const { logout, user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const permissions = getRolePermissions(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [h, t, d] = await Promise.all([
        api.health(),
        api.tickets(),
        api.knowledge(),
      ]);
      setHealth(h);
      setTickets(t);
      setDocCount(d.length);
    } catch {
      if (!api.hasStoredSession()) await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const pendingCount = tickets.filter((t) => t.status === 'pending_approval').length;
  const openCount = tickets.length - resolvedCount;

  return (
    <Flex vertical gap={28}>
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            仪表盘
          </Typography.Title>
          <Typography.Text type="secondary">
            系统运行状态与关键指标概览
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </Flex>

      {loading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} lg={6} md={12} xs={24}>
              <Card><Skeleton active /></Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Flex align="center" gap={10}>
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#3b82f0',
                        fontSize: 20,
                      }}
                    >
                      <DashboardOutlined />
                    </Flex>
                    <Typography.Text type="secondary">后端健康</Typography.Text>
                  </Flex>
                  <Statistic value={health?.status ?? '离线'} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {health ? `v${health.version} · 运行 ${Math.floor(health.uptime / 3600)}h` : 'NestJS API'}
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>

            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Flex align="center" gap={10}>
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#3b82f0',
                        fontSize: 20,
                      }}
                    >
                      <CheckSquareOutlined />
                    </Flex>
                    <Typography.Text type="secondary">工单总数</Typography.Text>
                  </Flex>
                  <Statistic value={tickets.length} />
                  <Space size={4}>
                    <Tag color="blue" style={{ fontSize: 11 }}>待处理 {openCount}</Tag>
                    <Tag color="green" style={{ fontSize: 11 }}>已解决 {resolvedCount}</Tag>
                  </Space>
                </Flex>
              </Card>
            </Col>

            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Flex align="center" gap={10}>
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#3b82f0',
                        fontSize: 20,
                      }}
                    >
                      <FileTextOutlined />
                    </Flex>
                    <Typography.Text type="secondary">知识文档</Typography.Text>
                  </Flex>
                  <Statistic value={docCount} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {permissions.knowledgeMode}
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>

            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Flex align="center" gap={10}>
                    <Flex
                      align="center"
                      justify="center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#eff6ff',
                        color: '#3b82f0',
                        fontSize: 20,
                      }}
                    >
                      <SafetyCertificateOutlined />
                    </Flex>
                    <Typography.Text type="secondary">当前角色</Typography.Text>
                  </Flex>
                  <Statistic value={user ? roleLabels[user.role] : '未登录'} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {permissions.summary}
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col lg={12} xs={24}>
              <Card
                title="工单状态分布"
                variant="borderless"
              >
                {tickets.length === 0 ? (
                  <Typography.Text type="secondary">暂无工单数据</Typography.Text>
                ) : (
                  <Flex vertical gap={16}>
                    <Flex justify="space-between">
                      <Typography.Text>处理进度</Typography.Text>
                      <Typography.Text strong>
                        {resolvedCount}/{tickets.length}
                      </Typography.Text>
                    </Flex>
                    <Progress
                      percent={tickets.length > 0 ? Math.round((resolvedCount / tickets.length) * 100) : 0}
                      strokeColor="#3b82f0"
                    />
                    <Flex gap={16}>
                      <Flex align="center" gap={6}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d3a73f', display: 'inline-block' }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          待审核 {pendingCount}
                        </Typography.Text>
                      </Flex>
                      <Flex align="center" gap={6}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#389e0d', display: 'inline-block' }} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          已解决 {resolvedCount}
                        </Typography.Text>
                      </Flex>
                    </Flex>
                  </Flex>
                )}
              </Card>
            </Col>

            <Col lg={12} xs={24}>
              <Card
                extra={
                  <Tag color="green">
                    <ThunderboltOutlined /> {permissions.capabilities.length} 项权限
                  </Tag>
                }
                title="访问权限"
                variant="borderless"
              >
                <Flex gap={6} wrap="wrap">
                  {permissions.capabilities.map((c) => (
                    <Tag color="green" key={c}>{c}</Tag>
                  ))}
                </Flex>
                {user && (
                  <Flex vertical gap={4} style={{ marginTop: 16 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {user.email}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {user.name} · {roleLabels[user.role]}
                    </Typography.Text>
                  </Flex>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Flex>
  );
}
