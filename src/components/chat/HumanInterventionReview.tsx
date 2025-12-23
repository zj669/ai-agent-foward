import React, { useState } from 'react';
import { Card, Button, Input, Space, Typography, message, Spin } from 'antd';
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { submitReview } from '../../api/agent';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface HumanInterventionReviewProps {
    conversationId: string;
    nodeId: string;
    nodeName: string;
    checkMessage: string;
    allowModifyOutput?: boolean;
    currentOutput?: string;
    onReview: (data: { approved: boolean; comments?: string; modifiedOutput?: string }) => Promise<void>;
}

const HumanInterventionReview: React.FC<HumanInterventionReviewProps> = ({
    conversationId,
    nodeId,
    nodeName,
    checkMessage,
    allowModifyOutput = false,
    currentOutput = '',
    onReview
}) => {
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState('');
    const [modifiedOutput, setModifiedOutput] = useState(currentOutput);
    const [showModify, setShowModify] = useState(false);

    const handleReview = async (approved: boolean) => {
        setLoading(true);
        try {
            await onReview({
                approved,
                comments: comments || undefined,
                modifiedOutput: showModify && modifiedOutput !== currentOutput
                    ? modifiedOutput
                    : undefined
            });
            message.success(approved ? '已批准，正在恢复执行...' : '已拒绝');
        } catch (error) {
            // Error is handled by parent usually, but we catch here to stop loading
            // message.error('审核提交失败');
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
                borderColor: '#faad14',
                backgroundColor: '#fffbe6'
            }}
        >
            <Spin spinning={loading}>
                <Space direction="vertical" style={{ width: '100%' }}>
                    {/* 标题 */}
                    <Title level={5} style={{ margin: 0, color: '#d48806' }}>
                        ⏸️ 人工介入 - {nodeName}
                    </Title>

                    {/* 审核提示 */}
                    <Text>{checkMessage}</Text>

                    {/* 当前输出预览 */}
                    {currentOutput && (
                        <div style={{
                            padding: '8px 12px',
                            backgroundColor: '#fafafa',
                            borderRadius: 4,
                            maxHeight: 200,
                            overflow: 'auto'
                        }}>
                            <Text type="secondary">当前输出:</Text>
                            <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                                {currentOutput}
                            </pre>
                        </div>
                    )}

                    {/* 修改输出 */}
                    {allowModifyOutput && (
                        <>
                            {!showModify ? (
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => setShowModify(true)}
                                    size="small"
                                >
                                    修改输出
                                </Button>
                            ) : (
                                <TextArea
                                    value={modifiedOutput}
                                    onChange={(e) => setModifiedOutput(e.target.value)}
                                    placeholder="输入修改后的输出内容"
                                    rows={4}
                                />
                            )}
                        </>
                    )}

                    {/* 备注 */}
                    <Input
                        placeholder="审核备注（可选）"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />

                    {/* 操作按钮 */}
                    <Space>
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => handleReview(true)}
                            disabled={loading}
                        >
                            批准
                        </Button>
                        <Button
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => handleReview(false)}
                            disabled={loading}
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
