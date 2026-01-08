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
    agentId: string;            // 新增: 需要agentId
    conversationId: string;
    refreshKey?: number;        // ⭐ 新增: 外部触发刷新的key
    onSnapshotLoaded?: (snapshot: ExecutionContextSnapshot) => void;
}

const SnapshotViewer: React.FC<SnapshotViewerProps> = ({ agentId, conversationId, refreshKey, onSnapshotLoaded }) => {
    const [snapshot, setSnapshot] = useState<ExecutionContextSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modifications, setModifications] = useState<Record<string, any>>({});
    const [hasChanges, setHasChanges] = useState(false);

    const loadSnapshot = async () => {
        setLoading(true);
        try {
            const data = await getContextSnapshot(agentId, conversationId);
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
        if (agentId && conversationId) {
            loadSnapshot();
        }
    }, [agentId, conversationId, refreshKey]); // ⭐ 添加 refreshKey 依赖

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
            await updateContextSnapshot(
                agentId,
                conversationId,
                snapshot?.lastNodeId, // 使用最后的节点ID
                modifications        // 直接传递 stateData
            );
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

    // Adapt to new API structure: use stateData keys
    // If editableFields are provided by backend, use them.
    // Otherwise, define default fields mapping to stateData keys.
    const defaultFields: EditableFieldMeta[] = [
        // Map 'execution_history' (API v2) to NodeResultsEditor
        { key: 'execution_history', label: '节点执行历史', type: 'json', description: '各个节点的执行结果记录', editable: true },
        // Map 'user_input' (API v2) to UserInputEditor
        { key: 'user_input', label: '用户输入', type: 'text', description: '用户的原始输入内容', editable: true },
        // Map 'custom_variables' or generic variables to VariablesEditor
        { key: 'custom_variables', label: '自定义变量', type: 'json', description: '工作流中的自定义变量', editable: true },
        // Map 'message_history' or 'chat_history' to MessageHistoryEditor
        { key: 'message_history', label: '消息历史', type: 'messages', description: '对话历史记录', editable: true },
    ];

    // Fallback for legacy snapshot structure if stateData is missing but legacy fields exist
    // This handles the transition period
    if (!snapshot.stateData) {
        // Assume legacy structure
        snapshot.stateData = {
            execution_history: (snapshot as any).nodeResults,
            user_input: (snapshot as any).userInput,
            custom_variables: (snapshot as any).customVariables,
            message_history: (snapshot as any).messageHistory
        };
    }

    const fields = (snapshot.editableFields && snapshot.editableFields.length > 0)
        ? snapshot.editableFields
        : defaultFields;

    const renderEditor = (field: EditableFieldMeta) => {
        // Value priority: modifications -> snapshot.stateData -> snapshot (legacy fallback)
        const val = modifications[field.key] ?? snapshot.stateData?.[field.key] ?? (snapshot as any)[field.key];

        // Map component types
        switch (field.type) {
            case 'json':
                // Use VariablesEditor for variables-like data
                if (field.key.includes('variable')) {
                    return <VariablesEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
                }
                return <NodeResultsEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
            case 'text':
                return <UserInputEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
            case 'messages':
                return <MessageHistoryEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
            case 'list':
                // Simple list editor fallback to JSON for now
                return <NodeResultsEditor value={val} onChange={(v) => handleFieldChange(field.key, v)} />;
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
                    {snapshot.status === 'PAUSED' && snapshot.humanIntervention ? (
                        <Tag color="orange">暂停节点: {snapshot.humanIntervention.nodeName}</Tag>
                    ) : snapshot.pausedNodeName ? (
                        <Tag color="orange">暂停节点: {snapshot.pausedNodeName}</Tag>
                    ) : (
                        <Tag color={snapshot.status === 'COMPLETED' ? 'green' : 'blue'}>{snapshot.status}</Tag>
                    )}
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
                    <span>快照时间: {dayjs(snapshot.timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
                    <span>最后节点: {snapshot.humanIntervention?.nodeName || snapshot.lastNodeId || '-'}</span>
                    {snapshot.humanIntervention && (
                        <span>节点类型: {snapshot.humanIntervention.nodeType}</span>
                    )}
                </Space>
            </div>

            {/* Editable Tabs */}
            <Tabs defaultActiveKey={fields[0]?.key} items={items} size="small" />
        </Card>
    );
};

export default SnapshotViewer;
