import { CloudUploadOutlined, ReloadOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type KnowledgeDocument, type KnowledgeSearchResult } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { MarkdownViewer } from '../components/MarkdownViewer';
import { getErrorMessage, getRolePermissions } from '../lib/workbench';

export function KnowledgePage() {
  const { logout, user } = useAuth();
  const permissions = getRolePermissions(user?.role);

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await api.knowledge());
    } catch {
      if (!api.hasStoredSession()) await logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const doSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await api.searchKnowledge(q.trim(), 5)); } catch { setSearchResults([]); } finally { setSearching(false); }
    }, 300);
  }, []);

  async function upload() {
    if (!selectedFile || !permissions.canManageKnowledge) return;
    setUploading(true);
    setError(null);
    try {
      const doc = await api.uploadKnowledgeDocument({
        file: selectedFile,
        title: title.trim(),
        source: source.trim(),
      });
      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      setSelectedFile(null);
      setTitle('');
      setSource('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(getErrorMessage(e, '上传失败'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Flex vertical gap={20}>
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            知识库
          </Typography.Title>
          <Typography.Text type="secondary">
            {documents.length} 篇文档 · {permissions.knowledgeMode}
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </Flex>

      {error && <Alert showIcon message={error} type="error" closable onClose={() => setError(null)} />}

      <Card title="语义搜索" size="small">
        <Input
          allowClear
          placeholder="输入关键词搜索知识库..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => doSearch(e.target.value)}
        />
        {searching && <Typography.Text type="secondary">搜索中...</Typography.Text>}
        {searchResults.length > 0 && (
          <List
            style={{ marginTop: 12 }}
            dataSource={searchResults}
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
                    <Typography.Paragraph ellipsis={{ rows: 2 }} type="secondary">
                      {item.chunk.content}
                    </Typography.Paragraph>
                  }
                />
              </List.Item>
            )}
            size="small"
          />
        )}
      </Card>

      {permissions.canManageKnowledge && (
        <Card title="上传文档" size="small">
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.txt"
            style={{ display: 'none' }}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <Flex vertical gap={12}>
            <Flex gap={12} wrap="wrap">
              <Input
                placeholder="标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ flex: 1, minWidth: 160 }}
                allowClear
              />
              <Input
                placeholder="来源"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                style={{ flex: 1, minWidth: 160 }}
                allowClear
              />
            </Flex>
            <Space>
              <Button icon={<CloudUploadOutlined />} onClick={() => fileRef.current?.click()}>
                {selectedFile ? selectedFile.name : '选择 Markdown 文件'}
              </Button>
              <Button type="primary" disabled={!selectedFile} loading={uploading} onClick={() => void upload()}>
                上传并索引
              </Button>
            </Space>
          </Flex>
        </Card>
      )}

      <Card title={`文档列表 (${documents.length})`} styles={{ body: { padding: 0 } }}>
        {documents.length === 0 ? (
          <div style={{ padding: 40 }}><Empty description="暂无文档" /></div>
        ) : (
          <List
            dataSource={documents}
            renderItem={(doc) => (
              <List.Item style={{ padding: '14px 24px' }}>
                <Flex vertical gap={6} style={{ width: '100%' }}>
                  <Flex justify="space-between" align="center" wrap gap={8}>
                    <Typography.Title level={5} style={{ margin: 0 }}>{doc.title}</Typography.Title>
                    <Space size={4}>
                      <Tag>{doc.status}</Tag>
                      <Tag>{doc.chunks} chunks</Tag>
                      <Tag>{doc.citations.length} citations</Tag>
                    </Space>
                  </Flex>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{doc.source}</Typography.Text>
                  {doc.content && (
                    <Button
                      type="link"
                      size="small"
                      icon={<RobotOutlined />}
                      onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                      style={{ padding: 0, alignSelf: 'flex-start' }}
                    >
                      {expandedDoc === doc.id ? '收起' : '预览内容'}
                    </Button>
                  )}
                  {expandedDoc === doc.id && doc.content && (
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', marginTop: 4 }}>
                      <MarkdownViewer content={doc.content} />
                    </div>
                  )}
                </Flex>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Flex>
  );
}
