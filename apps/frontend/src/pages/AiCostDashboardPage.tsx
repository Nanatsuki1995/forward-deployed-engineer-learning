import {
  ApiOutlined,
  DollarCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Progress,
  Row,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type AiLog } from '../api/client';
import { useAuth } from '../auth/useAuth';
import {
  formatEstimatedCostUsd,
  formatTokenCount,
  getErrorMessage,
  getRolePermissions,
} from '../lib/workbench';
import {
  buildModelCostRows,
  getAiLogUsage,
  summarizeAiCosts,
  type ModelCostRow,
} from './aiCostDashboard.helpers';

export function AiCostDashboardPage() {
  const { logout, user } = useAuth();
  const permissions = getRolePermissions(user?.role);
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!permissions.canViewAiCostDashboard) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.aiLogs();
      setLogs(data);
    } catch (requestError) {
      setLogs([]);
      setError(getErrorMessage(requestError, '成本数据加载失败'));

      if (!api.hasStoredSession()) {
        await logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout, permissions.canViewAiCostDashboard]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeAiCosts(logs), [logs]);
  const modelRows = useMemo(() => buildModelCostRows(logs), [logs]);
  const columns = useMemo<ColumnsType<ModelCostRow>>(
    () => [
      {
        title: '模型',
        dataIndex: 'model',
        key: 'model',
        render: (model: string) => <Tag color="blue">{model}</Tag>,
      },
      {
        title: '请求数',
        dataIndex: 'requestCount',
        key: 'requestCount',
        width: 96,
      },
      {
        title: 'API 调用',
        dataIndex: 'apiCallCount',
        key: 'apiCallCount',
        width: 104,
      },
      {
        title: '总 Token',
        dataIndex: 'totalTokens',
        key: 'totalTokens',
        width: 120,
        render: (value: number) => formatTokenCount(value),
      },
      {
        title: '缓存命中',
        dataIndex: 'cachedPromptTokens',
        key: 'cachedPromptTokens',
        width: 120,
        render: (value: number) => formatTokenCount(value),
      },
      {
        title: '预估费用',
        dataIndex: 'estimatedCostUsd',
        key: 'estimatedCostUsd',
        width: 128,
        render: (value: number | null) =>
          value === null ? '-' : formatEstimatedCostUsd(value),
      },
    ],
    [],
  );

  const recentColumns = useMemo<ColumnsType<AiLog>>(
    () => [
      {
        title: '时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 170,
        render: (value: string) => new Date(value).toLocaleString('zh-CN'),
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 110,
        render: (type: AiLog['type']) => (
          <Tag color={type === 'summary' ? 'cyan' : 'green'}>
            {type === 'summary' ? '工单摘要' : '回复建议'}
          </Tag>
        ),
      },
      {
        title: '模型',
        dataIndex: 'model',
        key: 'model',
        ellipsis: true,
      },
      {
        title: 'Token',
        key: 'totalTokens',
        width: 110,
        render: (_, log) => formatTokenCount(getAiLogUsage(log).totalTokens),
      },
      {
        title: '缓存',
        key: 'cachedPromptTokens',
        width: 110,
        render: (_, log) =>
          formatTokenCount(getAiLogUsage(log).cachedPromptTokens),
      },
      {
        title: '费用',
        key: 'estimatedCostUsd',
        width: 120,
        render: (_, log) =>
          getAiLogUsage(log).estimatedCostUsd === null
            ? '-'
            : formatEstimatedCostUsd(getAiLogUsage(log).estimatedCostUsd ?? 0),
      },
    ],
    [],
  );

  if (!permissions.canViewAiCostDashboard) {
    return (
      <Flex vertical gap={20}>
        <Typography.Title level={2}>成本仪表盘</Typography.Title>
        <Card>
          <Typography.Text type="secondary">
            当前角色无权查看 AI token 和费用数据。需要管理员或现场工程师权限。
          </Typography.Text>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={20}>
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            <DollarCircleOutlined style={{ marginRight: 10 }} />
            成本仪表盘
          </Typography.Title>
          <Typography.Text type="secondary">
            AI 调用 token、缓存命中和预估费用
          </Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={() => void load()}
        >
          刷新
        </Button>
      </Flex>

      {error ? (
        <Card>
          <Typography.Text type="danger">{error}</Typography.Text>
        </Card>
      ) : null}

      {loading ? (
        <Row gutter={[20, 20]}>
          {[1, 2, 3, 4].map((i) => (
            <Col key={i} lg={6} md={12} xs={24}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          <Row gutter={[20, 20]}>
            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Typography.Text type="secondary">预估费用</Typography.Text>
                  <Statistic
                    value={
                      summary.estimatedCostUsd === null
                        ? '$0.000000'
                        : formatEstimatedCostUsd(summary.estimatedCostUsd)
                    }
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    当前日志范围内累计
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>

            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Typography.Text type="secondary">总 Token</Typography.Text>
                  <Statistic value={formatTokenCount(summary.totalTokens)} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    输入 + 输出
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>

            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Typography.Text type="secondary">API 调用</Typography.Text>
                  <Statistic
                    prefix={<ApiOutlined />}
                    value={summary.apiCallCount}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    含重试产生的真实调用
                  </Typography.Text>
                </Flex>
              </Card>
            </Col>

            <Col lg={6} md={12} xs={24}>
              <Card variant="borderless">
                <Flex vertical gap={8}>
                  <Typography.Text type="secondary">缓存命中率</Typography.Text>
                  <Statistic value={`${summary.cacheHitRate}%`} />
                  <Progress
                    percent={summary.cacheHitRate}
                    showInfo={false}
                    strokeColor="#10b981"
                  />
                </Flex>
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col lg={8} xs={24}>
              <Card title="Token 构成" variant="borderless">
                <Flex vertical gap={12}>
                  <UsageLine
                    color="#3b82f0"
                    label="输入 token"
                    value={summary.promptTokens}
                  />
                  <UsageLine
                    color="#10b981"
                    label="缓存命中"
                    value={summary.cachedPromptTokens}
                  />
                  <UsageLine
                    color="#f59e0b"
                    label="缓存未命中"
                    value={summary.cacheMissPromptTokens}
                  />
                  <UsageLine
                    color="#8b5cf6"
                    label="输出 token"
                    value={summary.completionTokens}
                  />
                  <UsageLine
                    color="#ec4899"
                    label="推理 token"
                    value={summary.reasoningTokens}
                  />
                </Flex>
              </Card>
            </Col>

            <Col lg={16} xs={24}>
              <Card title="按模型汇总" variant="borderless">
                {modelRows.length === 0 ? (
                  <Empty description="暂无 AI 调用成本数据" />
                ) : (
                  <Table
                    columns={columns}
                    dataSource={modelRows}
                    pagination={false}
                    rowKey="key"
                    scroll={{ x: 760 }}
                    size="middle"
                  />
                )}
              </Card>
            </Col>
          </Row>

          <Card
            extra={<Tag color="blue">{logs.length} 条日志</Tag>}
            title="最近调用"
            variant="borderless"
          >
            <Table
              columns={recentColumns}
              dataSource={logs}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              rowKey="id"
              scroll={{ x: 820 }}
              size="middle"
            />
          </Card>
        </>
      )}
    </Flex>
  );
}

function UsageLine({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <Flex align="center" justify="space-between" gap={12}>
      <Flex align="center" gap={8}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
        />
        <Typography.Text>{label}</Typography.Text>
      </Flex>
      <Typography.Text strong>{formatTokenCount(value)}</Typography.Text>
    </Flex>
  );
}
