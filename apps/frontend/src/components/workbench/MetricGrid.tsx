import { Activity, FileText, ShieldCheck, TicketCheck } from 'lucide-react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import type { HealthResponse, User } from '../../api/client';
import { roleLabels, type RolePermissions } from '../../lib/workbench';

export function MetricGrid({
  documentsCount,
  health,
  isLoading,
  permissions,
  ticketsCount,
  user,
}: {
  documentsCount: number;
  health: HealthResponse | null;
  isLoading: boolean;
  permissions: RolePermissions;
  ticketsCount: number;
  user: User | null;
}) {
  return (
    <Row gutter={[14, 14]} id="infra">
      <MetricCard
        detail={health ? `v${health.version}` : 'NestJS API'}
        icon={<Activity size={18} />}
        label="后端健康"
        value={health?.status ?? (isLoading ? '检查中' : '离线')}
      />
      <MetricCard
        detail="Prisma + PostgreSQL 持久化"
        icon={<TicketCheck size={18} />}
        label="工单数量"
        value={ticketsCount}
      />
      <MetricCard
        detail={permissions.knowledgeMode}
        icon={<FileText size={18} />}
        label="知识文档"
        value={documentsCount}
      />
      <MetricCard
        detail={permissions.summary}
        icon={<ShieldCheck size={18} />}
        label="访问权限"
        value={user ? roleLabels[user.role] : '未登录'}
      />
    </Row>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <Col lg={6} md={12} xs={24}>
      <Card className="metric-card">
        <div className="metric-icon">{icon}</div>
        <Statistic title={label} value={value} />
        <Typography.Text type="secondary">{detail}</Typography.Text>
      </Card>
    </Col>
  );
}
