# Forward Deployed Engineer Learning Workspace

一个完整的 AI 工单助手全栈项目，涵盖前端、后端、基础设施、向量搜索、审计日志和 Docker 生产部署。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19, TypeScript, Vite, Ant Design 6, React Router 7 |
| 后端 | NestJS 11, TypeScript, Prisma 7, BullMQ |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7 |
| 向量搜索 | 可插拔 Embedding 提供者（本地确定性 / OpenAI 兼容） |
| 鉴权 | JWT access token + refresh token 会话轮换, bcryptjs, RBAC |
| 审计 | 操作审计日志（自动拦截 + 批量写入） |
| 校验 | class-validator DTO 严格模式, 统一错误格式 |
| API 文档 | Swagger (OpenAPI) |
| 容器化 | Docker 多阶段构建 + Docker Compose 生产部署 |
| CI/CD | GitHub Actions |
| 测试 | Vitest (前端), Jest + Supertest (后端) |

## 项目结构

```text
.
├── .github/workflows/ci.yml        # CI/CD pipeline
├── apps
│   ├── frontend                     # React 工作台
│   │   ├── src/
│   │   │   ├── api/client.ts        # API 客户端（JWT 自动刷新）
│   │   │   ├── auth/                # 认证上下文、Hook
│   │   │   ├── components/          # UI 组件
│   │   │   ├── pages/               # 登录、仪表盘、工单、知识库、审计等页面
│   │   │   └── lib/                 # 权限、工具函数
│   │   ├── Dockerfile               # 多阶段构建 (Vite → Nginx)
│   │   └── nginx.conf               # 生产 Nginx 配置
│   └── backend                      # NestJS API
│       ├── src/
│       │   ├── ai/                  # AI 回复建议、摘要生成
│       │   ├── audit/               # 审计日志服务、拦截器、控制器
│       │   ├── auth/                # JWT 鉴权、RBAC、字段级权限
│       │   ├── embedding/           # 可插拔 Embedding 提供者
│       │   ├── jobs/                # BullMQ 队列、Worker、索引服务
│       │   ├── knowledge/           # 知识库 CRUD、上传、向量搜索
│       │   ├── prisma/              # Prisma 数据库服务
│       │   ├── rate-limit/          # Redis 固定窗口限流
│       │   ├── redis/               # Redis 连接与缓存服务
│       │   └── tickets/             # 工单 CRUD、操作回放
│       ├── prisma/                  # Schema、迁移、种子数据
│       └── Dockerfile               # 多阶段构建 (NestJS → 生产运行)
├── docker-compose.yml               # 本地开发基础设施
├── docker-compose.prod.yml          # 生产全栈部署
├── .dockerignore
└── package.json                     # pnpm workspace
```

## 快速启动

### 环境要求

- **Node.js** >= 22
- **pnpm** >= 10
- **Docker**（运行 PostgreSQL 和 Redis）

> **macOS 用户：** 如果未安装 Docker Desktop，推荐使用 [Colima](https://github.com/abiosoft/colima) 作为 Docker 运行时：
> ```bash
> brew install colima docker
> colima start --cpu 2 --memory 4
> ```

### 本地开发

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp apps/backend/.env.example apps/backend/.env
# 编辑 .env，设置 JWT_SECRET 为强随机值

# 确保 Docker 已启动（Docker Desktop 或 colima start）
docker ps

# 启动基础设施
pnpm infra:up

# 初始化数据库
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 启动开发服务器（两个终端）
pnpm dev:backend     # → http://localhost:3000
pnpm dev:frontend    # → http://localhost:5173
```

| 服务 | URL |
|------|-----|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3000/api |
| Swagger 文档 | http://localhost:3000/api/docs |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

### 演示账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | `admin@example.com` | `password123` |
| 交付工程师 | `agent@example.com` | `password123` |
| 审核人 | `reviewer@example.com` | `password123` |

### 关闭

```bash
pnpm infra:down
```

## 生产部署

### Docker Compose 一键部署

```bash
# 1. 创建生产环境变量
cp apps/backend/.env.example .env
# 编辑 .env，设置 JWT_SECRET、POSTGRES_PASSWORD 等生产值

# 2. 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d

# 3. 运行数据库迁移
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 4. （可选）填充种子数据
docker compose -f docker-compose.prod.yml exec backend npx prisma db seed

# 5. 访问 http://localhost
```

### 手动构建 Docker 镜像

```bash
pnpm docker:build:backend    # → fde-backend
pnpm docker:build:frontend   # → fde-frontend
pnpm docker:build            # 同时构建两个
```

## CI/CD

[GitHub Actions](.github/workflows/ci.yml) 在每次 PR 和 main 分支 push 时自动运行：

- **Lint** — ESLint (前端 + 后端)
- **Test** — Vitest (前端) + Jest (后端) + E2E (Supertest)
- **Build** — TypeScript 编译 + Vite 生产构建
- **Docker 构建验证** — 验证两个 Docker 镜像可成功构建（main 分支 push 时）

## API 参考

### 鉴权

```text
POST   /api/auth/login         邮箱密码登录
POST   /api/auth/register      注册交付工程师账号（当前默认 AGENT，公网部署前需收紧）
POST   /api/auth/refresh       轮换 refresh token
POST   /api/auth/logout        注销会话
GET    /api/auth/me            获取当前用户信息
```

### 工单

```text
GET    /api/tickets            查询工单列表
GET    /api/tickets/:id        查询单个工单
POST   /api/tickets            创建工单
PATCH  /api/tickets/:id/status 更新工单状态
POST   /api/tickets/:id/replay 操作回放（管理员）
```

### 知识库

```text
GET    /api/knowledge          查询知识库文档列表（缓存）
GET    /api/knowledge/search   向量语义搜索知识库
POST   /api/knowledge          手工录入知识文档
POST   /api/knowledge/upload   上传 Markdown/TXT 文件
```

### AI

```text
POST   /api/ai/tickets/:ticketId/reply-suggestion  生成 AI 回复建议
POST   /api/ai/tickets/:ticketId/summary           生成工单摘要
GET    /api/ai/logs                                查询 AI 调用日志与成本统计（admin / agent）
```

### 系统

```text
GET    /api/health             健康检查（无需登录）
GET    /api/audit-logs         审计日志（管理员）
```

除 `/api/health`、`/api/auth/login`、`/api/auth/register`、`/api/auth/refresh`、`/api/auth/logout` 和 `/api/tickets/public` 外，业务接口需要 `Authorization: Bearer <accessToken>`。角色和字段权限由后端守卫与拦截器执行，前端隐藏按钮只提供 UX 约束。

## RBAC 与字段级权限

### 角色能力矩阵

| 能力 | admin | agent | reviewer |
|------|:-----:|:-----:|:--------:|
| 创建工单 | ✓ | ✓ | — |
| 上传知识文档 | ✓ | ✓ | — |
| 生成 AI 建议 | ✓ | ✓ | ✓ |
| 更新工单状态 | ✓ | ✓ | ✓ |
| 审核确认 | ✓ | — | ✓ |
| 查看成本仪表盘 | ✓ | ✓ | — |
| 查看审计日志 | ✓ | — | — |
| 操作回放 | ✓ | — | — |

### 字段级权限（reviewer 示例）

| 字段 | 可读 | 可写 |
|------|:---:|:---:|
| title, description, category | ✓ | — |
| status, priority | ✓ | ✓ (仅 status) |
| createdAt, updatedAt | ✓ | — |
| assignee, tags, requester | — | — |

`admin` 和 `agent` 可读写全部字段。字段级权限通过 `FieldPermissionsInterceptor` 在响应中自动过滤。

## 环境变量

完整配置见 `apps/backend/.env.example`：

```text
# 基础
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://fde:fde_password@localhost:5432/ai_ticket_assistant

# Redis
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
REDIS_CONNECT_TIMEOUT_MS=500

# 限流
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW_SECONDS=60

# 知识库索引
KNOWLEDGE_INDEXING_CONCURRENCY=2

# Embedding
EMBEDDING_PROVIDER=local        # local | openai
EMBEDDING_DIMENSIONS=16         # local: 16, openai: 1536
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# JWT 鉴权
JWT_SECRET=replace-me-in-local-env
JWT_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN_DAYS=7

# 审计日志
AUDIT_LOG_ENABLED=true

# AI 模型
AI_PROVIDER=mock                   # mock | deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

# AI 成本监控（可选：覆盖默认美元 / 百万 token 单价）
AI_COST_CACHE_HIT_INPUT_PER_MILLION_USD=
AI_COST_CACHE_MISS_INPUT_PER_MILLION_USD=
AI_COST_OUTPUT_PER_MILLION_USD=
```

## Embedding 提供者

向量搜索支持两种 Embedding 后端，通过 `EMBEDDING_PROVIDER` 环境变量切换：

| 提供者 | 维度 | 说明 |
|--------|:---:|------|
| `local`（默认） | 16 | 确定性哈希 embedding，无需外部依赖，适合开发和演示 |
| `openai` | 1536 | 调用 OpenAI 兼容 API，需要配置 `OPENAI_API_KEY` |

切换 provider 后，需要重新上传知识文档以生成新维度的 embedding。搜索端点 `GET /api/knowledge/search?q=...&limit=5` 使用余弦相似度对所有分片进行排序。

## 知识库索引流程

```
上传文档 → 创建 processing 文档 → 入队/同步降级
                                    ↓
          normalizeMarkdown → splitIntoChunks → EmbeddingService.embed
                                    ↓
          Prisma 事务（删除旧分片 → 更新文档状态 → 创建新分片）→ 刷新缓存
```

- 格式支持：`.md`, `.markdown`, `.txt`（最大 1MB）
- 分片策略：按段落贪心合并，单片上限 480 字符
- 异步处理：BullMQ + Redis 队列，失败自动降级为同步索引
- 缓存：`GET /api/knowledge` 30 秒 Redis 缓存

## 审计日志

所有业务操作自动记录到 `AuditLog` 表：

| 操作类型 | 说明 |
|---------|------|
| `VIEW` | GET 请求（查看工单、知识库、AI 日志） |
| `CREATE` | POST 请求（创建工单、上传知识文档） |
| `UPDATE` | PATCH/PUT 请求（更新状态等） |
| `AI_GENERATE` | AI 回复建议和摘要生成 |

每条审计日志记录操作者（ID、姓名、角色）、操作类型、资源类型和 ID、HTTP 方法和路径。批量写入（5 秒间隔或 50 条触发），不影响业务请求性能。管理员可通过 `GET /api/audit-logs` 查询和筛选。

## 操作回放

管理员可通过 `POST /api/tickets/:id/replay` 传入 `{ "until": "ISO timestamp" }` 生成指定时间点的工单快照。当前实现依赖审计日志中的变更元数据，但现有 HTTP 审计主要记录请求元数据，不能视为可靠的事件溯源或历史恢复能力；详见下方架构任务清单。

## 数据模型

```text
User              用户（admin/agent/reviewer）
RefreshToken      JWT 刷新令牌（bcrypt 哈希存储）
Ticket            工单（状态、优先级、分类、标签）
TicketMessage     工单消息（请求者/工程师/系统）
KnowledgeDocument 知识文档（手工录入或文件上传）
KnowledgeChunk    知识分片（含 embedding 向量）
AiLog             AI 调用日志（含操作者追踪、token 用量、预估成本）
AuditLog          审计日志（操作者、操作类型、资源、时间）
```

Prisma schema：[`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma)

迁移文件：
- `20260611000000_init` — 核心表
- `20260611130000_add_refresh_tokens` — Refresh Token 轮换
- `20260616093000_add_knowledge_chunks` — 知识库分片与 embedding
- `20260623000000_add_audit_logs` — 审计日志与 AiLog 操作者追踪
- `20260629000000_add_ai_cost_monitoring` — AiLog token 用量、缓存命中、API 调用次数和预估成本

## 脚本参考

| 脚本 | 说明 |
|------|------|
| `pnpm dev:frontend` | 启动 Vite 开发服务器 |
| `pnpm dev:backend` | 启动 NestJS 开发服务器 |
| `pnpm build` | 构建前后端 |
| `pnpm lint` | ESLint 检查 |
| `pnpm test` | 运行全部测试 |
| `pnpm test:frontend` | 前端测试 |
| `pnpm test:backend` | 后端单元测试 |
| `pnpm test:e2e:backend` | 后端 E2E 测试 |
| `pnpm infra:up` | 启动 PostgreSQL + Redis |
| `pnpm infra:down` | 停止基础设施 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate` | 开发迁移 |
| `pnpm db:deploy` | 生产迁移 |
| `pnpm db:seed` | 填充种子数据 |
| `pnpm docker:build` | 构建 Docker 镜像 |
| `pnpm docker:up` | 启动生产栈 |
| `pnpm docker:down` | 停止生产栈 |

## 当前架构状态与任务清单

当前版本是“模块化单体 + 单进程 Worker”的 MVP 架构：NestJS API、BullMQ 知识索引 Worker 和进程内 SSE 通知运行在同一个后端进程；PostgreSQL 保存业务事实，Redis 提供缓存、限流和队列，前端通过 REST 与 SSE 访问后端。它适合学习、演示、单团队内部工具和低并发单实例部署。

以下任务对应 2026-09-08 架构分析中识别的 1～9 项问题。任务顺序按安全边界、数据正确性、可靠性和扩展性排列；每项都包含可验收结果，便于拆成 issue 或迭代计划。

| 编号 | 优先级 | 任务 | 验收标准 |
|:---:|:---:|---|---|
| 1 | P0 | 收紧注册与 JWT 密钥边界 | 生产环境缺少 `JWT_SECRET` 直接启动失败；注册改为邀请/审批或待激活低权限账号；新增注册越权和密钥缺失测试。 |
| 2 | P1 | 修正字段级权限的资源与响应契约 | reviewer 在工单、知识库、搜索、状态更新等路径都不会收到未授权字段；权限按资源建模；新增允许/拒绝/越权测试。 |
| 3 | P1 | 重建审计与工单回放事实链 | 状态变更在同一事务内写入 before/after 或 patch；回放结果可重复、不会修改当前工单；公开提交、失败写入和历史边界均有测试。 |
| 4 | P1 | 让 RAG 检索可扩展且引用可追溯 | 只向模型发送去重后的 top-k chunk，并受 token/字符预算约束；返回引用包含文档和 chunk 标识；大数据量基准不再全表读入内存。 |
| 5 | P1 | 完善知识索引失败状态机 | embedding、事务、队列失败都能进入 `FAILED` 并记录原因；重试次数、最后错误和人工重试入口可见；索引任务具备幂等性。 |
| 6 | P1 | 建立 embedding 版本和维度契约 | 文档/分片记录 provider、model、dimensions、indexVersion；维度不匹配显式失败；切换 provider 有重建索引流程。 |
| 7 | P1 | 让通知具备持久化补偿和多实例能力 | Notification 写入具备 outbox/重试语义；SSE 通过 Redis Pub/Sub 或消息总线跨实例广播；客户端按 ID 去重并支持断线补拉。 |
| 8 | P1 | 区分真实 AI、mock 和 fallback 结果 | API 与 `AiLog` 明确记录 provider、model、fallback、失败类别和 requestId；外部错误日志脱敏；成本统计包含重试和降级语义。 |
| 9 | P1/P2 | 收敛前端会话、状态和路由边界 | token 不再通过 URL 暴露；会话恢复区分网络错误和认证失效；引入请求取消/缓存/竞态保护；删除或归档旧 `HomePage`，更新路由和测试文档。 |

## 长期规划

### 0～1 个月：安全与事实正确性

- 完成任务 1～3，优先处理注册准入、JWT 密钥、字段过滤和回放语义。
- 把公开工单、状态变更、AI 调用和知识索引的关键失败路径加入自动化测试。
- 为请求、审计事件、队列任务和 AI 调用增加 requestId、结构化日志和基础指标。
- 更新前后端 README，使路由、测试数量、replay 限制和当前单实例边界与代码一致。

### 1～3 个月：可靠性与成本控制

- 完成任务 4～8：RAG chunk 级上下文、索引状态机、embedding 版本、通知补偿、AI fallback 可见性。
- 建立 AI 输入长度、token 成本、fallback 比例、索引耗时、队列失败率和通知延迟的监控面板。
- 为 Redis 故障定义按接口区分的降级策略，明确哪些接口 fail-open、哪些接口需要保护性拒绝。
- 为上传、搜索、AI 调用和公开建单增加超时、限额、重试和幂等策略。

### 3～6 个月：多实例与数据规模

- 当知识库 chunk 数量或查询延迟达到容量阈值时，引入 pgvector/ANN 或独立检索服务；在此之前保留当前实现以控制复杂度。
- 将 BullMQ Worker 从 API 进程拆成独立部署单元，使用相同任务契约和可观测性。
- 使用 Redis Pub/Sub 或消息总线支撑多实例 SSE，并以 Notification 表作为断线补偿事实源。
- 对 PostgreSQL 查询、缓存命中率、队列积压和 Node 内存建立容量基线，再决定是否分离服务。

### 6～12 个月：产品化与平台治理

- 前端引入统一请求缓存层和 OpenAPI 生成类型，收敛页面数据获取与权限契约。
- 建立邀请、审批、角色变更、最小权限和敏感字段脱敏的管理流程。
- 将审计事件、业务事件和用户可见操作历史分层建模，支持合规查询和可验证回放。
- 为 AI provider、embedding provider、检索策略和 prompt 版本建立可配置、可回滚的发布流程。
- 只有在领域边界、事件契约和容量指标稳定后，再评估拆分 AI 网关、检索服务或 Worker 服务；在此之前维持模块化单体。

架构分析的详细证据、风险说明和验证边界见 [`docs/reports/2026-09-08-architecture-report.md`](docs/reports/2026-09-08-architecture-report.md)。

## 🧠 DeepSeek V4 Pro 模型集成计划

### 目标

将当前 `mock-llm-local` 模板回复替换为真实的 DeepSeek V4 Pro 大模型调用，让 AI 工单助手具备真正的智能回复建议和工单摘要能力。

### 架构设计

沿用现有的 Embedding Provider 可插拔模式，抽象 `AiProvider` 接口：

```
                    ┌──────────────┐
                    │  AiService   │
                    └──────┬───────┘
                           │ 注入 AiProvider
                    ┌──────┴───────┐
                    │ AiProvider    │  (接口)
                    │ - replySuggestion()
                    │ - summary()    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
     ┌────────┴────────┐     ┌─────────┴─────────┐
     │ MockAiProvider   │     │ DeepSeekAiProvider │
     │ (默认, 模板)      │     │ (调用 DeepSeek API) │
     └─────────────────┘     └───────────────────┘
```

**设计原则：**
- 与现有 `EmbeddingProvider` 模式一致，降低学习成本
- 通过 `AI_PROVIDER` 环境变量切换，默认保持 `mock` 确保测试无需外部依赖
- DeepSeek API 兼容 OpenAI 接口格式，使用标准的 `/chat/completions` 端点

### 实施步骤

---

#### 第 1 步：新增环境变量

在 `.env.example` 和 `.env` 中添加：

```bash
# AI 模型提供者
AI_PROVIDER=mock                   # mock | deepseek
DEEPSEEK_API_KEY=                  # DeepSeek API Key
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro

# AI 成本监控（可选：覆盖默认美元 / 百万 token 单价）
AI_COST_CACHE_HIT_INPUT_PER_MILLION_USD=
AI_COST_CACHE_MISS_INPUT_PER_MILLION_USD=
AI_COST_OUTPUT_PER_MILLION_USD=
```

---

#### 第 2 步：创建 AiProvider 接口

**文件：** `apps/backend/src/ai/ai-provider.interface.ts`

```typescript
export interface AiReplySuggestionInput {
  ticketTitle: string;
  ticketDescription: string;
  ticketCategory: string;
  ticketPriority: string;
  requester: string;
  assignee: string;
  knowledgeContext?: string;
}

export interface AiSummaryInput {
  ticketTitle: string;
  ticketDescription: string;
  ticketStatus: string;
  ticketPriority: string;
  assignee: string;
  ticketTags: string[];
}

export interface AiProviderOutput {
  result: string;
  confidence: number;
  citations: string[];
}

export interface AiProvider {
  generateReplySuggestion(input: AiReplySuggestionInput): Promise<AiProviderOutput>;
  generateSummary(input: AiSummaryInput): Promise<AiProviderOutput>;
}
```

---

#### 第 3 步：实现 MockAiProvider

**文件：** `apps/backend/src/ai/mock-ai.provider.ts`

将 `AiService` 中现有的模板回复逻辑抽取到 `MockAiProvider` 中，保持行为不变。

```typescript
@Injectable()
export class MockAiProvider implements AiProvider {
  async generateReplySuggestion(input: AiReplySuggestionInput): Promise<AiProviderOutput> {
    // 现有模板逻辑迁移到这里
  }

  async generateSummary(input: AiSummaryInput): Promise<AiProviderOutput> {
    // 现有模板逻辑迁移到这里
  }
}
```

---

#### 第 4 步：实现 DeepSeekAiProvider

**文件：** `apps/backend/src/ai/deepseek-ai.provider.ts`

核心实现，调用 DeepSeek Chat Completions API：

```typescript
@Injectable()
export class DeepSeekAiProvider implements AiProvider {
  private readonly apiBase: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiBase = process.env.DEEPSEEK_API_BASE ?? 'https://api.deepseek.com';
    this.apiKey = process.env.DEEPSEEK_API_KEY ?? '';
    this.model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';
  }

  async generateReplySuggestion(input: AiReplySuggestionInput): Promise<AiProviderOutput> {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_REPLY },
      { role: 'user', content: JSON.stringify(input) },
    ];

    const response = await fetch(`${this.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    // 解析响应，提取 result、confidence、citations
  }

  async generateSummary(input: AiSummaryInput): Promise<AiProviderOutput> {
    // 类似的 Chat Completions 调用
  }
}
```

**System Prompt 设计要点：**

| 场景 | Prompt 要点 |
|------|------------|
| 回复建议 | 角色定位（交付工程师助手）、工单上下文、引用知识库、风险提示、人工确认要求 |
| 工单摘要 | 结构化输出（摘要/当前状态/建议下一步）、标签提取、置信度评估 |

**关键实现细节：**
- 使用 `fetch` (Node.js 22 内置)，无需额外依赖
- 错误处理：API 超时（30s）、非 2xx 响应、JSON 解析失败
- 结构化输出：Prompt 中要求 JSON 格式返回，包含 `result`/`confidence`/`citations` 字段
- 降级策略：API 调用失败时降级到 `MockAiProvider`，确保服务可用

---

#### 第 5 步：创建 Provider 工厂

**文件：** `apps/backend/src/ai/ai-provider.factory.ts`

```typescript
export function createAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();

  switch (provider) {
    case 'deepseek':
      return new DeepSeekAiProvider();
    case 'mock':
    default:
      return new MockAiProvider();
  }
}
```

---

#### 第 6 步：重构 AiService

修改 `AiService`，通过依赖注入使用 `AiProvider`：

```typescript
@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProvider,  // 注入
  ) {}

  async createReplySuggestion(ticketId: string, user?: AuthenticatedUser) {
    const ticket = await this.getTicketOrThrow(ticketId);
    const documents = await this.fetchRelevantDocuments(ticket);

    const output = await this.aiProvider.generateReplySuggestion({
      ticketTitle: ticket.title,
      ticketDescription: ticket.description,
      ticketCategory: ticket.category,
      ticketPriority: ticket.priority,
      requester: ticket.requester,
      assignee: ticket.assignee ?? '未分配',
      knowledgeContext: documents.map(d => d.content).join('\n'),
    });

    // 写入 AiLog（逻辑不变）
    const log = await this.prisma.aiLog.create({
      data: {
        ticketId,
        type: AiLogType.REPLY_SUGGESTION,
        promptVersion: 'fde-ticket-assistant-v2',
        model: this.aiProvider instanceof DeepSeekAiProvider ? 'deepseek-v4-pro' : 'mock-llm-local',
        result: output.result,
        confidence: output.confidence,
        citations: output.citations,
        actorId: user?.id ?? null,
      },
    });

    return mapAiLog(log);
  }
}
```

---

#### 第 7 步：更新 AiModule

```typescript
@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'AI_PROVIDER',
      useFactory: createAiProvider,
    },
  ],
})
export class AiModule {}
```

> 注意：需要用 `@Inject('AI_PROVIDER')` 装饰器注入，或使用自定义 Provider 类 token。

---

#### 第 8 步：更新测试

| 测试文件 | 变更 |
|---------|------|
| `ai.service.spec.ts` | Mock `AiProvider`，验证 Service 正确调用 Provider 并写入日志 |
| `mock-ai.provider.spec.ts` | 新增，验证模板输出格式和内容 |
| `deepseek-ai.provider.spec.ts` | 新增，Mock `fetch` 验证请求格式和响应解析 |
| `ai.controller.spec.ts` | 无需变更（仅路由和鉴权） |

---

#### 第 9 步：更新文档

- `.env.example` — 添加 DeepSeek 相关环境变量
- `README.md` — 添加 DeepSeek 配置说明和使用示例

### 验证清单

| 序号 | 验证项 | 预期结果 |
|:---:|------|------|
| 1 | `pnpm test` 全部通过 | mock provider 下行为不变 |
| 2 | 设置 `AI_PROVIDER=deepseek` + 有效 API Key | 返回真实 AI 生成内容 |
| 3 | 设置 `AI_PROVIDER=deepseek` + 无效 API Key | 优雅降级，记录错误日志 |
| 4 | `pnpm lint` 通过 | 无 ESLint 错误 |
| 5 | `pnpm build` 通过 | TypeScript 编译无错误 |

### 安全注意事项

- ⚠️ **API Key 绝不提交到代码仓库** — 仅通过 `.env` 配置
- ⚠️ `.env.example` 中 `DEEPSEEK_API_KEY` 留空，仅作占位
- ⚠️ 工单数据发送到 DeepSeek API 前检查是否包含敏感信息
- ⚠️ 所有 AI 调用记录到 `AiLog` 表，支持审计追溯

---

## 本次修改报告

完成 README 下一步建议中的全部四项：

1. **真实 embedding 模型和向量检索召回链路** — 抽象 `EmbeddingProvider` 接口，支持本地确定性哈希（16 维，默认）和 OpenAI 兼容 API（1536 维），通过环境变量切换。新增 `GET /api/knowledge/search?q=...&limit=5` 向量语义搜索端点，余弦相似度排序。前端知识面板添加搜索输入。

2. **Dockerfile、Nginx、CI/CD 和部署文档** — 后端多阶段 Dockerfile（pnpm 依赖 → Prisma 生成 → NestJS 编译 → 生产运行），前端多阶段 Dockerfile（Vite 构建 → Nginx 静态服务 + API 反向代理）。`docker-compose.prod.yml` 一键生产部署。GitHub Actions CI/CD（lint → test → build → Docker 构建验证）。

3. **审计日志** — 新增 `AuditLog` 模型和 `AuditAction` 枚举。`AuditInterceptor` 配合 `@Auditable()` 装饰器自动捕获业务操作（VIEW/CREATE/UPDATE/AI_GENERATE）。批量缓写（5 秒或 50 条触发）。`GET /api/audit-logs` 管理员查询。AiLog 表增加 `actorId` 记录 AI 操作者。

4. **细粒度字段级权限和操作回放** — 新增权限矩阵（admin/agent/reviewer → 字段读写），`FieldPermissionsInterceptor` 自动过滤响应字段。`POST /api/tickets/:id/replay` 基于审计日志的事件链恢复到指定时间点的工单状态。

### 验证结果

```text
pnpm test
结果：通过；前端 1 个测试文件、3 个测试，后端 5 个测试套件、20 个测试，e2e 1 个测试套件、2 个测试。

pnpm test:backend
结果：通过；5 个测试套件，20 个测试。

pnpm test:e2e:backend
结果：通过；1 个测试套件，2 个测试。

pnpm lint
结果：通过；前后端 lint 均通过。

pnpm build
结果：通过；前端 Vite 构建保留现有 chunk size warning，不影响本次功能。
```

## 🎯 DeepSeek V4 Pro 回答质量优化方案

> **状态：** 方案研究 & 理论验证通过 | 代码改动：已完成

### 优化总览

| 层级 | 手段 | 预期效果 | 改动量 | 可行性 |
|:---:|------|------|:---:|:---:|
| 1 | 采样参数对齐官方建议 | 基础质量提升 | 极小 | ✅ |
| 2 | JSON Mode 结构化输出 | 消除解析失败 | 极小 | ✅ |
| 3 | System Prompt 深化设计 | 回答专业性、可控性 | 中 | ✅ |
| 4 | Few-shot 示例注入 | 格式一致性、领域知识 | 中 | ✅ |
| 5 | RAG 知识增强 | 引用准确性 | 中 | ✅ |
| 6 | Thinking 推理模式 | 复杂工单质量 | 小 | ✅ |
| 7 | 上下文缓存利用 | API 成本 ↓ 120x | 无 | ✅ (自动) |
| 8 | 输出验证 + 重试 | 可靠性兜底 | 中 | ✅ |
| 9 | 成本监控 | API token / 费用可观测 | 小 | ✅ |

### 1. 采样参数对齐官方建议

| 参数 | 当前代码值 | DeepSeek 官方推荐 | 说明 |
|------|-----------|-------------------|------|
| `temperature` | `0.7` | **`1.0`** | 官方声明：MoE 模型不要照搬 GPT/Claude 的低温设置 |
| `top_p` | 未设置 | **`1.0`** | 官方推荐，与 temperature 配合使用 |
| `max_tokens` | `2048` | **`4096`**+ | 回复建议和摘要通常需要更长的输出 |

### 2. JSON Mode 结构化输出

使用 DeepSeek 原生 `response_format: { type: 'json_object' }`，模型保证输出合法 JSON，消除解析失败。

### 3. System Prompt 深化设计

四段式 Prompt：角色定位（望江街道政务服务中心 AI 助手） → 正面规范（6条） → 禁止事项（4条） → 输出 JSON Schema。

### 4. Few-shot 示例注入

按工单分类匹配 `REPLY_FEWSHOT_EXAMPLES` 库（`城市治理` / `default`），及 `SUMMARY_FEWSHOT_EXAMPLE`。DeepSeek V4 Pro 的 1M 上下文窗口可承载示例。

### 5. RAG 知识增强

从"取最新 3 篇文档"改为"用工单标题+描述做向量语义搜索，取最相关的 5 篇"。利用现有的 `KnowledgeService.search()` 接口。

### 6. Thinking 推理模式

紧急工单（`URGENT`）自动启用 `thinking: { type: 'enabled' }` + `reasoning_effort: 'high'`。

### 7. 上下文缓存利用

DeepSeek 自动启用硬盘缓存。System Prompt 为静态常量 → Cache Hit。输入成本降低约 120 倍。

### 8. 输出验证 + 重试

4 层校验（内容长度、置信度阈值、禁止词正则、引用检查）→ 未通过重试最多 2 次 → 降级 mock。

### 9. 成本监控

DeepSeek 响应中的 `usage` 会被解析并写入 `AiLog`：输入 token、输出 token、总 token、缓存命中 token、缓存未命中 token、reasoning token、API 调用次数和预估美元费用。Provider 重试时会累计每次外部 API 调用的 token 用量，避免验证失败重试的成本被漏记。费用估算支持通过 `AI_COST_*_PER_MILLION_USD` 环境变量覆盖默认单价。前端通过独立的 `/ai-costs` 成本仪表盘查看统计；该页面和 `GET /api/ai/logs` 仅对管理员与现场工程师开放，工单详情不展示 token / 费用数据。

---

## 本次修改报告：DeepSeek V4 Pro 回答质量优化落地

> **完成时间：** 2026-06-23 | **改动文件：** 4 个 | **新增文件：** 0 个

### 实施内容

| 序号 | 优化项 | 改动位置 | 状态 |
|:---:|------|------|:---:|
| 1 | 采样参数对齐官方 | `deepseek-ai.provider.ts:chat()` | ✅ |
| 2 | JSON Mode 结构化输出 | `deepseek-ai.provider.ts:chat()` | ✅ |
| 3 | System Prompt 深化设计 | `deepseek-ai.provider.ts` 常量 | ✅ |
| 4 | Few-shot 示例注入 | `deepseek-ai.provider.ts` 常量 + userMessage | ✅ |
| 5 | RAG 向量语义搜索 | `ai.service.ts` | ✅ |
| 6 | Thinking 推理模式 | `deepseek-ai.provider.ts:chat()` | ✅ |
| 7 | 上下文缓存利用 | 无需改动（静态 System Prompt） | ✅ (自动) |
| 8 | 输出验证 + 重试 | `deepseek-ai.provider.ts:validateOutput()+chatWithRetry()` | ✅ |
| 9 | 成本监控 | `deepseek-ai.provider.ts` usage 解析 + `AiLog` 持久化 | ✅ |

### 详细改动

**采样参数：** temperature: 0.7 → 1.0, top_p: 未设置 → 1.0, max_tokens: 2048 → 4096。DeepSeek 官方明确声明 MoE 模型不应照搬 GPT/Claude 低温参数。

**JSON Mode：** 新增 `response_format: { type: 'json_object' }`，模型保证输出合法 JSON。

**System Prompt：** 四段式结构 — 角色定位（望江街道政务服务中心） → 正面规范（6条含跨部门协调） → 禁止事项（4条） → JSON Schema。

**Few-shot：** 按工单分类动态匹配 `REPLY_FEWSHOT_EXAMPLES`（`城市治理` / `default`）及 `SUMMARY_FEWSHOT_EXAMPLE`。

**RAG 向量搜索：** 从 `prisma.knowledgeDocument.findMany({ take: 3 })` 改为 `knowledgeService.search(searchQuery, 5)`。模块变更：`knowledge.module.ts` 新增 exports，`ai.module.ts` 导入 KnowledgeModule，`ai.service.ts` 注入 KnowledgeService。

**Thinking 推理：** 紧急工单（`URGENT`）自动启用 `thinking: { type: 'enabled' }` + `reasoning_effort: 'high'`。

**上下文缓存：** DeepSeek 自动缓存静态 System Prompt，输入成本降低约 120 倍（$0.435 → $0.003625）。

**验证+重试：** 4 层校验（长度≥80字 → 置信度≥0.6 → 禁止词正则 → 紧急引用检查）→ 最多 2 次重试 → 降级 mock。双层安全兜底。

**成本监控：** 解析 DeepSeek `usage`，记录 prompt/completion/total tokens、cache hit/miss、reasoning tokens、API 调用次数和预估美元费用；重试会累计实际外部调用消耗。

### 自检结果

```
✅ pnpm test         — 25 tests passed (frontend 3 + backend 20 + e2e 2)
✅ pnpm lint         — 0 errors, 0 warnings
✅ pnpm build        — TypeScript 编译 + Vite 构建成功
✅ Backend Health    — http://localhost:3000/api/health → ok
✅ DeepSeek API      — 回复建议/摘要调用成功，置信度 0.90-0.95
```

### 端到端验证

```
POST /api/ai/tickets/ticket-1001/reply-suggestion
→ model: deepseek-v4-pro, confidence: 0.90
→ 引用了知识库管理规范，提供了4条具体可操作建议，明确了主责/配合部门

POST /api/ai/tickets/ticket-1002/summary
→ model: deepseek-v4-pro, confidence: 0.95
→ 结构化摘要：问题提炼 + 当前状态 + 下一步建议 + 紧急程度评估
```

### 优化前 vs 优化后对比

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| temperature | 0.7（照搬 GPT） | 1.0（DeepSeek 官方推荐） |
| JSON 输出 | Prompt 要求 + 解析降级 | response_format 强制 + 合法 JSON |
| System Prompt | 5 条规则，无禁止项 | 角色+规范+禁止+Schema 四段式 |
| Few-shot | 无 | 按工单分类动态匹配 |
| 知识检索 | 最新 3 篇（可能不相关） | 向量语义搜索 5 篇（最相关） |
| 推理模式 | 无 | URGENT 自动启用 thinking |
| 输出校验 | 无 | 4 层校验 + 2 次重试 |
| 降级兜底 | AiService 单层 fallback | Provider 内重试 + AiService fallback 双层 |

### 后续优化空间

- **引用接地**：验证 AI 输出的 citations 是否与知识库文档标题匹配
- **分类示例扩展**：为更多工单分类补充 Few-shot 示例
- **thinking_max 模式**：对涉及 3+ 部门协调的工单启用更深层推理

---

## 本次修改报告：AI 成本监控落地

> **完成时间：** 2026-06-29 | **改动范围：** 后端 AI 调用链、Prisma 日志模型、成本仪表盘、RBAC、配置与文档

### 修改记录

1. **AiLog 成本字段持久化** — 新增 `promptTokens`、`completionTokens`、`totalTokens`、`cachedPromptTokens`、`cacheMissPromptTokens`、`reasoningTokens`、`apiCallCount`、`estimatedCostUsd` 字段，并新增迁移 `20260629000000_add_ai_cost_monitoring`。

2. **DeepSeek usage 解析与费用估算** — `DeepSeekAiProvider` 解析 API 响应中的 `usage`，按模型默认单价计算预估美元费用；支持 `AI_COST_CACHE_HIT_INPUT_PER_MILLION_USD`、`AI_COST_CACHE_MISS_INPUT_PER_MILLION_USD`、`AI_COST_OUTPUT_PER_MILLION_USD` 覆盖。

3. **重试成本累计** — provider 在验证失败重试时累计每次外部 API 调用的 token 和费用；即使最终降级到 mock，也会把已发生的 DeepSeek 调用次数和 token 用量传给 `AiService` 写入日志。

4. **成本日志权限边界** — `GET /api/ai/logs` 返回 `usage` 对象，包含 token、缓存、reasoning、调用次数和费用字段，并限制为 `admin` / `agent` 可访问；`POST /api/ai/tickets/:id/reply-suggestion` 和 `POST /api/ai/tickets/:id/summary` 仍会写入成本字段，但响应不携带 `usage`，避免工单视图暴露费用数据。

5. **独立成本仪表盘** — 新增 `/ai-costs` 页面，按总量、模型和最近调用展示 token、缓存命中率、API 调用次数与预估费用；侧边栏仅对管理员和现场工程师显示入口。

6. **工单视图收敛** — 首页与工单页不再无条件拉取成本日志，也不在最近 AI 输出区域展示 token / 费用；审核人仍可生成 AI 建议，但不会看到成本仪表盘或成本字段。

### 测试报告

```text
pnpm test:backend
结果：通过；7 个测试套件、23 个测试。
覆盖：DeepSeek usage 解析、预估费用、重试累计、AiService 写入 AiLog usage，生成响应不返回 usage。

pnpm test:frontend
结果：通过；2 个测试文件、6 个测试。
覆盖：成本仪表盘汇总、按模型聚合、admin / agent / reviewer 可见性权限。

pnpm lint
结果：通过；前后端 lint 均通过。

pnpm test
结果：通过；前端 2 个测试文件、6 个测试，后端 7 个测试套件、23 个测试，e2e 1 个测试套件、2 个测试。

pnpm build
结果：通过；后端 NestJS 编译成功，前端 Vite 构建成功；保留既有 chunk size warning。

pnpm db:generate
结果：通过；Prisma Client 已按新增 AiLog 字段重新生成。
```

## 历史修改报告

## 本次修改报告

完成 README 下一步建议中的全部四项：

1. **真实 embedding 模型和向量检索召回链路** — 抽象 `EmbeddingProvider` 接口，支持本地确定性哈希（16 维，默认）和 OpenAI 兼容 API（1536 维），通过环境变量切换。新增 `GET /api/knowledge/search?q=...&limit=5` 向量语义搜索端点，余弦相似度排序。前端知识面板添加搜索输入。

2. **Dockerfile、Nginx、CI/CD 和部署文档** — 后端多阶段 Dockerfile（pnpm 依赖 → Prisma 生成 → NestJS 编译 → 生产运行），前端多阶段 Dockerfile（Vite 构建 → Nginx 静态服务 + API 反向代理）。`docker-compose.prod.yml` 一键生产部署。GitHub Actions CI/CD（lint → test → build → Docker 构建验证）。

3. **审计日志** — 新增 `AuditLog` 模型和 `AuditAction` 枚举。`AuditInterceptor` 配合 `@Auditable()` 装饰器自动捕获业务操作（VIEW/CREATE/UPDATE/AI_GENERATE）。批量缓写（5 秒或 50 条触发）。`GET /api/audit-logs` 管理员查询。AiLog 表增加 `actorId` 记录 AI 操作者。

4. **细粒度字段级权限和操作回放** — 新增权限矩阵（admin/agent/reviewer → 字段读写），`FieldPermissionsInterceptor` 自动过滤响应字段。`POST /api/tickets/:id/replay` 基于审计日志的事件链恢复到指定时间点的工单状态。

### 验证结果

```text
pnpm test
结果：通过；前端 1 个测试文件、3 个测试，后端 5 个测试套件、20 个测试，e2e 1 个测试套件、2 个测试。

pnpm test:backend
结果：通过；5 个测试套件，20 个测试。

pnpm test:e2e:backend
结果：通过；1 个测试套件，2 个测试。

pnpm lint
结果：通过；前后端 lint 均通过。

pnpm build
结果：通过；前端 Vite 构建保留现有 chunk size warning，不影响本次功能。
```
