import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createPrismaClientOptions } from '../src/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

async function main() {
  const passwordHash = await hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'FDE Admin',
      role: UserRole.ADMIN,
    },
    create: {
      id: 'user-admin',
      name: 'FDE Admin',
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@example.com' },
    update: {
      name: '现场交付工程师',
      role: UserRole.AGENT,
    },
    create: {
      id: 'user-agent',
      name: '现场交付工程师',
      email: 'agent@example.com',
      passwordHash,
      role: UserRole.AGENT,
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@example.com' },
    update: {
      name: '业务审核人',
      role: UserRole.REVIEWER,
    },
    create: {
      id: 'user-reviewer',
      name: '业务审核人',
      email: 'reviewer@example.com',
      passwordHash,
      role: UserRole.REVIEWER,
    },
  });

  await prisma.knowledgeDocument.upsert({
    where: { id: 'doc-001' },
    update: {},
    create: {
      id: 'doc-001',
      title: '街道热线工单分派规则',
      source: 'operations/playbook.md',
      content:
        '重复工单应先按地理网格、诉求类型、首次受理时间匹配，无法自动确认时进入人工复核。',
      status: 'INDEXED',
      chunks: 8,
      citations: ['第 2 章：重复工单处理', '第 4 章：人工复核'],
      createdAt: new Date('2026-06-01T08:00:00.000Z'),
    },
  });

  await prisma.knowledgeDocument.upsert({
    where: { id: 'doc-002' },
    update: {},
    create: {
      id: 'doc-002',
      title: '知识库权限与审计规范',
      source: 'security/rbac-policy.md',
      content:
        '知识库检索必须根据租户、部门、角色和文档密级过滤，并记录查询人、结果数量和引用来源。',
      status: 'INDEXED',
      chunks: 12,
      citations: ['权限过滤', '审计日志字段'],
      createdAt: new Date('2026-06-03T10:15:00.000Z'),
    },
  });

  await upsertTicket({
    id: 'ticket-1001',
    title: '街道热线工单重复派发',
    description:
      '同一居民关于井盖破损的问题被派发到两个网格，现场人员无法判断哪个流程应继续处理。',
    category: '城市治理',
    status: 'TRIAGE',
    priority: 'HIGH',
    requester: '望江街道热线中心',
    assignee: agent.name,
    assigneeUserId: agent.id,
    tags: ['重复工单', '流程自动化', '权限'],
    createdAt: new Date('2026-06-09T09:30:00.000Z'),
    updatedAt: new Date('2026-06-10T08:10:00.000Z'),
    message: {
      id: 'msg-1001-1',
      author: '热线坐席',
      role: 'REQUESTER',
      content: '两个处置部门都反馈不是自己负责，需要系统判断主责单位。',
      createdAt: new Date('2026-06-09T09:34:00.000Z'),
    },
  });

  await upsertTicket({
    id: 'ticket-1002',
    title: '企业知识库权限不一致',
    description:
      '销售团队能看到售后知识条目，但售后团队无法查看客户合同附件，影响回复效率。',
    category: '企业知识管理',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    requester: '客户成功部',
    assignee: '平台工程师',
    assigneeUserId: admin.id,
    tags: ['RBAC', '知识库', '审计'],
    createdAt: new Date('2026-06-08T13:20:00.000Z'),
    updatedAt: new Date('2026-06-10T11:40:00.000Z'),
    message: {
      id: 'msg-1002-1',
      author: '客户成功经理',
      role: 'REQUESTER',
      content: '请确认知识库检索结果是否遵守部门权限。',
      createdAt: new Date('2026-06-08T13:24:00.000Z'),
    },
  });

  await upsertTicket({
    id: 'ticket-1003',
    title: '医保政策问答需要引用来源',
    description:
      '业务负责人要求 AI 回复医保政策时必须给出政策文件出处，不能只生成自然语言答案。',
    category: '政务问答',
    status: 'PENDING_APPROVAL',
    priority: 'URGENT',
    requester: '民生服务中心',
    assignee: reviewer.name,
    assigneeUserId: reviewer.id,
    tags: ['RAG', '引用来源', '人工确认'],
    createdAt: new Date('2026-06-07T15:05:00.000Z'),
    updatedAt: new Date('2026-06-10T16:30:00.000Z'),
    message: {
      id: 'msg-1003-1',
      author: '民生服务中心',
      role: 'REQUESTER',
      content: '请先给出一版可审核回复，再由业务人员确认后发送。',
      createdAt: new Date('2026-06-07T15:12:00.000Z'),
    },
  });

  console.log('Seed complete. Demo password for all users: password123');
}

async function upsertTicket(input: {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'NEW' | 'TRIAGE' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requester: string;
  assignee: string;
  assigneeUserId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  message: {
    id: string;
    author: string;
    role: 'REQUESTER' | 'AGENT' | 'SYSTEM';
    content: string;
    createdAt: Date;
  };
}) {
  await prisma.ticket.upsert({
    where: { id: input.id },
    update: {},
    create: {
      id: input.id,
      title: input.title,
      description: input.description,
      category: input.category,
      status: input.status,
      priority: input.priority,
      requester: input.requester,
      assignee: input.assignee,
      assigneeUserId: input.assigneeUserId,
      tags: input.tags,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      messages: {
        create: input.message,
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
