import React from 'react';
import { Input, List, Typography, Space, Empty } from 'antd';

interface NodeResultsEditorProps {
    value: Record<string, any>;
    onChange: (value: Record<string, any>) => void;
}

const NodeResultsEditor: React.FC<NodeResultsEditorProps> = ({ value, onChange }) => {
    const entries = Object.entries(value || {});

    const handleItemChange = (key: string, newValue: string) => {
        // Try to parse JSON if it looks like an object/array, otherwise treat as string
        let finalValue: any = newValue;
        try {
            if (newValue.trim().startsWith('{') || newValue.trim().startsWith('[')) {
                finalValue = JSON.parse(newValue);
            }
        } catch (e) {
            // Keep as string if parse fails
        }

        onChange({ ...value, [key]: finalValue });
    };

    if (entries.length === 0) {
        return <Empty description="暂无节点结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <List
                dataSource={entries}
                renderItem={([nodeId, result]) => (
                    <List.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Typography.Text strong code>{nodeId}</Typography.Text>
                            <Input.TextArea
                                defaultValue={typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                                onBlur={(e) => handleItemChange(nodeId, e.target.value)}
                                autoSize={{ minRows: 2, maxRows: 8 }}
                                style={{ fontFamily: 'monospace', fontSize: '12px' }}
                            />
                        </Space>
                    </List.Item>
                )}
            />
        </div>
    );
};

export default NodeResultsEditor;
