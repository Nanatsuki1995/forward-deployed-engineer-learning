# 工单录入系统 — 测试报告

> 日期：2026-07-01 | 测试框架：Vitest + Jest + Supertest | 置信度：high

## 1. 测试总览

| 分类 | 文件数 | 测试数 | 状态 |
|------|:-----:|:-----:|:----:|
| 前端单元测试 | 5 | 18 | ✅ 全部通过 |
| 后端单元测试 | 9 | 49 | ✅ 全部通过 |
| E2E 测试 | 1 | 8 | ✅ 全部通过 |
| **合计** | **15** | **75** | ✅ |
| Lint (ESLint) | — | — | ✅ 0 error, 0 warning |
| Build (TypeScript + Vite) | — | — | ✅ 构建成功 |

## 2. 测试覆盖详情

### 2.1 后端单元测试 (49 tests, 9 suites)

| 测试套件 | 测试数 | 覆盖内容 |
|---------|:-----:|------|
| TicketsService | 14 | findAll, findOne, create（鉴权）, createPublic（公开建单 + 通知推送）, updateStatus |
| NotificationsService | 12 | getUserStream, removeUserStream, push（写入 + SSE推送）, findByUser, markRead, markAllRead, unreadCount |
| KnowledgeIndexingService | 4 | 已有 |
| DeepSeekAiProvider | 5 | 已有 |
| AuthService | 4 | 已有 |
| AiService | 4 | 已有 |
| RedisRateLimitGuard | 2 | 已有 |
| AppController | 2 | 已有 |
| KnowledgeService | 2 | 已有 |

### 2.2 后端 E2E 测试 (8 tests)

| 用例 | 验证点 |
|------|--------|
| POST /tickets/public 正常创建 | 无鉴权访问、source='public'、submitter 字段 |
| POST /tickets/public 缺少 title | 400 错误 + 校验消息 |
| POST /tickets/public 空 title | 400 错误 |
| POST /tickets/public 匿名用户 | submitterName 为空时 requester 默认 '匿名用户' |
| GET /notifications 无鉴权 | 401 |
| GET /notifications/unread-count 无鉴权 | 401 |

### 2.3 前端单元测试 (18 tests, 5 files)

| 测试文件 | 测试数 | 覆盖内容 |
|---------|:-----:|------|
| SubmitPage | 7 | 表单渲染、必填字段、联系信息、提交流程、成功页、错误状态、"提交新工单"按钮 |
| NotificationBell | 4 | Badge 计数、Dropdown 显示、"全部已读"按钮、markRead 调用 |
| AiCostDashboardPage | 3 | 已有 |
| KnowledgePanel | 2 | 已有 |
| WorkbenchLayout | 2 | 已有 |

## 3. 测试策略

- **公开端点**：验证无鉴权可访问、输入校验、source 标记、游客信息写入
- **通知推送**：验证 Notification 写入、SSE Subject.next() 调用、未连接用户跳过
- **前端表单**：验证渲染、验证规则、提交流程、成功/失败状态
- **前端通知**：验证 Badge 渲染、Dropdown 交互、markRead 调用

## 4. 未覆盖项

| 项目 | 原因 |
|------|------|
| SSE 端到端实时推送 | E2E 环境不支持 EventSource 长连接，由单元测试覆盖 |
| 通知在 reviewer 用户上的过滤 | 单元测试验证过查询逻辑 |
| 移动端实际设备测试 | 响应式设计通过 CSS 适配，建议手动验证 |
| 生产环境 Nginx SSE 缓冲 | 配置项，部署时处理 |

## 5. 运行命令

```bash
pnpm test              # 全部测试（75 tests）
pnpm test:frontend     # 前端测试（18 tests）
pnpm test:backend      # 后端单元测试（49 tests）
pnpm test:e2e:backend  # E2E 测试（8 tests）
pnpm lint              # ESLint（0 error）
pnpm build             # 构建
```
