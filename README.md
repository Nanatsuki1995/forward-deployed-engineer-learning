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
│   │   │   ├── pages/               # 登录、工作台首页
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

### 本地开发

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp apps/backend/.env.example apps/backend/.env
# 编辑 .env，设置 JWT_SECRET 为强随机值

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
POST   /api/auth/register      注册交付工程师账号
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
GET    /api/ai/logs                                查询 AI 调用日志
```

### 系统

```text
GET    /api/health             健康检查（无需登录）
GET    /api/audit-logs         审计日志（管理员）
```

所有业务接口需要 `Authorization: Bearer <accessToken>`。

## RBAC 与字段级权限

### 角色能力矩阵

| 能力 | admin | agent | reviewer |
|------|:-----:|:-----:|:--------:|
| 创建工单 | ✓ | ✓ | — |
| 上传知识文档 | ✓ | ✓ | — |
| 生成 AI 建议 | ✓ | ✓ | ✓ |
| 更新工单状态 | ✓ | ✓ | ✓ |
| 审核确认 | ✓ | — | ✓ |
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

管理员可通过 `POST /api/tickets/:id/replay` 传入 `{ "until": "ISO timestamp" }` 恢复到指定时间点的工单状态。回放基于审计日志的事件链，按时间顺序重放状态变更。

## 数据模型

```text
User              用户（admin/agent/reviewer）
RefreshToken      JWT 刷新令牌（bcrypt 哈希存储）
Ticket            工单（状态、优先级、分类、标签）
TicketMessage     工单消息（请求者/工程师/系统）
KnowledgeDocument 知识文档（手工录入或文件上传）
KnowledgeChunk    知识分片（含 embedding 向量）
AiLog             AI 调用日志（含操作者追踪）
AuditLog          审计日志（操作者、操作类型、资源、时间）
```

Prisma schema：[`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma)

迁移文件：
- `20260611000000_init` — 核心表
- `20260611130000_add_refresh_tokens` — Refresh Token 轮换
- `20260616093000_add_knowledge_chunks` — 知识库分片与 embedding
- `20260623000000_add_audit_logs` — 审计日志与 AiLog 操作者追踪

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
