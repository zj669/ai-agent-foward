import React from 'react';
import { List, Tag, Input, Button, Space, Card, Typography } from 'antd';
import { UserOutlined, RobotOutlined, DeleteOutlined, PlusOutlined, DatabaseOutlined } from '@ant-design/icons';
import { SnapshotChatMessage } from '@/types/snapshot';

interface MessageHistoryEditorProps {
    value: SnapshotChatMessage[];
    onChange: (value: SnapshotChatMessage[]) => void;
}

const MessageHistoryEditor: React.FC<MessageHistoryEditorProps> = ({ value, onChange }) => {
    // Ensure value is array
    const messages = Array.isArray(value) ? value : [];

    const handleContentChange = (index: number, content: string) => {
        const newMessages = [...messages];
        newMessages[index] = { ...newMessages[index], content };
        onChange(newMessages);
    };

    const handleDelete = (index: number) => {
        const newMessages = messages.filter((_, i) => i !== index);
        onChange(newMessages);
    };

    const handleAdd = (role: 'user' | 'assistant' | 'system') => {
        onChange([...messages, { role, content: '' }]);
    };

    const getIcon = (role: string) => {
        switch (role) {
            case 'user': return <UserOutlined />;
            case 'assistant': return <RobotOutlined />;
            case 'system': return <DatabaseOutlined />;
            default: return <UserOutlined />;
        }
    };

    const getColor = (role: string) => {
        switch (role) {
            case 'user': return 'blue';
            case 'assistant': return 'green';
            case 'system': return 'purple';
            default: return 'default';
        }
    };

    return (
        <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '4px' }}>
            <List
                dataSource={messages}
                split={false}
                renderItem={(msg, index) => (
                    <List.Item style={{ padding: '8px 0' }}>
                        <Card
                            size="small"
                            style={{ width: '100%', borderColor: '#f0f0f0' }}
                            title={
                                <Tag color={getColor(msg.role)} icon={getIcon(msg.role)} style={{ margin: 0 }}>
                                    {msg.role.toUpperCase()}
                                </Tag>
                            }
                            extra={
                                <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDelete(index)}
                                />
                            }
                        >
                            <Input.TextArea
                                value={msg.content}
                                onChange={(e) => handleContentChange(index, e.target.value)}
                                autoSize={{ minRows: 2, maxRows: 6 }}
                                variant="borderless"
                                style={{ padding: 0 }}
                                placeholder="输入消息内容..."
                            />
                        </Card>
                    </List.Item>
                )}
                locale={{ emptyText: '暂无消息历史' }}
            />

            <div style={{ marginTop: 16, paddingBottom: 16 }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                    添加新消息:
                </Typography.Text>
                <Space>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => handleAdd('user')}>
                        User
                    </Button>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => handleAdd('assistant')}>
                        Assistant
                    </Button>
                    <Button size="small" icon={<PlusOutlined />} onClick={() => handleAdd('system')}>
                        System
                    </Button>
                </Space>
            </div>
        </div>
    );
};

export default MessageHistoryEditor;
