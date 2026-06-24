import { ClockCircleOutlined } from '@ant-design/icons';
import { Card, Timeline, Typography } from 'antd';

const roadmapItems = [
  {
    color: 'green',
    children: 'DTO 参数校验、Swagger API 文档和统一错误格式',
  },
  {
    color: 'blue',
    children: '文件上传、文档解析、向量检索和引用来源',
  },
  {
    color: 'orange',
    children: 'Redis 队列、后台任务、日志、健康检查和 Docker 部署',
  },
  {
    color: 'purple',
    children: '审计日志、操作回放和更细粒度的字段级权限',
  },
];

export function RoadmapPanel() {
  return (
    <Card
      className="workbench-panel"
      title={
        <div>
          <Typography.Text className="eyebrow">Learning Backlog</Typography.Text>
          <Typography.Title level={3}>下一批能力</Typography.Title>
        </div>
      }
    >
      <Timeline
        items={roadmapItems}
        pending={
          <Typography.Text type="secondary">
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            持续迭代...
          </Typography.Text>
        }
      />
    </Card>
  );
}
