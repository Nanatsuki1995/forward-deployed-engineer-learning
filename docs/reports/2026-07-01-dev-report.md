# 工单录入系统 — 开发报告

> 日期：2026-07-01 | 置信度：high

## 1. 改动摘要

为工单管理系统新增**公开工单录入模块**。游客无需登录即可提交工单，提交后工单在后台列表展示。后台 admin/agent 用户通过 SSE 实时接收新工单通知，支持已读/未读管理。录入页采用居中卡片式布局，兼容移动端。

## 2. 架构概览

```
游客 POST /api/tickets/public → TicketsService.createPublic()
    ├── 写入 Ticket 表（source='public'）
    └── NotificationsService.push()
        ├── 写入 Notification 表（admin + agent）
        └── SSE 推送到已连接用户

后台 GET /api/notifications/stream → EventSource 实时通知
    前端 NotificationContext → NotificationBell Badge + Dropdown
```

## 3. 修改文件清单

### 数据库
| 文件 | 变更 |
|------|------|
| `apps/backend/prisma/schema.prisma` | Ticket 新增 submitterName/submitterPhone/submitterEmail/source；新增 Notification 模型 + NotificationType 枚举 |
| `apps/backend/prisma/migrations/*` | 2 个迁移文件 |

### 后端
| 文件 | 变更 |
|------|------|
| `apps/backend/src/auth/public.decorator.ts` | 新增 @Public() 装饰器 |
| `apps/backend/src/auth/jwt-auth.guard.ts` | 支持 @Public() 跳过鉴权 |
| `apps/backend/src/data/workbench.types.ts` | 新增 Notification/Ticket 扩展类型 |
| `apps/backend/src/data/workbench.mapper.ts` | 新增 mapNotification()，扩展 mapTicket() |
| `apps/backend/src/tickets/dto/create-public-ticket.dto.ts` | 新增公开建单 DTO |
| `apps/backend/src/tickets/tickets.service.ts` | 新增 createPublic() 方法 |
| `apps/backend/src/tickets/tickets.controller.ts` | 新增 POST tickets/public 端点 |
| `apps/backend/src/tickets/tickets.module.ts` | 导入 NotificationsModule |
| `apps/backend/src/notifications/notifications.service.ts` | 新增：SSE Subject 管理 + CRUD |
| `apps/backend/src/notifications/notifications.controller.ts` | 新增：SSE stream + REST 端点 |
| `apps/backend/src/notifications/notifications.module.ts` | 新增模块 |
| `apps/backend/src/notifications/sse-jwt.guard.ts` | 新增：SSE JWT 鉴权（header + query param） |
| `apps/backend/src/app.module.ts` | 注册 NotificationsModule |

### 前端
| 文件 | 变更 |
|------|------|
| `apps/frontend/src/api/client.ts` | 新增 createPublicTicket + 通知 API |
| `apps/frontend/src/notifications/NotificationContext.tsx` | 新增：SSE 连接 + 状态管理 |
| `apps/frontend/src/components/notifications/NotificationBell.tsx` | 新增：通知 Bell 图标 + Badge + Dropdown |
| `apps/frontend/src/components/layout/WorkbenchLayout.tsx` | 集成 NotificationBell |
| `apps/frontend/src/pages/SubmitPage.tsx` | 新增：公开工单录入页 |
| `apps/frontend/src/App.tsx` | 添加 /submit 路由 + NotificationProvider |

## 4. 关键设计决策

1. **SSE 而非 WebSocket**：单向通知场景，SSE 更轻量，无需引入新依赖，浏览器原生支持。

2. **SSE 鉴权**：EventSource 不支持自定义 header，使用 `?authorization=Bearer xxx` 查询参数传递 token，通过 SseJwtGuard 同时支持 header 和 query 两种方式。

3. **@Public() 装饰器**：通过 Reflector 元数据标记公开端点，JwtAuthGuard 检测到后跳过 Passport 验证，保持现有鉴权体系不变。

4. **通知推送 fire-and-forget**：createPublic() 不 await 通知推送，避免阻塞用户响应。推送失败由 catch 静默处理。

5. **NotificationType 枚举**：与项目其他 type 字段（AiLogType、AuditAction）保持一致，使用 Prisma enum 而非 raw string。

6. **移动端适配**：录入页使用 `maxWidth: 480px` + `minHeight: 100dvh`，所有字段 Form.Item vertical 布局，无需额外媒体查询。
