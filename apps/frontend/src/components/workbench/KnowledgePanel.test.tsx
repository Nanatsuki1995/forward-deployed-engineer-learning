import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgePanel } from './KnowledgePanel';
import type { KnowledgeDocument } from '../../api/client';
import type { RolePermissions } from '../../lib/workbench';

const documents: KnowledgeDocument[] = [
  {
    id: 'doc-1',
    title: '街道热线知识手册',
    source: 'operations/playbook.md',
    content: '重复工单处理规则',
    status: 'indexed',
    chunks: 2,
    citations: ['重复工单', '人工复核'],
    createdAt: '2026-06-16T00:00:00.000Z',
  },
];

const managePermissions: RolePermissions = {
  canCreateTicket: true,
  canGenerateAi: true,
  canManageKnowledge: true,
  canReviewApproval: true,
  canUpdateTicketStatus: true,
  canViewAuditLogs: false,
  capabilities: ['知识维护'],
  knowledgeMode: '可维护知识库',
  summary: '拥有完整控制面',
};

const readOnlyPermissions: RolePermissions = {
  ...managePermissions,
  canManageKnowledge: false,
  knowledgeMode: '只读知识库',
};

describe('KnowledgePanel', () => {
  it('renders document metadata and upload controls for knowledge managers', () => {
    render(
      <KnowledgePanel
        documents={documents}
        isUploading={false}
        permissions={managePermissions}
        onUpload={vi.fn()}
      />,
    );

    expect(screen.getByText('知识库索引')).toBeInTheDocument();
    expect(screen.getByText('街道热线知识手册')).toBeInTheDocument();
    expect(screen.getByText('2 chunks')).toBeInTheDocument();
    expect(screen.getByText('2 citations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('标题')).toBeInTheDocument();
    expect(screen.getByText('选择 Markdown 文件')).toBeInTheDocument();
  });

  it('submits the selected file with title and source metadata', async () => {
    const onUpload = vi.fn().mockResolvedValue(true);

    render(
      <KnowledgePanel
        documents={documents}
        isUploading={false}
        permissions={managePermissions}
        onUpload={onUpload}
      />,
    );

    const file = new File(['# 处理规则'], 'rules.md', {
      type: 'text/markdown',
    });
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(screen.getByPlaceholderText('标题'), {
      target: { value: '上传标题' },
    });
    fireEvent.change(screen.getByPlaceholderText('来源'), {
      target: { value: 'ops/rules.md' },
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '上传并索引' }));

    expect(onUpload).toHaveBeenCalledWith({
      file,
      title: '上传标题',
      source: 'ops/rules.md',
    });
  });

  it('hides upload controls for read-only users', () => {
    render(
      <KnowledgePanel
        documents={documents}
        isUploading={false}
        permissions={readOnlyPermissions}
        onUpload={vi.fn()}
      />,
    );

    expect(screen.queryByPlaceholderText('标题')).not.toBeInTheDocument();
    expect(screen.queryByText('上传并索引')).not.toBeInTheDocument();
    expect(screen.getByText('只读知识库')).toBeInTheDocument();
  });
});
