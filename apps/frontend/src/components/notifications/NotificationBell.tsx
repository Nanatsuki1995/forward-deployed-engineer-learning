import { BellOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, Empty, Flex, List, Typography } from 'antd';
import { useNotification } from '../../notifications/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotification();

  const dropdownContent = (
    <Flex vertical style={{ width: 340, maxHeight: 400 }}>
      <Flex
        justify="space-between"
        align="center"
        style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}
      >
        <Typography.Text strong style={{ fontSize: 15 }}>通知</Typography.Text>
        {unreadCount > 0 && (
          <Button size="small" type="link" onClick={markAllRead}>
            全部已读
          </Button>
        )}
      </Flex>
      <div style={{ overflow: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <Empty description="暂无通知" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <List
            dataSource={notifications.slice(0, 10)}
            renderItem={(item) => (
              <List.Item
                onClick={() => {
                  if (!item.isRead) markRead(item.id);
                }}
                style={{
                  cursor: 'pointer',
                  padding: '10px 16px',
                  background: item.isRead ? undefined : '#eff6ff',
                  borderBottom: '1px solid #f8fafc',
                }}
              >
                <List.Item.Meta
                  title={
                    <Flex align="center" gap={6}>
                      {!item.isRead && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#3b82f0',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Typography.Text style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600 }}>
                        {item.title}
                      </Typography.Text>
                    </Flex>
                  }
                  description={
                    <Flex vertical gap={2}>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                        ellipsis
                      >
                        {item.message}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </Typography.Text>
                    </Flex>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </Flex>
  );

  return (
    <Dropdown dropdownRender={() => dropdownContent} trigger={['click']} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button
          icon={<BellOutlined />}
          type="text"
          size="large"
          style={{ color: '#64748b' }}
        />
      </Badge>
    </Dropdown>
  );
}
