import {
  CheckCircleOutlined,
  DashboardOutlined,
  ReloadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Input,
  Row,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiLog, Ticket, TicketStatus } from '../api/client';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { MarkdownViewer } from '../components/MarkdownViewer';
import {
  getErrorMessage,
  getRolePermissions,
  priorityLabels,
  statusLabels,
  ticketStatuses,
} from '../lib/workbench';

export function TicketsPage() {
  const { logout, user } = useAuth();
  const permissions = getRolePermissions(user?.role);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? tickets[0],
    [selectedId, tickets],
  );

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return tickets;
    return tickets.filter((t) =>
      [t.title, t.description, t.category, t.requester, t.assignee, ...t.tags]
        .join(' ')
        .toLowerCase()
        .includes(kw),
    );
  }, [query, tickets]);

  const latestAiLog = aiLogs.find((l) => l.ticketId === selected?.id);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, l] = await Promise.all([
        api.tickets(),
        permissions.canViewAiCostDashboard ? api.aiLogs() : Promise.resolve([]),
      ]);
      setTickets(t);
      setAiLogs(l);
      if (!selectedId) setSelectedId(t[0]?.id ?? '');
    } catch (e) {
      setError(getErrorMessage(e, '加载失败'));
      if (!api.hasStoredSession()) await logout();
    } finally {
      setLoading(false);
    }
  }, [logout, permissions.canViewAiCostDashboard, selectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateStatus(status: TicketStatus) {
    if (!selected || selected.status === status) return;
    if (selected.status === 'pending_approval' && status === 'resolved' && !permissions.canReviewApproval) return;
    setUpdatingStatus(true);
    setError(null);
    try {
      const updated = await api.updateTicketStatus(selected.id, status);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError(getErrorMessage(e, '状态更新失败'));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function generateReply() {
    if (!selected || !permissions.canGenerateAi) return;
    setGenerating(true);
    setError(null);
    try {
      const log = await api.createReplySuggestion(selected.id);
      setAiLogs((prev) => [log, ...prev]);
    } catch (e) {
      setError(getErrorMessage(e, 'AI 建议生成失败'));
    } finally {
      setGenerating(false);
    }
  }

  async function generateSummary() {
    if (!selected || !permissions.canGenerateAi) return;
    setGenerating(true);
    setError(null);
    try {
      const log = await api.createSummary(selected.id);
      setAiLogs((prev) => [log, ...prev]);
    } catch (e) {
      setError(getErrorMessage(e, '摘要生成失败'));
    } finally {
      setGenerating(false);
    }
  }

  if (loading && !tickets.length) {
    return (
      <Flex vertical gap={16}>
        <Typography.Title level={2}>工单管理</Typography.Title>
        <Spin tip="加载中..." />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={16}>
      {/* Page header */}
      <Flex align="center" justify="space-between" wrap gap={8}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>工单管理</Typography.Title>
          <Typography.Text type="secondary">{tickets.length} 个工单</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
      </Flex>

      {error && <Alert showIcon message={error} type="error" closable onClose={() => setError(null)} />}

      <Row gutter={16}>
        {/* Left — ticket list */}
        <Col lg={9} xs={24}>
          <Card styles={{ body: { padding: 0 } }}>
            <div style={{ padding: '12px 16px' }}>
              <Input
                allowClear
                placeholder="搜索工单..."
                prefix={<SearchOutlined />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 'calc(100vh - 260px)', overflow: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Empty description="没有匹配的工单" />
                </div>
              ) : (
                filtered.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedId(ticket.id)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 16px',
                      background: ticket.id === selected?.id ? '#eff6ff' : undefined,
                      borderLeft: ticket.id === selected?.id ? '3px solid #3b82f0' : '3px solid transparent',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.12s',
                    }}
                  >
                    <Flex vertical gap={2}>
                      <Flex justify="space-between" align="center" gap={8}>
                        <Typography.Text strong ellipsis style={{ flex: 1, minWidth: 0 }}>
                          {ticket.title}
                        </Typography.Text>
                        <Tag
                          color={ticket.status === 'pending_approval' ? 'gold' : 'blue'}
                          style={{ fontSize: 11, margin: 0, flexShrink: 0 }}
                        >
                          {statusLabels[ticket.status]}
                        </Tag>
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {ticket.requester} · {ticket.category} · <span className={`priority-dot ${ticket.priority}`} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                      </Typography.Text>
                    </Flex>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>

        {/* Right — ticket detail (all in one card) */}
        <Col lg={15} xs={24}>
          {!selected ? (
            <Card><Empty description="请选择一个工单" /></Card>
          ) : (
            <Card
              title={
                <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                  <Typography.Title level={4} ellipsis style={{ margin: 0, flex: 1, minWidth: 0 }}>
                    {selected.title}
                  </Typography.Title>
                  <Tag color="blue" style={{ flexShrink: 0 }}>{statusLabels[selected.status]}</Tag>
                </Flex>
              }
            >
              {/* Description + metadata */}
              <Typography.Paragraph style={{ color: '#334155', lineHeight: 1.75, marginBottom: 12 }}>
                {selected.description}
              </Typography.Paragraph>

              <Descriptions bordered column={{ lg: 4, md: 2, xs: 1 }} size="small">
                <Descriptions.Item label="优先级">{priorityLabels[selected.priority]}</Descriptions.Item>
                <Descriptions.Item label="请求方">{selected.requester}</Descriptions.Item>
                <Descriptions.Item label="负责人">{selected.assignee}</Descriptions.Item>
                <Descriptions.Item label="分类">{selected.category}</Descriptions.Item>
              </Descriptions>

              {selected.tags.length > 0 && (
                <Flex gap={4} wrap="wrap" style={{ marginTop: 12 }}>
                  {selected.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                </Flex>
              )}

              <Divider style={{ margin: '16px 0' }} />

              {/* Status workflow */}
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                工作流状态
              </Typography.Text>
              <Segmented
                block
                disabled={updatingStatus || !permissions.canUpdateTicketStatus}
                onChange={(v) => updateStatus(v as TicketStatus)}
                options={ticketStatuses.map((s) => ({
                  label: statusLabels[s],
                  value: s,
                  disabled: s === selected.status ||
                    (selected.status === 'pending_approval' && s === 'resolved' && !permissions.canReviewApproval),
                }))}
                value={selected.status}
              />
              {selected.status === 'pending_approval' && (
                <Alert
                  showIcon
                  style={{ marginTop: 10 }}
                  icon={permissions.canReviewApproval ? <SafetyCertificateOutlined /> : <WarningOutlined />}
                  message={
                    permissions.canReviewApproval
                      ? '你可以复核并通过此工单。'
                      : '仅审核人可确认此工单。'
                  }
                  type={permissions.canReviewApproval ? 'success' : 'warning'}
                />
              )}

              <Divider style={{ margin: '16px 0' }} />

              {/* AI Actions */}
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                AI 操作
              </Typography.Text>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  loading={generating}
                  disabled={!permissions.canGenerateAi}
                  onClick={() => void generateReply()}
                >
                  生成回复建议
                </Button>
                <Button
                  icon={<DashboardOutlined />}
                  loading={generating}
                  disabled={!permissions.canGenerateAi}
                  onClick={() => void generateSummary()}
                >
                  生成摘要
                </Button>
              </Space>

              {/* AI output */}
              {latestAiLog ? (
                <Flex vertical gap={8} style={{ marginTop: 14 }}>
                  <Flex align="center" gap={8}>
                    <CheckCircleOutlined style={{ color: '#3b82f0' }} />
                    <Typography.Text strong>
                      {latestAiLog.type === 'summary' ? '工单摘要' : '回复建议'}
                    </Typography.Text>
                    <Tag color="blue">置信度 {Math.round(latestAiLog.confidence * 100)}%</Tag>
                  </Flex>
                  <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <MarkdownViewer content={latestAiLog.result} />
                  </div>
                  <Space wrap size={4}>
                    {latestAiLog.citations.map((c) => <Tag key={c}>{c}</Tag>)}
                  </Space>
                </Flex>
              ) : (
                <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                  选择工单后生成 AI 建议。当前为本地模拟 LLM。
                </Typography.Text>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </Flex>
  );
}
