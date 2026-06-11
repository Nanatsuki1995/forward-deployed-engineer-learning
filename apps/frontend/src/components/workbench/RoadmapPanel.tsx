import { Card, Typography } from 'antd';

const roadmapItems = [
  'DTO 参数校验、Swagger API 文档和统一错误格式',
  '文件上传、文档解析、向量检索和引用来源',
  'Redis 队列、后台任务、日志、健康检查和 Docker 部署',
  '审计日志、操作回放和更细粒度的字段级权限',
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
      <ul className="roadmap-list">
        {roadmapItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}
