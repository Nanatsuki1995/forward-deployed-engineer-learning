import { UploadCloud } from 'lucide-react';
import { Card, Space, Tag, Typography } from 'antd';
import type { KnowledgeDocument } from '../../api/client';
import type { RolePermissions } from '../../lib/workbench';

export function KnowledgePanel({
  documents,
  permissions,
}: {
  documents: KnowledgeDocument[];
  permissions: RolePermissions;
}) {
  return (
    <Card
      className="workbench-panel"
      id="knowledge"
      title={
        <div>
          <Typography.Text className="eyebrow">Knowledge Base</Typography.Text>
          <Typography.Title level={3}>知识库索引</Typography.Title>
        </div>
      }
      extra={
        <Tag color={permissions.canManageKnowledge ? 'green' : 'gold'} icon={null}>
          <Space size={6}>
            <UploadCloud size={16} />
            {permissions.knowledgeMode}
          </Space>
        </Tag>
      }
    >
      <div className="knowledge-list">
        {documents.map((document) => (
          <article className="knowledge-list-item" key={document.id}>
            <div className="knowledge-copy">
              <Typography.Title level={4}>{document.title}</Typography.Title>
              <Typography.Text type="secondary">{document.source}</Typography.Text>
            </div>
            <Tag>{document.chunks} chunks</Tag>
          </article>
        ))}
      </div>
    </Card>
  );
}
