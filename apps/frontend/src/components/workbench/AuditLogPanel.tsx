import { useEffect, useState } from 'react';
import { SafetyOutlined } from '@ant-design/icons';
import { Card, Table, Tag, Typography } from 'antd';
import { api, type AuditLog } from '../../api/client';

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

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .auditLogs()
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: '操作者',
      dataIndex: 'actorName',
      key: 'actorName',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'actorRole',
      key: 'actorRole',
      width: 80,
      render: (role: string) => <Tag>{role}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (action: string) => (
        <Tag color={actionColors[action] ?? 'default'}>{action}</Tag>
      ),
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 100,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
  ];

  return (
    <Card
      className="workbench-panel"
      title={
        <div>
          <Typography.Text className="eyebrow">Security</Typography.Text>
          <Typography.Title level={3}>审计日志</Typography.Title>
        </div>
      }
      extra={
        <Tag color="blue">
          <SafetyOutlined />
        </Tag>
      }
    >
      <Table
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={{ pageSize: 20, size: 'small' }}
        rowKey="id"
        scroll={{ x: 720 }}
        size="small"
      />
    </Card>
  );
}
