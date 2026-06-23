# Frontend — AI 工单助手工作台

React 19 + TypeScript + Vite + Ant Design 6 + React Router 7

## 目录结构

```text
src/
├── main.tsx                     # 入口：StrictMode → BrowserRouter → AuthProvider
├── App.tsx                      # 路由定义、Ant Design 主题配置
├── App.less                     # 全局样式
├── api/
│   └── client.ts                # HTTP 客户端
│       # - localStorage 存储 JWT（access + refresh token）
│       # - 自动附加 Authorization header
│       # - 401 自动刷新 token（dedup 并发请求）
│       # - JSON / FormData 双模式
│       # - 导出类型：User, Ticket, KnowledgeDocument, AiLog, AuditLog 等
├── auth/
│   ├── auth-context.ts          # AuthContextValue 类型、AuthStatus
│   ├── AuthContext.tsx           # AuthProvider：启动时恢复会话、login/logout
│   └── useAuth.ts               # useAuth() hook
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx   # 检查登录态，未登录跳转 /login
│   ├── layout/
│   │   └── WorkbenchLayout.tsx  # Ant Design Sider + 导航 + 角色卡片 + 退出
│   └── workbench/
│       ├── MetricGrid.tsx       # 4 个指标卡片：健康、工单数、知识数、权限
│       ├── TicketQueue.tsx      # 工单列表（搜索 + 优先级标识 + 状态标签）
│       ├── TicketDetail.tsx     # 工单详情（描述、标签、状态流转、AI 操作）
│       ├── KnowledgePanel.tsx   # 知识库（上传表单 + 向量搜索 + 文档列表）
│       ├── AuditLogPanel.tsx    # 审计日志表格（仅 admin）
│       └── RoadmapPanel.tsx     # 功能路线图
├── pages/
│   ├── LoginPage.tsx            # 登录页（邮箱 + 密码 + 演示账号快捷填入）
│   └── HomePage.tsx             # 工作台首页（组合所有组件、数据加载、操作处理）
├── lib/
│   └── workbench.ts             # 工具函数
│       # - getRolePermissions(role) → RolePermissions
│       # - statusLabels / priorityLabels / roleLabels
│       # - getErrorMessage()
└── test/
    └── setup.ts                 # Vitest + @testing-library/jest-dom 配置
```

## 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | LoginPage | 公开，已登录自动跳转 `/` |
| `/` | ProtectedRoute → WorkbenchLayout → HomePage | 需要登录 |

## 鉴权流程

```
App 启动 → AuthProvider mount
  ├─ 有 token → api.me() 恢复会话 → status=authenticated
  └─ 无 token → status=anonymous → 跳转 /login

登录 → api.login() → 存储 token → status=authenticated

API 调用 → 401 → api.refreshSession()（去重）
  ├─ 成功 → 重试原请求
  └─ 失败 → 清除 token → 跳转 /login
```

## 权限控制

前端权限通过 `getRolePermissions(user.role)` 计算，在组件中用于：

- `canCreateTicket` — 控制创建工单按钮
- `canManageKnowledge` — 控制知识库上传表单显示
- `canGenerateAi` — 控制 AI 建议/摘要按钮
- `canReviewApproval` — 控制审核确认操作
- `canViewAuditLogs` — 控制审计日志面板显示（仅 admin）

**注意**：前端权限是 UX 层面的，真正的安全边界在后端的 RolesGuard 和 FieldPermissionsInterceptor。

## 状态管理

不使用 Redux/Zustand，所有状态通过 React `useState` + `useCallback` 管理在 `HomePage` 中：

- `tickets` / `documents` / `aiLogs` — 数据列表
- `selectedTicketId` — 当前选中工单
- `query` — 工单搜索关键词
- `isLoading` / `isGenerating` / `isUploadingKnowledge` / `isUpdatingStatus` — 加载状态
- `error` — 错误信息

## 关键组件交互

```
HomePage
├── MetricGrid (health, ticketsCount, documentsCount, permissions, user)
├── TicketQueue (query, selectedTicketId, tickets, onSelect)
├── TicketDetail (selectedTicket, permissions, AI actions, status actions)
├── KnowledgePanel (documents, upload form, search input)
│   └── search → api.searchKnowledge() → 搜索结果列表
└── AuditLogPanel (仅 admin, 自动加载 api.auditLogs())
```

## 测试

```bash
pnpm test          # Vitest + jsdom（1 测试文件，3 测试）
```

测试文件：`KnowledgePanel.test.tsx`，使用 `@testing-library/react` 渲染组件，验证上传表单和权限控制。

## 开发

```bash
pnpm dev           # Vite 开发服务器（localhost:5173，/api 代理到 localhost:3000）
pnpm build         # tsc + vite build → dist/
pnpm lint          # ESLint
pnpm preview       # 预览生产构建
```
