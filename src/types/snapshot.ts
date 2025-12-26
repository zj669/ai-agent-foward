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

/** 执行上下文快照 (API v2) */
export interface ExecutionContextSnapshot {
    // 基础信息
    executionId: string;
    conversationId?: string; // Compatible field
    lastNodeId: string;
    timestamp: number;
    status: 'COMPLETED' | 'PAUSED' | 'RUNNING' | 'ERROR';

    // 状态数据 (包含所有运行时数据)
    stateData: Record<string, any>;

    // 兼容旧字段 (Optional) - 如果后端只返回 stateData，前端需设法适配
    pausedNodeName?: string;
    pausedAt?: number;
    executedNodeIds?: string[];

    // 审核相关
    checkMessage?: string;
    allowModifyOutput?: boolean;

    // 后端驱动的可编辑字段描述 (如果后端还支持)
    editableFields?: EditableFieldMeta[];
}

/** 快照修改请求 */
export interface SnapshotModifications {
    // 修改现在针对 stateData 内的字段
    stateData?: Record<string, any>;
    // 兼容旧接口
    nodeResults?: Record<string, any>;
    userInput?: string;
    customVariables?: Record<string, any>;
    messageHistory?: SnapshotChatMessage[];
}
