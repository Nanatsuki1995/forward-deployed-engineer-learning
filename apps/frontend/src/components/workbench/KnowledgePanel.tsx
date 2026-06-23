import { useRef, useState, useCallback } from 'react';
import { Search, UploadCloud } from 'lucide-react';
import { Button, Card, Input, List, Space, Tag, Typography } from 'antd';
import { api, type KnowledgeDocument, type KnowledgeSearchResult } from '../../api/client';
import type { RolePermissions } from '../../lib/workbench';

export function KnowledgePanel({
  documents,
  isUploading,
  permissions,
  onUpload,
}: {
  documents: KnowledgeDocument[];
  isUploading: boolean;
  permissions: RolePermissions;
  onUpload: (input: {
    file: File;
    source?: string;
    title?: string;
  }) => Promise<boolean>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      searchTimerRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const results = await api.searchKnowledge(query.trim(), 5);
          setSearchResults(results);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [],
  );

  async function submitUpload() {
    if (!selectedFile || !permissions.canManageKnowledge) {
      return;
    }

    const isUploaded = await onUpload({
      file: selectedFile,
      title: title.trim(),
      source: source.trim(),
    });

    if (!isUploaded) {
      return;
    }

    setSelectedFile(null);
    setTitle('');
    setSource('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

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
      <div className="knowledge-search">
        <Input
          allowClear
          placeholder="语义搜索知识库..."
          prefix={<Search size={16} />}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {searchResults.length > 0 && (
        <List
          className="knowledge-search-results"
          dataSource={searchResults}
          loading={isSearching}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Typography.Text strong>{item.document.title}</Typography.Text>
                    <Tag color="blue">{item.score.toFixed(4)}</Tag>
                  </Space>
                }
                description={
                  <Typography.Paragraph
                    ellipsis={{ rows: 2 }}
                    type="secondary"
                  >
                    {item.chunk.content}
                  </Typography.Paragraph>
                }
              />
            </List.Item>
          )}
          size="small"
        />
      )}

      {permissions.canManageKnowledge ? (
        <div className="knowledge-upload-form">
          <input
            ref={fileInputRef}
            accept=".md,.markdown,.txt"
            className="knowledge-file-input"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <Space className="knowledge-upload-row" orientation="vertical" size={10}>
            <div className="knowledge-upload-meta">
              <Input
                allowClear
                placeholder="标题"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Input
                allowClear
                placeholder="来源"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </div>
            <div className="knowledge-upload-actions">
              <Button
                icon={<UploadCloud size={16} />}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? selectedFile.name : '选择 Markdown 文件'}
              </Button>
              <Button
                disabled={!selectedFile}
                loading={isUploading}
                onClick={() => void submitUpload()}
                type="primary"
              >
                上传并索引
              </Button>
            </div>
          </Space>
        </div>
      ) : null}

      <div className="knowledge-list">
        {documents.map((document) => (
          <article className="knowledge-list-item" key={document.id}>
            <div className="knowledge-copy">
              <Typography.Title level={4}>{document.title}</Typography.Title>
              <Typography.Text type="secondary">{document.source}</Typography.Text>
            </div>
            <Space wrap size={8}>
              <Tag>{document.status}</Tag>
              <Tag>{document.chunks} chunks</Tag>
              <Tag>{document.citations.length} citations</Tag>
            </Space>
          </article>
        ))}
      </div>
    </Card>
  );
}
