import {
  Activity,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  RefreshCw,
  Search,
  ShieldCheck,
  TicketCheck,
  UploadCloud,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { api } from './api/client';
import type {
  AiLog,
  HealthResponse,
  KnowledgeDocument,
  Ticket,
  TicketPriority,
  TicketStatus,
  User,
} from './api/client';

const statusLabels: Record<TicketStatus, string> = {
  new: '新建',
  triage: '分诊',
  in_progress: '处理中',
  pending_approval: '待审核',
  resolved: '已解决',
};

const priorityLabels: Record<TicketPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急',
};

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkbench();
  }, []);

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

  const latestAiLog = aiLogs.find(
    (log) => log.ticketId === selectedTicket?.id && log.type === 'reply_suggestion',
  );

  async function loadWorkbench() {
    setIsLoading(true);
    setError(null);
    try {
      const loginResult = await api.login({
        email: 'agent@example.com',
        password: 'password123',
      });
      const [healthResult, userResult, ticketResult, documentResult, logResult] =
        await Promise.all([
          api.health(),
          api.me(),
          api.tickets(),
          api.knowledge(),
          api.aiLogs(),
        ]);

      setHealth(healthResult);
      setUser(userResult ?? loginResult.user);
      setTickets(ticketResult);
      setDocuments(documentResult);
      setAiLogs(logResult);
      setSelectedTicketId((current) => current || ticketResult[0]?.id || '');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '无法连接后端服务',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function generateReplySuggestion() {
    if (!selectedTicket) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const log = await api.createReplySuggestion(selectedTicket.id);
      setAiLogs((currentLogs) => [log, ...currentLogs]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'AI 建议生成失败',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateSummary() {
    if (!selectedTicket) {
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const log = await api.createSummary(selectedTicket.id);
      setAiLogs((currentLogs) => [log, ...currentLogs]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '工单摘要生成失败',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="学习路线导航">
        <div className="brand">
          <div className="brand-mark">FDE</div>
          <div>
            <strong>AI 工单助手</strong>
            <span>React + NestJS 学习项目</span>
          </div>
        </div>

        <nav className="nav-list">
          <a className="nav-item active" href="#tickets">
            <TicketCheck size={18} />
            工单工作台
          </a>
          <a className="nav-item" href="#knowledge">
            <FileText size={18} />
            知识库
          </a>
          <a className="nav-item" href="#ai">
            <Bot size={18} />
            AI 调用记录
          </a>
          <a className="nav-item" href="#infra">
            <Database size={18} />
            部署基础
          </a>
        </nav>

        <div className="operator-card">
          <Users size={18} />
          <div>
            <span>当前角色</span>
            <strong>{user ? `${user.name} / ${user.role}` : '未连接'}</strong>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Forward Deployed AI Engineer</p>
            <h1>把工单系统升级成可追踪的 AI 业务流</h1>
          </div>
          <button className="icon-button" onClick={loadWorkbench} type="button">
            <RefreshCw size={18} />
            刷新
          </button>
        </header>

        {error ? <div className="alert">{error}</div> : null}

        <section className="metric-grid" id="infra">
          <Metric
            icon={<Activity size={18} />}
            label="后端健康"
            value={health?.status ?? (isLoading ? '检查中' : '离线')}
            detail={health ? `v${health.version}` : 'NestJS API'}
          />
          <Metric
            icon={<TicketCheck size={18} />}
            label="工单数量"
            value={String(tickets.length)}
            detail="Prisma + PostgreSQL 持久化"
          />
          <Metric
            icon={<FileText size={18} />}
            label="知识文档"
            value={String(documents.length)}
            detail="后续接入上传、切片、embedding"
          />
          <Metric
            icon={<ShieldCheck size={18} />}
            label="控制面"
            value="人工确认"
            detail="高风险动作先不自动执行"
          />
        </section>

        <section className="content-grid">
          <div className="panel ticket-panel" id="tickets">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Work Order</p>
                <h2>工单队列</h2>
              </div>
              <div className="search-box">
                <Search size={16} />
                <input
                  aria-label="搜索工单"
                  placeholder="搜索标题、标签、请求方"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="ticket-list">
              {filteredTickets.map((ticket) => (
                <button
                  className={
                    ticket.id === selectedTicket?.id
                      ? 'ticket-row selected'
                      : 'ticket-row'
                  }
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  type="button"
                >
                  <span className={`priority-dot ${ticket.priority}`} />
                  <span>
                    <strong>{ticket.title}</strong>
                    <small>
                      {ticket.requester} · {ticket.category}
                    </small>
                  </span>
                  <em>{statusLabels[ticket.status]}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="panel detail-panel">
            {selectedTicket ? (
              <>
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Ticket Detail</p>
                    <h2>{selectedTicket.title}</h2>
                  </div>
                  <span className={`status-pill ${selectedTicket.status}`}>
                    {statusLabels[selectedTicket.status]}
                  </span>
                </div>

                <p className="description">{selectedTicket.description}</p>

                <div className="fact-grid">
                  <Fact label="优先级" value={priorityLabels[selectedTicket.priority]} />
                  <Fact label="请求方" value={selectedTicket.requester} />
                  <Fact label="负责人" value={selectedTicket.assignee} />
                  <Fact label="分类" value={selectedTicket.category} />
                </div>

                <div className="tag-row">
                  {selectedTicket.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="ai-actions" id="ai">
                  <button
                    disabled={isGenerating}
                    onClick={generateReplySuggestion}
                    type="button"
                  >
                    <Bot size={18} />
                    生成 AI 回复建议
                  </button>
                  <button
                    className="secondary"
                    disabled={isGenerating}
                    onClick={generateSummary}
                    type="button"
                  >
                    <Gauge size={18} />
                    生成工单摘要
                  </button>
                </div>

                <section className="ai-output">
                  <div className="section-title">
                    <CheckCircle2 size={18} />
                    <h3>最近 AI 建议</h3>
                  </div>
                  {latestAiLog ? (
                    <>
                      <pre>{latestAiLog.result}</pre>
                      <div className="citation-row">
                        <span>置信度 {Math.round(latestAiLog.confidence * 100)}%</span>
                        {latestAiLog.citations.map((citation) => (
                          <span key={citation}>{citation}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-copy">
                      选择工单后点击生成。当前为本地模拟 LLM，后续替换为真实模型 API 和 RAG。
                    </p>
                  )}
                </section>
              </>
            ) : (
              <p className="empty-copy">暂无工单数据。</p>
            )}
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel" id="knowledge">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Knowledge Base</p>
                <h2>知识库索引</h2>
              </div>
              <UploadCloud size={20} />
            </div>
            <div className="document-list">
              {documents.map((document) => (
                <article key={document.id} className="document-row">
                  <div>
                    <strong>{document.title}</strong>
                    <span>{document.source}</span>
                  </div>
                  <em>{document.chunks} chunks</em>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Learning Backlog</p>
                <h2>下一批能力</h2>
              </div>
            </div>
            <ul className="roadmap-list">
              <li>DTO 参数校验、Swagger API 文档和统一错误格式</li>
              <li>refresh token、退出登录和权限感知 UI</li>
              <li>文件上传、文档解析、向量检索和引用来源</li>
              <li>Redis 队列、后台任务、日志、健康检查和 Docker 部署</li>
            </ul>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
