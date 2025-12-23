/**
 * 执行上下文快照类型定义
 * @description 用于人工介入审核时展示和编辑执行上下文
 */

/** 聊天消息 */
export interface SnapshotChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/** 可编辑字段元数据（后端驱动） */
export interface EditableFieldMeta {
    key: string;
    label: string;
    type: 'json' | 'text' | 'list' | 'messages';
    description: string;
    editable: boolean;
}

/** 执行上下文快照 */
export interface ExecutionContextSnapshot {
    // 只读字段
    conversationId: string;
    executionId: string;
    agentId: number;
    instanceId: number;
    pausedNodeId: string;
    pausedNodeName: string;
    pausedAt: number;
    executedNodeIds: string[];

    // 可编辑字段
    nodeResults: Record<string, any>;
    userInput: string;
    customVariables: Record<string, any>;
    messageHistory: SnapshotChatMessage[];

    // 审核相关
    checkMessage: string;
    allowModifyOutput: boolean;

    // 后端驱动的可编辑字段描述
    editableFields: EditableFieldMeta[];
}

/** 快照修改请求 */
export interface SnapshotModifications {
    nodeResults?: Record<string, any>;
    userInput?: string;
    customVariables?: Record<string, any>;
    messageHistory?: SnapshotChatMessage[];
}
