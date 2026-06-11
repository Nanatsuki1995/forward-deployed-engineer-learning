import { Search } from 'lucide-react';
import { Button, Card, Empty, Input, Space, Tag, Typography } from 'antd';
import type { Ticket } from '../../api/client';
import { statusLabels } from '../../lib/workbench';

export function TicketQueue({
  query,
  selectedTicketId,
  tickets,
  onQueryChange,
  onSelectTicket,
}: {
  query: string;
  selectedTicketId?: string;
  tickets: Ticket[];
  onQueryChange: (query: string) => void;
  onSelectTicket: (ticketId: string) => void;
}) {
  return (
    <Card
      className="workbench-panel"
      id="tickets"
      title={
        <div className="panel-heading ticket-queue-heading">
          <div className="panel-title">
            <Typography.Text className="eyebrow">Work Order</Typography.Text>
            <Typography.Title level={3}>工单队列</Typography.Title>
          </div>
          <Input
            allowClear
            aria-label="搜索工单"
            className="ticket-search"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="搜索标题、标签、请求方"
            prefix={<Search size={16} />}
            value={query}
          />
        </div>
      }
    >
      <Space className="ticket-list" orientation="vertical" size={10}>
        {tickets.map((ticket) => (
          <Button
            block
            className={
              ticket.id === selectedTicketId ? 'ticket-row selected' : 'ticket-row'
            }
            key={ticket.id}
            onClick={() => onSelectTicket(ticket.id)}
          >
            <span className={`priority-dot ${ticket.priority}`} />
            <span className="ticket-copy">
              <strong>{ticket.title}</strong>
              <small>
                {ticket.requester} · {ticket.category}
              </small>
            </span>
            <Tag color={ticket.status === 'pending_approval' ? 'gold' : 'green'}>
              {statusLabels[ticket.status]}
            </Tag>
          </Button>
        ))}
        {!tickets.length ? <Empty description="没有匹配的工单" /> : null}
      </Space>
    </Card>
  );
}
