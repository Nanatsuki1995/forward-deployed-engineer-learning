import { ClockCircleOutlined, NodeIndexOutlined } from '@ant-design/icons';
import { Card, Flex, Timeline, Typography } from 'antd';

const phases = [
  {
    color: 'green' as const,
    label: '已完成',
    children: 'React + NestJS 项目骨架、JWT 鉴权、RBAC 权限模型',
  },
  {
    color: 'green' as const,
    label: '已完成',
    children: '工单 CRUD、状态流转、知识库上传与语义搜索',
  },
  {
    color: 'green' as const,
    label: '已完成',
    children: 'AI 回复建议、工单摘要、DeepSeek V4 Pro 接入',
  },
  {
    color: 'blue' as const,
    label: '进行中',
    children: 'DTO 参数校验、Swagger API 文档和统一错误格式',
  },
  {
    color: 'orange' as const,
    label: '计划中',
    children: '文件上传、文档解析、向量检索和引用来源',
  },
  {
    color: 'orange' as const,
    label: '计划中',
    children: 'Redis 队列、后台任务、日志、健康检查和 Docker 部署',
  },
  {
    color: 'purple' as const,
    label: '未来',
    children: '审计日志、操作回放和更细粒度的字段级权限',
  },
];

export function RoadmapPage() {
  return (
    <Flex vertical gap={20}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          <NodeIndexOutlined style={{ marginRight: 10 }} />
          学习路线
        </Typography.Title>
        <Typography.Text type="secondary">
          Forward Deployed AI Engineer 能力建设进度
        </Typography.Text>
      </div>

      <Card variant="borderless">
        <Timeline
          mode="left"
          items={phases.map((p) => ({
            color: p.color,
            label: (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {p.label}
              </Typography.Text>
            ),
            children: p.children,
          }))}
          pending={
            <Typography.Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              持续迭代...
            </Typography.Text>
          }
        />
      </Card>
    </Flex>
  );
}
