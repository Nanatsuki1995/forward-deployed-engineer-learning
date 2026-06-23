import { Bot, CheckCircle2, Gauge, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MarkdownViewer } from '../MarkdownViewer';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { AiLog, Ticket, TicketStatus } from '../../api/client';
import {
  priorityLabels,
  statusLabels,
  ticketStatuses,
  type RolePermissions,
} from '../../lib/workbench';

export function TicketDetail({
  isGenerating,
  isUpdatingStatus,
  latestAiLog,
  permissions,
  ticket,
  onGenerateReply,
  onGenerateSummary,
  onStatusChange,
}: {
  isGenerating: boolean;
  isUpdatingStatus: boolean;
  latestAiLog?: AiLog;
  permissions: RolePermissions;
  ticket?: Ticket;
  onGenerateReply: () => void;
  onGenerateSummary: () => void;
  onStatusChange: (status: TicketStatus) => void;
}) {
  if (!ticket) {
    return (
      <Card className="workbench-panel">
        <Empty description="暂无工单数据" />
      </Card>
    );
  }

  const canResolveApproval =
    ticket.status !== 'pending_approval' || permissions.canReviewApproval;
  const latestAiLogLabel =
    latestAiLog?.type === 'summary' ? '工单摘要' : '回复建议';

  return (
    <Card
      className="workbench-panel"
      title={
        <div>
          <Typography.Text className="eyebrow">Ticket Detail</Typography.Text>
          <Typography.Title level={3}>{ticket.title}</Typography.Title>
        </div>
      }
      extra={<Tag color="green">{statusLabels[ticket.status]}</Tag>}
    >
      <Typography.Paragraph className="ticket-description">
        {ticket.description}
      </Typography.Paragraph>

      <Descriptions bordered column={{ lg: 4, md: 2, xs: 1 }} size="small">
        <Descriptions.Item label="优先级">
          {priorityLabels[ticket.priority]}
        </Descriptions.Item>
        <Descriptions.Item label="请求方">{ticket.requester}</Descriptions.Item>
        <Descriptions.Item label="负责人">{ticket.assignee}</Descriptions.Item>
        <Descriptions.Item label="分类">{ticket.category}</Descriptions.Item>
      </Descriptions>

      <Space className="tag-row" wrap>
        {ticket.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>

      <section className="status-controls">
        <Typography.Text className="eyebrow">Workflow</Typography.Text>
        <Segmented
          block
          disabled={isUpdatingStatus || !permissions.canUpdateTicketStatus}
          onChange={(value) => onStatusChange(value as TicketStatus)}
          options={ticketStatuses.map((status) => ({
            label: statusLabels[status],
            value: status,
            disabled:
              status === ticket.status ||
              (ticket.status === 'pending_approval' &&
                status === 'resolved' &&
                !permissions.canReviewApproval),
          }))}
          value={ticket.status}
        />
      </section>

      {ticket.status === 'pending_approval' ? (
        <Alert
          className="permission-callout"
          icon={
            canResolveApproval ? (
              <ShieldCheck size={18} />
            ) : (
              <ShieldAlert size={18} />
            )
          }
          title={
            canResolveApproval
              ? '当前角色可以复核待审核工单并推进状态。'
              : '当前角色只能查看待审核工单，不能代替审核人确认。'
          }
          showIcon
          type={canResolveApproval ? 'success' : 'warning'}
        />
      ) : null}

      <Space className="ai-actions" id="ai" wrap>
        <Button
          disabled={!permissions.canGenerateAi}
          icon={<Bot size={18} />}
          loading={isGenerating}
          onClick={onGenerateReply}
          type="primary"
        >
          生成 AI 回复建议
        </Button>
        <Button
          disabled={!permissions.canGenerateAi}
          icon={<Gauge size={18} />}
          loading={isGenerating}
          onClick={onGenerateSummary}
        >
          生成工单摘要
        </Button>
      </Space>

      <section className="ai-output">
        <Space align="center" wrap>
          <CheckCircle2 size={18} />
          <Typography.Title level={4}>最近 AI 输出</Typography.Title>
          {latestAiLog ? <Tag color="green">{latestAiLogLabel}</Tag> : null}
        </Space>
        {latestAiLog ? (
          <>
            <MarkdownViewer content={latestAiLog.result} />
            <Row gutter={[8, 8]}>
              <Col>
                <Tag color="green">
                  置信度 {Math.round(latestAiLog.confidence * 100)}%
                </Tag>
              </Col>
              {latestAiLog.citations.map((citation) => (
                <Col key={citation}>
                  <Tag>{citation}</Tag>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <Typography.Text type="secondary">
            选择工单后点击生成。当前为本地模拟 LLM，后续替换为真实模型 API 和
            RAG。
          </Typography.Text>
        )}
      </section>
    </Card>
  );
}
