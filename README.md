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

后端已经接入 Prisma + PostgreSQL，并加入 JWT 鉴权、refresh token 会话轮换、基础 RBAC、Swagger 文档、DTO 参数校验和统一错误格式。前端已经提供登录页、登录态恢复、受保护路由和权限感知工作台，拿到访问令牌后再请求工单、知识库和 AI 接口。后续可以继续扩展文件上传、文档解析、Redis、队列和真实 LLM 调用。

### 数据模型

```text
User
RefreshToken
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

refresh token migration 位于：

```text
apps/backend/prisma/migrations/20260611130000_add_refresh_tokens/migration.sql
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
POST   /api/ai/tickets/:ticketId/reply-suggestion
POST   /api/ai/tickets/:ticketId/summary
GET    /api/ai/logs
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

完成 README 下一步建议中的第一项：增加 Swagger 文档、DTO 参数校验和统一错误格式。

修改范围：

- 后端新增 Swagger 依赖和 `class-validator` / `class-transformer`，并在启动流程中注册 `/api/docs`。
- 新增认证、工单、知识库请求 DTO，控制器改为使用 DTO 接收请求体。
- 新增全局 `ValidationPipe`，开启白名单、未知字段拒绝和请求体转换。
- 新增全局 HTTP 异常过滤器，把业务异常、鉴权异常、参数校验异常统一为 `{ error, meta }` 结构。
- e2e 测试复用生产 app 配置，并覆盖登录参数校验的统一错误响应。

验证结果：

```text
初始要求命令：npm test
结果：失败，根 package.json 没有 test 脚本；已读取 npm error log，确认错误为 Missing script: "test"。

pnpm test:backend
结果：通过，2 个测试套件，9 个测试。

pnpm test:e2e:backend
结果：通过，1 个测试套件，2 个测试。

pnpm --filter backend lint
结果：通过。

pnpm build
结果：通过；前端 Vite 构建保留现有 chunk size warning，不影响本次后端功能。
```

### 下一步建议

1. 增加文件上传、文档解析、切片和 embedding。
2. 增加 Redis 缓存、队列、限流和后台任务。
3. 增加 Dockerfile、Nginx、CI/CD 和部署文档。
4. 增加审计日志：谁在什么时候看了什么、改了什么、让 AI 做了什么。
5. 增加更细粒度的字段级权限和操作回放。
