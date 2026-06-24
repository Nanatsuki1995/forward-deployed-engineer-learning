import { ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Flex,
  Input,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { api, type AuditLog } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { getRolePermissions } from '../lib/workbench';

const actionColors: Record<string, string> = {
  VIEW: 'blue',
  CREATE: 'green',
  UPDATE: 'orange',
  DELETE: 'red',
  LOGIN: 'purple',
  LOGOUT: 'default',
  TOKEN_REFRESH: 'cyan',
  AI_GENERATE: 'magenta',
};

const columns = [
  { title: '操作者', dataIndex: 'actorName', key: 'actorName', width: 120 },
  {
    title: '角色', dataIndex: 'actorRole', key: 'actorRole', width: 80,
    render: (role: string) => <Tag>{role}</Tag>,
  },
  {
    title: '操作', dataIndex: 'action', key: 'action', width: 110,
    render: (action: string) => (
      <Tag color={actionColors[action] ?? 'default'}>{action}</Tag>
    ),
  },
  { title: '资源', dataIndex: 'resource', key: 'resource', width: 100 },
  { title: '路径', dataIndex: 'path', key: 'path', ellipsis: true },
  {
    title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 170,
    render: (v: string) => new Date(v).toLocaleString('zh-CN'),
  },
];

export function AuditLogPage() {
  const { user } = useAuth();
  const permissions = getRolePermissions(user?.role);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [actorFilter, setActorFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.auditLogs({
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(actorFilter.trim() ? { actorId: actorFilter.trim() } : {}),
      });
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, actorFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!permissions.canViewAuditLogs) {
    return (
      <Flex vertical gap={20}>
        <Typography.Title level={2}>审计日志</Typography.Title>
        <Card>
          <Typography.Text type="secondary">
            当前角色无权查看审计日志。需要管理员权限。
          </Typography.Text>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex vertical gap={20}>
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            <SafetyOutlined style={{ marginRight: 10 }} />
            审计日志
          </Typography.Title>
          <Typography.Text type="secondary">
            共 {logs.length} 条操作记录
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>
          刷新
        </Button>
      </Flex>

      <Card>
        <Flex gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
          <Input
            placeholder="按操作者过滤..."
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            placeholder="按操作类型过滤"
            value={actionFilter}
            onChange={setActionFilter}
            allowClear
            style={{ width: 160 }}
            options={Object.keys(actionColors).map((a) => ({ value: a, label: a }))}
          />
        </Flex>
        <Table
          columns={columns}
          dataSource={logs}
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          rowKey="id"
          scroll={{ x: 780 }}
          size="middle"
        />
      </Card>
    </Flex>
  );
}
