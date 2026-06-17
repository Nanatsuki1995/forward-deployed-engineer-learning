# Forward Deployed Engineer Learning Workspace

这个仓库按照 `forward-deployed-engineer-learning-path.md` 的路线创建，第一阶段先打通：

- 前端：React + TypeScript + Vite
- 后端：Node.js + NestJS + TypeScript
- 基础设施：PostgreSQL + Redis + Docker Compose
- 练习项目：AI 工单助手

## 项目结构

```text
.
├── apps
│   ├── frontend          # React 工作台
│   └── backend           # NestJS API
├── docker-compose.yml    # PostgreSQL / Redis 本地基础设施
├── package.json          # pnpm workspaces
└── forward-deployed-engineer-learning-path.md
```

## 快速启动

安装依赖：

```bash
pnpm install
```

准备后端环境变量：

```bash
cp apps/backend/.env.example apps/backend/.env
```

启动 PostgreSQL 和 Redis：

```bash
pnpm infra:up
```

生成 Prisma Client：

```bash
pnpm db:generate
```

创建/执行本地数据库迁移：

```bash
pnpm db:migrate
```

填充演示数据：

```bash
pnpm db:seed
```

启动后端：

```bash
pnpm dev:backend
```

启动前端：

```bash
pnpm dev:frontend
```

前端默认访问：

```text
http://localhost:5173
```

后端 API 默认访问：

```text
http://localhost:3000/api
```

Swagger 文档默认访问：

```text
http://localhost:3000/api/docs
```

演示账号：

```text
admin@example.com / password123
agent@example.com / password123
reviewer@example.com / password123
```

关闭基础设施：

```bash
pnpm infra:down
```

## 当前已实现的练习面

后端已经接入 Prisma + PostgreSQL + Redis，并加入 JWT 鉴权、refresh token 会话轮换、基础 RBAC、Swagger 文档、DTO 参数校验和统一错误格式。知识库已经支持手工录入和 Markdown/TXT 文件上传，创建或上传后会先落 `processing` 文档，再通过 Redis 队列或本地降级任务完成分片索引、embedding 和 `KnowledgeChunk` 写入。`GET /api/knowledge` 会走 Redis 缓存，API 层还挂了基于 Redis 的固定窗口限流。前端已经提供登录页、登录态恢复、受保护路由、权限感知工作台和知识库上传入口。

### 数据模型

```text
User
RefreshToken
Ticket
TicketMessage
KnowledgeDocument
KnowledgeChunk
AiLog
```

Prisma schema 位于：

```text
apps/backend/prisma/schema.prisma
```

初始化 migration 位于：

```text
apps/backend/prisma/migrations/20260611000000_init/migration.sql
```

refresh token migration 位于：

```text
apps/backend/prisma/migrations/20260611130000_add_refresh_tokens/migration.sql
```

知识库分片 migration 位于：

```text
apps/backend/prisma/migrations/20260616093000_add_knowledge_chunks/migration.sql
```

### RBAC

```text
admin     管理员，可创建工单、上传知识文档、生成 AI 建议、更新状态
agent     交付工程师，可创建工单、上传知识文档、生成 AI 建议、更新状态
reviewer  审核人，可查看数据、生成 AI 建议、更新状态
```

`GET /api/health` 不需要登录。除登录和注册外，业务接口都需要：

```text
Authorization: Bearer <accessToken>
```

登录请求体：

```json
{
  "email": "agent@example.com",
  "password": "password123"
}
```

刷新会话请求体：

```json
{
  "refreshToken": "<refreshToken>"
}
```

注册请求体：

```json
{
  "name": "New Agent",
  "email": "new.agent@example.com",
  "password": "password123"
}
```

公开注册只会创建普通 `agent` 用户，不能通过请求体指定 `admin` 或 `reviewer`。演示管理员和审核人账号由 seed 数据创建。

### API

```text
GET    /api/health
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/tickets
GET    /api/tickets/:id
POST   /api/tickets
PATCH  /api/tickets/:id/status
GET    /api/knowledge
POST   /api/knowledge
POST   /api/knowledge/upload
POST   /api/ai/tickets/:ticketId/reply-suggestion
POST   /api/ai/tickets/:ticketId/summary
GET    /api/ai/logs
```

### 知识库上传和索引

`admin` 和 `agent` 可以上传知识文档：

```text
POST /api/knowledge/upload
Content-Type: multipart/form-data
```

表单字段：

```text
file    必填，支持 .md / .markdown / .txt，最大 1MB
title   可选，不填时使用文件名
source  可选，不填时使用原始文件名
```

上传和索引处理链：

- 将 Markdown 规范化为可检索文本，移除基础 Markdown 标记并保留正文信息。
- 创建 `processing` 状态的 `KnowledgeDocument`，先返回文档壳，再进入后台处理。
- 正常情况下把索引任务放入 Redis 队列，由后台 Worker 异步完成分片和 embedding。
- 当 Redis 队列不可用时，服务会自动降级为同步索引，保证本地开发和测试可用。
- 按段落和长度切成知识分片，当前单片上限为 480 字符。
- 为每个分片生成 16 维本地确定性 embedding，便于后续替换成真实向量模型。
- 索引完成后写入 `KnowledgeChunk`，并刷新 `GET /api/knowledge` 的 Redis 缓存。

### Redis 缓存、限流和后台任务

`GET /api/knowledge` 默认缓存 30 秒，减少列表查询对数据库的压力。知识文档创建和上传都会先写入 `processing` 状态，随后交给 Redis 队列处理；队列不可用时会自动降级到同步索引。

API 层使用 Redis 固定窗口限流，默认按 `IP + method + path` 统计，每 60 秒最多 120 次请求。相关环境变量见 `apps/backend/.env.example`：

```text
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT_MS=500
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW_SECONDS=60
KNOWLEDGE_INDEXING_CONCURRENCY=2
```

### 参数校验和错误格式

后端启动时会全局启用 DTO 参数校验：

- 未在 DTO 中声明的字段会被拒绝。
- 请求体类型、枚举值、必填字段和最小长度会在进入业务服务前校验。
- 校验失败、鉴权失败、找不到资源等异常会统一输出同一种错误结构。

错误响应示例：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "email must be an email",
    "details": [
      "email must be an email",
      "property extra should not exist"
    ]
  },
  "meta": {
    "timestamp": "2026-06-15T01:30:00.000Z",
    "path": "/api/auth/login",
    "method": "POST",
    "statusCode": 400
  }
}
```

## 本次修改报告

完成 README 下一步建议中的第一项：补上 Redis 缓存、队列、限流和后台任务，并把知识库索引改成可降级的异步处理链。

修改范围：

- 后端新增 Redis 连接、JSON 缓存服务和基于 Redis 的固定窗口限流 Guard。
- 知识库 `GET /api/knowledge` 接入 Redis 缓存，避免重复打数据库。
- 知识文档创建和上传改为先落 `processing`，再由 Redis 队列异步索引；队列不可用时自动降级到同步索引。
- 新增后台索引 Worker，完成 Markdown 规范化、分片、embedding 和 `KnowledgeChunk` 写入后刷新缓存。
- 补充 `.env.example` 中的 Redis、限流和索引并发配置。
- 更新后端单测，覆盖缓存命中、队列入队、同步降级、索引失败和限流 429。
- 更新 README 中的当前状态、处理链和下一步建议。

验证结果：

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

### 下一步建议

1. 增加真实 embedding 模型和向量检索召回链路。
2. 增加 Dockerfile、Nginx、CI/CD 和部署文档。
3. 增加审计日志：谁在什么时候看了什么、改了什么、让 AI 做了什么。
4. 增加更细粒度的字段级权限和操作回放。
