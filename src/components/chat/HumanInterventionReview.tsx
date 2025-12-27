import React, { useState } from 'react';
import { Card, Button, Space, Typography, message, Spin } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import SnapshotViewer from './SnapshotViewer';

const { Text, Title } = Typography;

interface HumanInterventionReviewProps {
    agentId: string;            // 新增: 需要agentId传递给SnapshotViewer
    conversationId: string;
    nodeId: string;
    nodeName: string;
    checkMessage: string;
    onReview: (data: { approved: boolean }) => Promise<void>;
}

const HumanInterventionReview: React.FC<HumanInterventionReviewProps> = ({
    agentId,
    conversationId,
    nodeId,
    nodeName,
    checkMessage,
    onReview
}) => {
    const [loading, setLoading] = useState(false);
    const [showSnapshot, setShowSnapshot] = useState(false);

    const handleReview = async (approved: boolean) => {
        setLoading(true);
        try {
            await onReview({ approved });
            message.success(approved ? '已批准，正在恢复执行...' : '已拒绝');
        } catch (error) {
            console.error('Review failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
            className="human-intervention-review"
            style={{
                margin: '12px 0',
                background: 'linear-gradient(135deg, rgba(250, 173, 20, 0.15) 0%, rgba(250, 173, 20, 0.05) 100%)',
                border: '1px solid rgba(250, 173, 20, 0.3)',
                borderRadius: 12,
                backdropFilter: 'blur(10px)'
            }}
            bodyStyle={{ padding: '16px 20px' }}
        >
            <Spin spinning={loading}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {/* 标题 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>⏸️</span>
                        <Title level={5} style={{ margin: 0, color: '#d48806' }}>
                            人工介入 - {nodeName}
                        </Title>
                    </div>

                    {/* 审核提示 */}
                    <Text style={{ fontSize: 14, lineHeight: 1.6 }}>{checkMessage}</Text>

                    {/* 快照查看/编辑 */}
                    <div>
                        <Button
                            type="text"
                            onClick={() => setShowSnapshot(!showSnapshot)}
                            style={{
                                padding: '4px 0',
                                height: 'auto',
                                color: '#1890ff'
                            }}
                            icon={showSnapshot ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        >
                            {showSnapshot ? '收起执行上下文' : '查看/编辑执行上下文'}
                        </Button>

                        {showSnapshot && (
                            <div style={{ marginTop: 12 }}>
                                <SnapshotViewer agentId={agentId} conversationId={conversationId} />
                            </div>
                        )}
                    </div>

                    {/* 操作按钮 */}
                    <Space style={{ marginTop: 8 }} size="middle">
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleReview(true)}
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                                border: 'none',
                                borderRadius: 6,
                                height: 36,
                                paddingLeft: 20,
                                paddingRight: 20
                            }}
                        >
                            批准
                        </Button>
                        <Button
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => handleReview(false)}
                            disabled={loading}
                            style={{
                                borderRadius: 6,
                                height: 36,
                                paddingLeft: 20,
                                paddingRight: 20
                            }}
                        >
                            拒绝
                        </Button>
                    </Space>
                </Space>
            </Spin>
        </Card>
    );
};

export default HumanInterventionReview;

