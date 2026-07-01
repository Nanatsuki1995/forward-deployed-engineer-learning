# Public Ticket Submission System — Design Spec

> 状态：已批准 | 日期：2026-07-01

## 概述

为现有工单管理系统新增**公开工单录入**能力。游客无需登录即可提交工单，提交后在后台工单列表展示。后台登录用户通过 SSE 实时收到新工单通知，通知持久化存储支持已读/未读管理。

## 非目标

- 不实现评论/回复通知
- 不实现邮件或短信通知
- 不修改现有内部建单流程
- 不添加 WebSocket 依赖

## 架构

```
游客浏览器                     后台用户浏览器
    │                               │
    │ POST /api/tickets/public      │ GET /api/notifications/stream (SSE)
    ▼                               ▼
┌──────────────────────────────────────────────┐
│                NestJS 后端                     │
│  ┌────────────────┐  ┌─────────────────────┐ │
│  │ TicketsController│  │ NotificationsModule  │ │
│  │ (public 端点无鉴权)│──▶│ (SSE + CRUD)         │ │
│  └──────┬─────────┘  └──────────┬──────────┘ │
│         │                        │            │
│         ▼                        ▼            │
│  ┌────────────────┐  ┌─────────────────────┐ │
│  │ TicketsService  │  │ Notification Table   │ │
│  │ (扩展)           │  │ (Prisma)             │ │
│  └────────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────┘
```

## 数据模型变更

### Ticket 表新增字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `submitterName` | String? | | 游客姓名 |
| `submitterPhone` | String? | | 游客手机号 |
| `submitterEmail` | String? | | 游客邮箱 |
| `source` | String | ✓ | `internal` 或 `public`，默认 `internal` |

### 新增 Notification 表

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  ticketId  String
  type      String   // "new_ticket"
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

## API 设计

### 公开端点（无鉴权）

```text
POST /api/tickets/public
Body: {
  title: string (必填),
  description: string (必填),
  category?: string,
  priority?: 'low' | 'medium' | 'high' | 'urgent',
  submitterName?: string,
  submitterPhone?: string,
  submitterEmail?: string,
  tags?: string[]
}
Response: Ticket (201)
```

### 通知端点（需 JWT 鉴权）

```text
GET  /api/notifications/stream     SSE 实时推送（admin + agent）
GET  /api/notifications           查询通知列表（支持分页、已读/未读筛选）
PATCH /api/notifications/:id/read  标记单条已读
PATCH /api/notifications/read-all  全部标记已读
GET  /api/notifications/unread-count  未读数量
```

### SSE 事件格式

```text
event: new_ticket
data: {"id":"...","ticketId":"...","title":"新工单：xxx","message":"...","createdAt":"..."}
```

## 前端设计

### 路由

| 路由 | 页面 | 权限 |
|------|------|:---:|
| `/submit` | 公开工单录入 | 公开 |
| `/tickets` | 工单列表（已有，新增 source 列） | 登录 |
| 侧边栏 | Bell 通知图标 + Badge | admin/agent |

### 录入页 (`/submit`)

- 居中卡片式布局（max-width 480px）
- 移动端响应式：`< 480px` 时卡片全宽 `padding: 16px`
- 表单字段：
  - 标题（必填，Input）
  - 详细描述（必填，TextArea，4 行）
  - 分类（选填，Select）
  - 优先级（选填，Radio/Segmented）
  - 姓名（选填，Input）
  - 手机号（选填，Input）
  - 邮箱（选填，Input）
- 提交成功 → 显示成功提示 + 工单编号
- 提交失败 → 显示错误信息，保留表单内容
- 限流：前端简单防重复提交（按钮 loading + 倒计时 3s）

### 通知组件

- 侧边栏底部新增 Bell 图标
- Ant Design Badge 显示未读数量
- 点击弹出 Dropdown 面板，显示最近 5 条通知
- "查看全部" 跳转通知列表
- SSE 连接在 AuthContext 中管理，登录后自动连接

### 工单列表改造

- 列表项新增 `source` 标签：公开/内部
- 工单详情新增展示游客联系信息（如有）

## 技术实现细节

### 后端

- NestJS `@Sse()` 装饰器 + RxJS `Subject` 实现 SSE
- `NotificationsService` 维护 `Map<userId, Subject>` 管理连接
- 公开端点使用 `@Public()` 装饰器跳过 JWT 鉴权
- `TicketsService.createPublic()` 创建工单后调用 `NotificationsService.push()`
- 通知推送给所有 admin + agent 角色用户

### 前端

- 使用原生 `EventSource` API 消费 SSE
- React Context (`NotificationContext`) 管理通知状态
- 提交表单使用 Ant Design `Form` 组件 + 验证规则
- 移动端适配：CSS media query + Ant Design Grid 响应式

## 测试策略

### 后端测试

| 测试 | 内容 |
|------|------|
| `tickets.service.spec.ts` | 扩展：公开建单写入 submitter 字段 + source |
| `tickets.controller.spec.ts` | 新增：公开端点无鉴权、输入校验 |
| `notifications.service.spec.ts` | 新增：推送、SSE Subject 管理、批量已读 |
| `notifications.controller.spec.ts` | 新增：SSE 端点鉴权、CRUD |
| `app.e2e-spec.ts` | 扩展：公开建单 → 通知生成 → SSE 推送 完整链路 |

### 前端测试

| 测试 | 内容 |
|------|------|
| `SubmitPage.test.tsx` | 新增：表单渲染、必填验证、提交成功/失败、移动端 |
| `NotificationContext.test.tsx` | 新增：SSE 连接、未读计数、标记已读 |
| `WorkbenchLayout.test.tsx` | 扩展：Bell 图标渲染、Badge 显示 |
| `TicketsPage.test.tsx` | 扩展：source 列展示 |

### 验证清单

| 序号 | 验证项 | 预期 |
|:---:|------|------|
| 1 | `pnpm test` 全部通过 | 无失败 |
| 2 | `pnpm lint` 通过 | 0 error |
| 3 | `pnpm build` 通过 | 编译成功 |
| 4 | 公开页面可渲染 | `/submit` 无需登录可访问 |
| 5 | 表单提交 → 后台可见 | 游客提交后工单列表出现 |
| 6 | SSE 通知推送 | 登录用户收到新工单通知 |
| 7 | 移动端布局 | iPhone SE 尺寸表单不溢出 |

## 关键假设

1. Docker 基础设施（PostgreSQL + Redis）在开发和测试中正常运行
2. 现有种子数据不受影响，新增迁移向前兼容
3. SSE 在反向代理（Nginx）环境下需要关闭缓冲（生产部署时配置）
