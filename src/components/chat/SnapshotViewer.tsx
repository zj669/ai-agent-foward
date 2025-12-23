import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, Space, message, Spin, Alert, Tag, Typography } from 'antd';
import { ReloadOutlined, SaveOutlined, EyeOutlined, UndoOutlined } from '@ant-design/icons';
import { getContextSnapshot, updateContextSnapshot } from '@/api/agent';
import { ExecutionContextSnapshot, SnapshotModifications, EditableFieldMeta } from '@/types/snapshot';
import NodeResultsEditor from './editors/NodeResultsEditor';
import UserInputEditor from './editors/UserInputEditor';
import VariablesEditor from './editors/VariablesEditor';
import MessageHistoryEditor from './editors/MessageHistoryEditor';
import dayjs from 'dayjs';

interface SnapshotViewerProps {
    conversationId: string;
    onSnapshotLoaded?: (snapshot: ExecutionContextSnapshot) => void;
}

const SnapshotViewer: React.FC<SnapshotViewerProps> = ({ conversationId, onSnapshotLoaded }) => {
    const [snapshot, setSnapshot] = useState<ExecutionContextSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modifications, setModifications] = useState<SnapshotModifications>({});
    const [hasChanges, setHasChanges] = useState(false);

    const loadSnapshot = async () => {
        setLoading(true);
        try {
            const data = await getContextSnapshot(conversationId);
            setSnapshot(data);
            setModifications({});
            setHasChanges(false);
            onSnapshotLoaded?.(data);
        } catch (e: any) {
            console.error(e);
            message.error('加载执行上下文快照失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (conversationId) {
            loadSnapshot();
        }
    }, [conversationId]);

    const handleFieldChange = (field: string, value: any) => {
        setModifications(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!hasChanges) {
            message.info('没有更改需要保存');
            return;
        }
        setSaving(true);
        try {
            await updateContextSnapshot(conversationId, modifications);
            message.success('快照已更新');
            await loadSnapshot(); // Reload to confirm changes
        } catch (e: any) {
            console.error(e);
            message.error('保存失败: ' + (e.message || '未知错误'));
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setModifications({});
        setHasChanges(false);
        message.info('已重置所有更改');
    };

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <Spin tip="正在加载执行上下文..." />
            </div>
        );
    }

    if (!snapshot) {
        return <Alert type="warning" message="未找到执行上下文快照" showIcon />;
    }

    // Default fields if backend doesn't provide metadata (Backward compatibility)
    const defaultFields: EditableFieldMeta[] = [
        { key: 'nodeResults', label: '节点结果', type: 'json', description: '', editable: true },
        { key: 'userInput', label: '用户输入', type: 'text', description: '', editable: true },
        { key: 'customVariables', label: '自定义变量', type: 'json', description: '', editable: true },
        { key: 'messageHistory', label: '消息历史', type: 'messages', description: '', editable: true },
    ];

    const fields = (snapshot.editableFields && snapshot.editableFields.length > 0)
        ? snapshot.editableFields
        : defaultFields;

    const renderEditor = (field: EditableFieldMeta) => {
        const val = (modifications as any)[field.key] ?? (snapshot as any)[field.key];

        switch (field.type) {
            case 'json':
                // Special case for customVariables to use specific editor
                if (field.key === 'customVariables') {
                    return <VariablesEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
                }
                return <NodeResultsEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
            case 'text':
                return <UserInputEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
            case 'messages':
                return <MessageHistoryEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
            default:
                return <Alert message={`Unsupported field type: ${field.type}`} type="warning" />;
        }
    };

    const items = fields.map(field => ({
        key: field.key,
        label: field.label,
        children: (
            <div style={{ paddingTop: 8 }}>
                {field.description && (
                    <Alert message={field.description} type="info" showIcon style={{ marginBottom: 16 }} />
                )}
                {renderEditor(field)}
            </div>
        )
    }));

    return (
        <Card
            title={
                <Space>
                    <EyeOutlined style={{ color: '#1677ff' }} />
                    <Typography.Text strong>执行上下文快照</Typography.Text>
                    <Tag color="orange">暂停节点: {snapshot.pausedNodeName}</Tag>
                </Space>
            }
            extra={
                <Space>
                    {hasChanges && (
                        <Button size="small" icon={<UndoOutlined />} onClick={handleReset}>
                            重置
                        </Button>
                    )}
                    <Button
                        type="primary"
                        size="small"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSave}
                        disabled={!hasChanges}
                    >
                        保存更改
                    </Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={loadSnapshot}>
                        刷新
                    </Button>
                </Space>
            }
            size="small"
            style={{ marginTop: 16, borderColor: '#d9d9d9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '0 12px 12px' }}
        >
            {/* Read-only Info Header */}
            <div style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 12, color: '#888', fontSize: 12 }}>
                <Space split="|">
                    <span>快照时间: {dayjs(snapshot.pausedAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                    <span>已执行节点数: {snapshot.executedNodeIds?.length || 0}</span>
                </Space>
            </div>

            {/* Editable Tabs */}
            <Tabs defaultActiveKey={fields[0]?.key} items={items} size="small" />
        </Card>
    );
};

export default SnapshotViewer;
