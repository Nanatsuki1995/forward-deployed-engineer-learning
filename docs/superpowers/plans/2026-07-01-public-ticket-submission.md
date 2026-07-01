# 工单录入系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现公开工单录入系统：游客无需登录提交工单，后台 SSE 实时通知，移动端响应式

**Architecture:** NestJS 后端新增公开建单端点 + SSE 通知模块 + Notification 表；React 前端新增公开录入页 + 通知 Bell 组件 + SSE Context

**Tech Stack:** NestJS 11, Prisma 7, React 19, TypeScript, Ant Design 6, RxJS, EventSource API

---

### Task 1: 数据库 Migration（Ticket 扩展 + Notification 表）

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: migration file (generated)

- [ ] **Step 1: 修改 Prisma Schema — Ticket 新增字段**

在 Ticket 模型中添加：
```prisma
model Ticket {
  // ... existing fields ...
  submitterName  String?  // 游客姓名
  submitterPhone String?  // 游客手机号
  submitterEmail String?  // 游客邮箱
  source         String   @default("internal") // internal | public
}
```

- [ ] **Step 2: 新增 Notification 模型**

在 schema.prisma 中添加：
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  ticketId  String
  type      String
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

同时在 User 模型中添加：
```prisma
model User {
  // ... existing fields ...
  notifications Notification[]
}
```

- [ ] **Step 3: 运行 Migration**

```bash
cd apps/backend && npx prisma migrate dev --name add_public_submission
```

- [ ] **Step 4: 生成 Prisma Client**

```bash
cd apps/backend && npx prisma generate
```

- [ ] **Step 5: 提交**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: add public ticket submission fields and Notification model"
```

---

### Task 2: 后端 Workbench Types 扩展

**Files:**
- Modify: `apps/backend/src/data/workbench.types.ts`
- Modify: `apps/backend/src/data/workbench.mapper.ts`

- [ ] **Step 1: 扩展 Ticket DTO 类型**

在 `workbench.types.ts` 中，给 Ticket 接口添加：
```typescript
export interface Ticket {
  // ... existing fields ...
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  source: 'internal' | 'public';
}
```

- [ ] **Step 2: 新增 Notification 类型**

```typescript
export interface Notification {
  id: string;
  userId: string;
  ticketId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
```

- [ ] **Step 3: 扩展 Mapper**

在 `workbench.mapper.ts` 中：
1. `mapTicket()` 中添加 `submitterName`, `submitterPhone`, `submitterEmail`, `source` 映射
2. 新增 `mapNotification()` 函数

- [ ] **Step 4: 提交**

---

### Task 3: 后端公开建单端点

**Files:**
- Modify: `apps/backend/src/tickets/dto/create-ticket.dto.ts` (扩展)
- Create: `apps/backend/src/tickets/dto/create-public-ticket.dto.ts`
- Modify: `apps/backend/src/tickets/tickets.service.ts`
- Modify: `apps/backend/src/tickets/tickets.controller.ts`
- Create: `apps/backend/src/auth/public.decorator.ts`
- Modify: `apps/backend/src/auth/jwt-auth.guard.ts` (支持 @Public())

- [ ] **Step 1: 创建 @Public() 装饰器**

```typescript
// apps/backend/src/auth/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: 修改 JwtAuthGuard 支持 @Public()**

```typescript
// apps/backend/src/auth/jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 3: 创建 CreatePublicTicketDto**

```typescript
// apps/backend/src/tickets/dto/create-public-ticket.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePublicTicketDto {
  @ApiProperty({ example: '数据看板无法访问' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: '客户反馈生产环境数据看板返回 403' })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitterName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submitterPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  submitterEmail?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

- [ ] **Step 4: TicketsService 新增 createPublic() 方法**

```typescript
// apps/backend/src/tickets/tickets.service.ts
async createPublic(input: CreatePublicTicketDto) {
  const ticket = await this.prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      category: input.category ?? '未分类',
      priority: toPrismaTicketPriority(input.priority),
      requester: input.submitterName ?? '匿名用户',
      assignee: '待分派',
      source: 'public',
      submitterName: input.submitterName,
      submitterPhone: input.submitterPhone,
      submitterEmail: input.submitterEmail,
      tags: input.tags ?? [],
      messages: {
        create: {
          author: input.submitterName ?? '匿名用户',
          role: MessageRole.REQUESTER,
          content: input.description,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  return mapTicket(ticket);
}
```

- [ ] **Step 5: TicketsController 新增公开端点**

```typescript
// 在 tickets.controller.ts 中添加
@Post('public')
@Public()
@Auditable('ticket')
@ApiOperation({ summary: '公开创建工单（无需登录）' })
createPublic(@Body() body: CreatePublicTicketDto) {
  return this.ticketsService.createPublic(body);
}
```

- [ ] **Step 6: 更新 AuthModule 导出 Public 相关**

确保 JwtAuthGuard 的 Reflector 注入正常工作，更新 AuthModule provider。

- [ ] **Step 7: 提交**

---

### Task 4: Notification 模块（后端 SSE + CRUD）

**Files:**
- Create: `apps/backend/src/notifications/notifications.module.ts`
- Create: `apps/backend/src/notifications/notifications.service.ts`
- Create: `apps/backend/src/notifications/notifications.controller.ts`
- Create: `apps/backend/src/notifications/dto/query-notifications.dto.ts`
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/tickets/tickets.module.ts`
- Modify: `apps/backend/src/tickets/tickets.service.ts` (建单后推送通知)

- [ ] **Step 1: 创建 NotificationsService**

```typescript
// apps/backend/src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private userStreams = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly prisma: PrismaService) {}

  getUserStream(userId: string): Subject<MessageEvent> {
    if (!this.userStreams.has(userId)) {
      this.userStreams.set(userId, new Subject<MessageEvent>());
    }
    return this.userStreams.get(userId)!;
  }

  removeUserStream(userId: string) {
    this.userStreams.get(userId)?.complete();
    this.userStreams.delete(userId);
  }

  async push(ticketId: string, ticketTitle: string) {
    // 查找所有 admin + agent 用户
    const users = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'AGENT'] } },
      select: { id: true },
    });

    for (const user of users) {
      // 持久化通知
      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          ticketId,
          type: 'new_ticket',
          title: `新工单：${ticketTitle}`,
          message: `游客提交了新的工单"${ticketTitle}"，请及时处理。`,
        },
      });

      // SSE 推送
      const stream = this.userStreams.get(user.id);
      if (stream) {
        stream.next({
          data: JSON.stringify({
            id: notification.id,
            ticketId,
            type: 'new_ticket',
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt.toISOString(),
          }),
        } as MessageEvent);
      }
    }
  }

  async findByUser(userId: string, { isRead }: { isRead?: boolean } = {}) {
    return this.prisma.notification.findMany({
      where: { userId, ...(isRead !== undefined ? { isRead } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
```

- [ ] **Step 2: 创建 NotificationsController**

```typescript
// apps/backend/src/notifications/notifications.controller.ts
import { Controller, Get, Param, Patch, Query, Sse, UseGuards, MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationsService } from './notifications.service';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'SSE 实时通知流' })
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.notificationsService.getUserStream(user.id).asObservable();
  }

  @Get()
  @ApiOperation({ summary: '查询通知列表' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('isRead') isRead?: string) {
    const filter = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    return this.notificationsService.findByUser(user.id, filter !== undefined ? { isRead: filter } : {});
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记单条已读' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读数量' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user.id);
  }
}
```

- [ ] **Step 3: 创建 NotificationsModule**

```typescript
// apps/backend/src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 4: 在 AppModule 中注册**

```typescript
// 在 app.module.ts imports 中添加 NotificationsModule
```

- [ ] **Step 5: Ticket 创建后推送通知**

修改 `tickets.service.ts`，注入 `NotificationsService`，在 `createPublic()` 中创建工单后调用：
```typescript
await this.notificationsService.push(ticket.id, ticket.title);
```
修改 `tickets.module.ts`，导入 `NotificationsModule`。

- [ ] **Step 6: 提交**

---

### Task 5: 前端 API Client 扩展

**Files:**
- Modify: `apps/frontend/src/api/client.ts`

- [ ] **Step 1: 添加公开建单 + 通知 API**

```typescript
// 在 api 对象中添加
createPublicTicket: (body: {
  title: string;
  description: string;
  category?: string;
  priority?: string;
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  tags?: string[];
}) =>
  request<Ticket>('/tickets/public', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  }),

notifications: () => request<Notification[]>('/notifications'),

markNotificationRead: (id: string) =>
  request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),

markAllNotificationsRead: () =>
  request<void>('/notifications/read-all', { method: 'PATCH' }),

unreadNotificationCount: () =>
  request<number>('/notifications/unread-count'),
```

添加 `Notification` 类型：
```typescript
export interface Notification {
  id: string;
  userId: string;
  ticketId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: 提交**

---

### Task 6: 前端 SSE Context

**Files:**
- Create: `apps/frontend/src/notifications/NotificationContext.tsx`

- [ ] **Step 1: 创建 NotificationContext**

```typescript
// apps/frontend/src/notifications/NotificationContext.tsx
import { notification } from 'antd';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, type Notification as NotifItem } from '../api/client';
import { useAuth } from '../auth/useAuth';

interface NotificationContextValue {
  notifications: NotifItem[];
  unreadCount: number;
  connected: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [apiNotification, contextHolder] = notification.useNotification();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    try {
      const list = await api.notifications();
      setNotifications(list);
    } catch { /* SSE 连接失败不影响主流程 */ }
  }, []);

  // SSE 连接
  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) return;

    const token = window.localStorage.getItem('fde-learning-access-token');
    if (!token) return;

    const es = new EventSource(`/api/notifications/stream?authorization=Bearer ${encodeURIComponent(token)}`);
    eventSourceRef.current = es;

    es.addEventListener('new_ticket', (event) => {
      const data = JSON.parse(event.data) as NotifItem;
      setNotifications((prev) => [data, ...prev]);
      apiNotification.info({
        message: data.title,
        description: data.message,
        placement: 'bottomRight',
      });
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      // 5 秒后自动重连（EventSource 默认行为）
    };

    // 加载历史通知
    void loadNotifications();

    return () => {
      es.close();
      setConnected(false);
    };
  }, [user, loadNotifications, apiNotification]);

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, connected, markRead, markAllRead }}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
```

- [ ] **Step 2: 提交**

---

### Task 7: 前端通知 Bell 组件

**Files:**
- Create: `apps/frontend/src/components/notifications/NotificationBell.tsx`
- Modify: `apps/frontend/src/components/layout/WorkbenchLayout.tsx`

- [ ] **Step 1: 创建 NotificationBell 组件**

```typescript
// apps/frontend/src/components/notifications/NotificationBell.tsx
import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, Empty, Flex, List, Typography } from 'antd';
import { useNotification } from '../../notifications/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotification();

  const items = [
    {
      key: 'list',
      label: (
        <Flex vertical style={{ width: 320, maxHeight: 360, overflow: 'auto' }}>
          <Flex justify="space-between" align="center" style={{ padding: '8px 0' }}>
            <Typography.Text strong>通知</Typography.Text>
            {unreadCount > 0 && (
              <Button size="small" type="link" onClick={markAllRead}>全部已读</Button>
            )}
          </Flex>
          {notifications.length === 0 ? (
            <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List
              dataSource={notifications.slice(0, 5)}
              renderItem={(item) => (
                <List.Item
                  style={{ background: item.isRead ? undefined : '#eff6ff', padding: '8px 12px', cursor: 'pointer' }}
                  onClick={() => { if (!item.isRead) markRead(item.id); }}
                >
                  <List.Item.Meta
                    title={<Typography.Text style={{ fontSize: 13 }}>{item.title}</Typography.Text>}
                    description={
                      <Flex vertical gap={2}>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.message}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(item.createdAt).toLocaleString('zh-CN')}
                        </Typography.Text>
                      </Flex>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Flex>
      ),
    },
  ];

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button icon={<BellOutlined />} type="text" size="large" style={{ color: '#64748b' }} />
      </Badge>
    </Dropdown>
  );
}
```

- [ ] **Step 2: 在 WorkbenchLayout 中集成**

在侧边栏底部或 header 添加 `<NotificationBell />`。

- [ ] **Step 3: 在 App.tsx 中包裹 NotificationProvider**

```typescript
// App.tsx - 在 AuthProvider 内部包裹 NotificationProvider
```

- [ ] **Step 4: 提交**

---

### Task 8: 前端公开录入页面

**Files:**
- Create: `apps/frontend/src/pages/SubmitPage.tsx`
- Create: `apps/frontend/src/pages/SubmitPage.test.tsx`
- Modify: `apps/frontend/src/App.tsx` (add route)

- [ ] **Step 1: 创建 SubmitPage 组件**

```typescript
// apps/frontend/src/pages/SubmitPage.tsx
import { CheckCircleOutlined, FormOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Radio, Result, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import { api } from '../api/client';

const { TextArea } = Input;
const { Title, Text } = Typography;

const categoryOptions = [
  '权限问题', '数据异常', '系统故障', '功能咨询',
  '账号问题', '报表需求', '接口对接', '其他',
].map((v) => ({ value: v, label: v }));

const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export function SubmitPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const { message } = App.useApp();

  const onFinish = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const ticket = await api.createPublicTicket({
        title: values.title as string,
        description: values.description as string,
        category: values.category as string | undefined,
        priority: values.priority as string | undefined,
        submitterName: values.submitterName as string | undefined,
        submitterPhone: values.submitterPhone as string | undefined,
        submitterEmail: values.submitterEmail as string | undefined,
        tags: values.tags as string[] | undefined,
      });
      setTicketId(ticket.id);
      setSubmitted(true);
      message.success('工单提交成功！');
    } catch {
      message.error('提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: 16,
      }}>
        <Card style={{ width: '100%', maxWidth: 480 }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
            status="success"
            title="工单提交成功"
            subTitle={`工单编号：${ticketId}，我们会尽快处理您的问题。`}
            extra={[
              <Button key="new" type="primary" onClick={() => { setSubmitted(false); form.resetFields(); }}>
                提交新工单
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', padding: 16,
    }}>
      <Card style={{ width: '100%', maxWidth: 480 }} styles={{ body: { padding: '24px 24px 32px' } }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: '#eff6ff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <FormOutlined style={{ fontSize: 24, color: '#3b82f0' }} />
          </div>
          <Title level={4} style={{ margin: 0 }}>提交工单</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>请描述您的问题，我们会尽快处理</Text>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          {/* 必填 */}
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入工单标题' }]}>
            <Input placeholder="一句话描述问题" maxLength={200} />
          </Form.Item>

          <Form.Item name="description" label="详细描述" rules={[{ required: true, message: '请描述问题详情' }]}>
            <TextArea rows={4} placeholder="请详细描述遇到的问题，如发生时间、影响范围等" maxLength={2000} showCount />
          </Form.Item>

          {/* 选填 */}
          <Form.Item name="priority" label="优先级">
            <Radio.Group optionType="button" buttonStyle="solid" size="small">
              {priorityOptions.map((opt) => (
                <Radio.Button key={opt.value} value={opt.value}>{opt.label}</Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="category" label="分类">
            <Select placeholder="选择问题类型" options={categoryOptions} allowClear />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后回车" style={{ width: '100%' }} />
          </Form.Item>

          {/* 联系信息 */}
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>联系信息（选填，方便我们反馈处理结果）</Text>

          <Space style={{ width: '100%' }} direction="vertical" size={12}>
            <Form.Item name="submitterName" noStyle>
              <Input placeholder="姓名" />
            </Form.Item>
            <Form.Item name="submitterPhone" noStyle>
              <Input placeholder="手机号" />
            </Form.Item>
            <Form.Item name="submitterEmail" noStyle rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
              <Input placeholder="邮箱" type="email" />
            </Form.Item>
          </Space>

          {/* Submit */}
          <Form.Item style={{ marginTop: 20, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitting} block size="large"
              style={{ height: 44, fontSize: 15, fontWeight: 600 }}>
              提交工单
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: App.tsx 添加路由**

```typescript
// 在 App.tsx 中添加，放在 ProtectedRoute 之外
<Route element={<SubmitPage />} path="/submit" />
```

- [ ] **Step 3: 移动端样式适配**

SubmitPage 已使用 `maxWidth: 480` + `100dvh` + `padding: 16`，确保移动端不溢出。表单使用 Ant Design `layout="vertical"` 响应式布局。

- [ ] **Step 4: 提交**

---

### Task 9: 后端单元测试 — Tickets

**Files:**
- Modify: `apps/backend/src/tickets/tickets.service.ts` (添加 NotificationsService 注入)
- Create: `apps/backend/src/tickets/tickets.service.spec.ts` (已存在则扩展)

- [ ] **Step 1: 编写 createPublic 测试**

```typescript
// 在 tickets.service.spec.ts 中添加
describe('createPublic', () => {
  it('should create a ticket with public source', async () => {
    const dto = {
      title: '测试工单',
      description: '测试描述',
      submitterName: '张三',
      submitterPhone: '13800138000',
      submitterEmail: 'test@example.com',
      category: '权限问题',
      priority: 'high',
    };

    const ticket = await service.createPublic(dto);

    expect(ticket.source).toBe('public');
    expect(ticket.submitterName).toBe('张三');
    expect(ticket.submitterPhone).toBe('13800138000');
    expect(ticket.submitterEmail).toBe('test@example.com');
    expect(ticket.requester).toBe('张三');
  });

  it('should default requester to 匿名用户 when no name provided', async () => {
    const ticket = await service.createPublic({
      title: '测试',
      description: '测试',
    });

    expect(ticket.requester).toBe('匿名用户');
  });

  it('should call notificationsService.push after creation', async () => {
    const spy = jest.spyOn(notificationsService, 'push');
    const ticket = await service.createPublic({ title: 'T', description: 'D' });
    expect(spy).toHaveBeenCalledWith(ticket.id, ticket.title);
  });
});
```

- [ ] **Step 2: 运行测试确认通过**

- [ ] **Step 3: 提交**

---

### Task 10: 后端单元测试 — Notifications

**Files:**
- Create: `apps/backend/src/notifications/notifications.service.spec.ts`
- Create: `apps/backend/src/notifications/notifications.controller.spec.ts`

- [ ] **Step 1: NotificationsService 单元测试**

```typescript
// notifications.service.spec.ts
describe('NotificationsService', () => {
  describe('push', () => {
    it('should create notifications for all admin and agent users', async () => {
      // Mock prisma: users = [admin1, agent1, reviewer1]
      // reviewer 不应收到通知
    });

    it('should push SSE event to connected users', async () => {
      // 模拟 userStreams 中有 admin 的 subject
      // 验证 subject.next() 被调用
    });
  });

  describe('findByUser', () => {
    it('should return notifications for user', async () => {});
    it('should filter by isRead', async () => {});
  });

  describe('markRead', () => {
    it('should mark single notification as read', async () => {});
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read', async () => {});
  });

  describe('unreadCount', () => {
    it('should return count of unread notifications', async () => {});
  });
});
```

- [ ] **Step 2: NotificationsController 单元测试**

```typescript
// 测试 SSE stream 端点
// 测试 CRUD 端点
// 测试 Roles guard
```

- [ ] **Step 3: 运行测试**

- [ ] **Step 4: 提交**

---

### Task 11: 后端 E2E 测试

**Files:**
- Modify: `apps/backend/test/app.e2e-spec.ts`

- [ ] **Step 1: 编写端到端测试**

```typescript
describe('Public Ticket Submission (e2e)', () => {
  it('POST /api/tickets/public should create ticket without auth', async () => {
    const res = await request(app.getHttpServer())
      .post('/tickets/public')
      .send({ title: 'E2E 工单', description: '端到端测试' })
      .expect(201);

    expect(res.body.source).toBe('public');
  });

  it('POST /api/tickets/public should return 400 on missing title', async () => {
    await request(app.getHttpServer())
      .post('/tickets/public')
      .send({ description: 'no title' })
      .expect(400);
  });
});

describe('Notifications (e2e)', () => {
  it('GET /api/notifications should require auth', async () => {
    await request(app.getHttpServer()).get('/notifications').expect(401);
  });

  // 完整链路：公开建单 → 通知生成 → 登录后查询通知
});
```

- [ ] **Step 2: 运行 E2E 测试**

- [ ] **Step 3: 提交**

---

### Task 12: 前端单元测试

**Files:**
- Create: `apps/frontend/src/pages/SubmitPage.test.tsx`
- Create: `apps/frontend/src/components/notifications/NotificationBell.test.tsx`

- [ ] **Step 1: SubmitPage 测试**

```typescript
describe('SubmitPage', () => {
  it('should render the form with required fields', () => {});
  it('should show validation errors on empty submit', () => {});
  it('should submit successfully and show result page', () => {});
  it('should display error message on API failure', () => {});
  it('should show "submit another" button after success', () => {});
});
```

- [ ] **Step 2: NotificationBell 测试**

```typescript
describe('NotificationBell', () => {
  it('should display unread badge count', () => {});
  it('should show notification list on click', () => {});
  it('should call markRead on click unread item', () => {});
  it('should show empty state when no notifications', () => {});
});
```

- [ ] **Step 3: 运行前端测试**

```bash
pnpm test:frontend
```

- [ ] **Step 4: 提交**

---

### Task 13: 完整验证 + 构建

**Files:** 无新增

- [ ] **Step 1: 运行全量测试**

```bash
pnpm test
```
预期：全部通过

- [ ] **Step 2: 运行 lint**

```bash
pnpm lint
```
预期：0 error, 0 warning

- [ ] **Step 3: 运行 build**

```bash
pnpm build
```
预期：编译成功

- [ ] **Step 4: 启动服务烟雾测试**

```bash
pnpm dev:backend &  # 启动后端
# 验证 POST /api/tickets/public 返回 201
# 验证 GET /api/health 正常
# 验证 /submit 页面可访问
```

- [ ] **Step 5: 提交**

---

### Task 14: 开发报告 + 测试报告

**Files:**
- Create: `docs/reports/2026-07-01-dev-report.md`
- Create: `docs/reports/2026-07-01-test-report.md`

最终生成两份报告：
1. **开发报告**：改动摘要、架构、修改文件列表、关键设计决策
2. **测试报告**：测试覆盖范围、通过/失败统计、未覆盖项说明
