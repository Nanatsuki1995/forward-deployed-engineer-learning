# Backend — AI 工单助手 API

NestJS 11 + Prisma 7 + PostgreSQL + Redis + BullMQ

## 目录结构

```text
src/
├── main.ts                    # 入口：CORS、ValidationPipe、Swagger、全局过滤器
├── app.module.ts              # 根模块：Redis, Prisma, Embedding, Audit, Auth, Tickets, Knowledge, AI
├── app.controller.ts          # /api/health
├── ai/                        # AI 回复建议、摘要生成、token / 成本监控
│   ├── ai.service.ts          # 创建 AiLog（含 actorId、usage、预估成本；生成响应不暴露 usage）
│   ├── ai-token-usage.ts      # token 用量默认值、累计、AiLog 写入数据
│   └── ai.controller.ts       # POST reply-suggestion, POST summary, GET logs（admin/agent）
├── audit/                     # 审计日志
│   ├── audit.types.ts         # AuditEvent 接口
│   ├── audit.decorator.ts     # @Auditable(resource, action?)
│   ├── audit.interceptor.ts   # 自动捕获 HTTP 请求 → AuditService.log()
│   ├── audit.service.ts       # 批量缓写（5s / 50条 → Prisma createMany）
│   └── audit.controller.ts    # GET /audit-logs（仅 admin）
├── auth/                      # 鉴权与权限
│   ├── auth.service.ts        # login, register, refresh, logout, me
│   ├── auth.controller.ts     # POST login/register/refresh/logout, GET me
│   ├── jwt.strategy.ts        # Passport JWT 策略，每次请求查库取用户
│   ├── jwt-auth.guard.ts      # JWT 守卫
│   ├── roles.guard.ts         # 方法级 RBAC（@Roles()）
│   ├── roles.decorator.ts     # @Roles('admin', 'agent')
│   ├── current-user.decorator.ts  # @CurrentUser() 提取 req.user
│   ├── permission-matrix.ts       # admin/agent/reviewer 字段读写权限矩阵
│   ├── field-permissions.decorator.ts    # @FieldPermissions(resource)
│   ├── field-permissions.interceptor.ts # 响应字段自动过滤
│   └── dto/                   # LoginDto, RegisterDto, RefreshTokenDto
├── embedding/                 # 可插拔 Embedding 提供者
│   ├── embedding-provider.interface.ts  # EmbeddingProvider { dimensions, embed(texts) }
│   ├── embedding.service.ts             # embed(texts), embedSingle(text)
│   ├── embedding.provider.ts            # 工厂：根据 EMBEDDING_PROVIDER 选择
│   ├── local-embedding.provider.ts      # 16 维确定性哈希（默认）
│   └── openai-embedding.provider.ts     # OpenAI 兼容 API（1536 维）
├── jobs/                      # 后台任务（BullMQ）
│   ├── knowledge-indexing.queue.ts      # 入队：enqueueDocumentIndex(id)
│   ├── knowledge-indexing.worker.ts     # Worker：并发处理，调用 indexDocument
│   ├── knowledge-indexing.service.ts    # 索引核心：分块 → Embedding → Prisma 事务
│   ├── jobs.module.ts                   # 注册 Queue、Service、Worker
│   └── bullmq-connection.ts            # Redis 连接工厂（测试和禁用时返回 null）
├── knowledge/                 # 知识库
│   ├── knowledge.service.ts   # CRUD、上传、向量搜索（余弦相似度）
│   ├── knowledge.controller.ts # GET list/search, POST create/upload
│   ├── knowledge-indexing.ts  # 纯函数：normalize → chunk → 不含 embedding
│   └── dto/                   # CreateKnowledgeDocumentDto, UploadKnowledgeDocumentDto
├── prisma/                    # Prisma 数据库服务
│   ├── prisma.service.ts      # 继承 PrismaClient，实现 OnModuleInit
│   └── prisma.module.ts       # @Global() 模块
├── rate-limit/                # Redis 固定窗口限流
│   └── redis-rate-limit.guard.ts  # 全局 APP_GUARD，按 IP+method+path 计数
├── redis/                     # Redis 连接与缓存
│   ├── redis.service.ts       # ioredis 懒连接，execute() 优雅降级
│   └── redis-cache.service.ts # getOrSet / getJson / setJson / delete
├── tickets/                   # 工单
│   ├── tickets.service.ts     # CRUD、状态变更（追加 SYSTEM 消息）
│   ├── tickets.controller.ts  # GET list/:id, POST, PATCH status, POST :id/replay
│   ├── ticket-replay.service.ts  # 基于审计日志的状态回放
│   └── dto/                   # CreateTicketDto, UpdateTicketStatusDto, TicketReplayDto
├── data/                      # 数据映射
│   ├── workbench.mapper.ts    # mapUser, mapTicket, mapKnowledgeDocument, mapAiLog
│   └── workbench.types.ts     # DTO 类型定义
└── common/
    ├── app-config.ts          # configureApp（ValidationPipe、过滤器）, configureSwagger
    └── filters/http-exception.filter.ts  # 统一错误格式 { error, meta }
```

## 关键设计模式

### 鉴权流程
```
请求 → JwtAuthGuard（Passport JWT 策略 → 查库）→ req.user
     → RolesGuard（@Roles() 元数据 → 角色匹配）
     → AuditInterceptor（@Auditable() → 记录操作）
     → FieldPermissionsInterceptor（@FieldPermissions() → 过滤响应字段）
     → Controller → Service
```

### 知识库索引
```
创建/上传文档 → status=PROCESSING → enqueueDocumentIndex(id)
  ├─ Redis 可用 → BullMQ Worker → indexDocument()
  └─ Redis 不可用 → 同步 indexDocument()
indexDocument(): parseMarkdownKnowledge() → EmbeddingService.embed() → Prisma 事务（删旧 chunk → 更新文档 → 建新 chunk）→ 删缓存
```

### 审计日志
```
HTTP 请求 → AuditInterceptor.tap() → AuditService.log(event)
  → 缓冲区累积 → 每 5s 或 50 条 → Prisma.auditLog.createMany()
```

### 优雅降级
- Redis 不可用时：缓存返回 null（查库）、限流放行、索引同步执行、审计队列跳过
- 测试环境（`NODE_ENV=test`）自动跳过 Redis 依赖

## 环境变量

见 `.env.example`，关键变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | — | PostgreSQL 连接串 |
| `REDIS_URL` | — | Redis 连接串 |
| `JWT_SECRET` | — | JWT 签名密钥 |
| `EMBEDDING_PROVIDER` | `local` | `local` / `openai` |
| `AUDIT_LOG_ENABLED` | `true` | 启用审计日志 |
| `AI_PROVIDER` | `mock` | `mock` / `deepseek` |
| `DEEPSEEK_API_BASE` | `https://api.deepseek.com` | DeepSeek API 地址 |
| `DEEPSEEK_MODEL` | `deepseek-v4-pro` | DeepSeek 模型名 |
| `AI_COST_CACHE_HIT_INPUT_PER_MILLION_USD` | 内置默认值 | 可选：缓存命中输入 token 美元 / 百万 token 单价 |
| `AI_COST_CACHE_MISS_INPUT_PER_MILLION_USD` | 内置默认值 | 可选：缓存未命中输入 token 美元 / 百万 token 单价 |
| `AI_COST_OUTPUT_PER_MILLION_USD` | 内置默认值 | 可选：输出 token 美元 / 百万 token 单价 |

## 测试

```bash
pnpm test          # 单元测试（Jest, 7 套件 23 测试）
pnpm test:e2e      # E2E 测试（Supertest, 1 套件 2 测试）
```

测试模式：手工构造 mock 对象（`jest.MockedFunction`），不依赖 `@nestjs/testing` 模块 mock。
mock 依赖按构造函数顺序传入，类型通过 `as unknown as` 转换。

## 常用命令

```bash
pnpm start:dev     # 开发模式（watch）
pnpm build         # 编译
pnpm prisma:generate   # 生成 Prisma Client
pnpm prisma:migrate    # 开发迁移
pnpm prisma:deploy     # 生产迁移
pnpm prisma:seed       # 填充种子数据
```
