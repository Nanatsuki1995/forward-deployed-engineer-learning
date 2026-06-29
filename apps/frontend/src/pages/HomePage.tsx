import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Col, Row, Space, Spin, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type {
  AiLog,
  HealthResponse,
  KnowledgeDocument,
  Ticket,
  TicketStatus,
} from '../api/client';
import { useAuth } from '../auth/useAuth';
import { AuditLogPanel } from '../components/workbench/AuditLogPanel';
import { KnowledgePanel } from '../components/workbench/KnowledgePanel';
import { MetricGrid } from '../components/workbench/MetricGrid';
import { RoadmapPanel } from '../components/workbench/RoadmapPanel';
import { TicketDetail } from '../components/workbench/TicketDetail';
import { TicketQueue } from '../components/workbench/TicketQueue';
import { getErrorMessage, getRolePermissions } from '../lib/workbench';

export function HomePage() {
  const { logout, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissions = useMemo(
    () => getRolePermissions(user?.role),
    [user?.role],
  );

  const selectedTicket = useMemo(() => {
    return tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0];
  }, [selectedTicketId, tickets]);

  const filteredTickets = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return tickets;
    }

    return tickets.filter((ticket) => {
      return [
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.requester,
        ticket.assignee,
        ticket.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [query, tickets]);

  const latestAiLog = aiLogs.find((log) => log.ticketId === selectedTicket?.id);

  const loadWorkbench = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [healthResult, ticketResult, documentResult, logResult] =
        await Promise.all([
          api.health(),
          api.tickets(),
          api.knowledge(),
          permissions.canViewAiCostDashboard ? api.aiLogs() : Promise.resolve([]),
        ]);

      setHealth(healthResult);
      setTickets(ticketResult);
      setDocuments(documentResult);
      setAiLogs(logResult);
      setSelectedTicketId((current) => current || ticketResult[0]?.id || '');
    } catch (requestError) {
      setError(getErrorMessage(requestError, '无法连接后端服务'));

      if (!api.hasStoredSession()) {
        await logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, permissions.canViewAiCostDashboard]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkbench();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWorkbench]);

  async function generateReplySuggestion() {
    if (!selectedTicket || !permissions.canGenerateAi) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const log = await api.createReplySuggestion(selectedTicket.id);
      setAiLogs((currentLogs) => [log, ...currentLogs]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'AI 建议生成失败'));
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateSummary() {
    if (!selectedTicket || !permissions.canGenerateAi) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const log = await api.createSummary(selectedTicket.id);
      setAiLogs((currentLogs) => [log, ...currentLogs]);
    } catch (requestError) {
      setError(getErrorMessage(requestError, '工单摘要生成失败'));
    } finally {
      setIsGenerating(false);
    }
  }

  async function updateTicketStatus(status: TicketStatus) {
    if (!selectedTicket || selectedTicket.status === status) {
      return;
    }

    if (
      selectedTicket.status === 'pending_approval' &&
      status === 'resolved' &&
      !permissions.canReviewApproval
    ) {
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const updatedTicket = await api.updateTicketStatus(selectedTicket.id, status);
      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === updatedTicket.id ? updatedTicket : ticket,
        ),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, '状态更新失败'));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function uploadKnowledgeDocument(input: {
    file: File;
    source?: string;
    title?: string;
  }): Promise<boolean> {
    if (!permissions.canManageKnowledge) {
      return false;
    }

    setIsUploadingKnowledge(true);
    setError(null);

    try {
      const document = await api.uploadKnowledgeDocument(input);
      setDocuments((currentDocuments) => [
        document,
        ...currentDocuments.filter((item) => item.id !== document.id),
      ]);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, '知识文档上传失败'));
      return false;
    } finally {
      setIsUploadingKnowledge(false);
    }
  }

  return (
    <Space className="home-page" direction="vertical" size={20}>
      <header className="topbar">
        <div>
          <Typography.Text className="eyebrow">
            Forward Deployed AI Engineer
          </Typography.Text>
          <Typography.Title level={1}>
            把工单系统升级成可追踪的 AI 业务流
          </Typography.Title>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={isLoading}
          onClick={() => void loadWorkbench()}
          type="primary"
          size="large"
        >
          刷新
        </Button>
      </header>

      {error ? <Alert showIcon message={error} type="error" closable /> : null}

      <MetricGrid
        documentsCount={documents.length}
        health={health}
        isLoading={isLoading}
        permissions={permissions}
        ticketsCount={tickets.length}
        user={user}
      />

      {isLoading && !tickets.length ? (
        <section className="initial-loading">
          <Spin tip="正在加载工作台" size="large" />
        </section>
      ) : null}

      <Row gutter={[20, 20]}>
        <Col lg={9} xs={24}>
          <TicketQueue
            query={query}
            selectedTicketId={selectedTicket?.id}
            tickets={filteredTickets}
            onQueryChange={setQuery}
            onSelectTicket={setSelectedTicketId}
          />
        </Col>
        <Col lg={15} xs={24}>
          <TicketDetail
            isGenerating={isGenerating}
            isUpdatingStatus={isUpdatingStatus}
            latestAiLog={latestAiLog}
            permissions={permissions}
            ticket={selectedTicket}
            onGenerateReply={() => void generateReplySuggestion()}
            onGenerateSummary={() => void generateSummary()}
            onStatusChange={(status) => void updateTicketStatus(status)}
          />
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col lg={12} xs={24}>
          <KnowledgePanel
            documents={documents}
            isUploading={isUploadingKnowledge}
            permissions={permissions}
            onUpload={(input) => uploadKnowledgeDocument(input)}
          />
        </Col>
        <Col lg={12} xs={24}>
          <RoadmapPanel />
        </Col>
      </Row>

      {permissions.canViewAuditLogs && (
        <Row gutter={[20, 20]}>
          <Col span={24}>
            <AuditLogPanel />
          </Col>
        </Row>
      )}
    </Space>
  );
}
