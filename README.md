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

后端已经接入 Prisma + PostgreSQL，并加入 JWT 鉴权和基础 RBAC。前端启动时会用演示账号自动登录，拿到 JWT 后再请求工单、知识库和 AI 接口。后续可以继续扩展 refresh token、Swagger、DTO 校验、Redis、队列和真实 LLM 调用。

### 数据模型

```text
User
Ticket
TicketMessage
KnowledgeDocument
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
GET    /api/auth/me
GET    /api/tickets
GET    /api/tickets/:id
POST   /api/tickets
PATCH  /api/tickets/:id/status
GET    /api/knowledge
POST   /api/knowledge
POST   /api/ai/tickets/:ticketId/reply-suggestion
POST   /api/ai/tickets/:ticketId/summary
GET    /api/ai/logs
```

### 下一步建议

1. 增加 refresh token、退出登录、登录页和权限感知 UI。
2. 增加 Swagger 文档、DTO 参数校验和统一错误格式。
3. 增加文件上传、文档解析、切片和 embedding。
4. 增加 Redis 缓存、队列、限流和后台任务。
5. 增加 Dockerfile、Nginx、CI/CD 和部署文档。
6. 增加审计日志：谁在什么时候看了什么、改了什么、让 AI 做了什么。
