/**
 * 执行上下文快照类型定义
 * @description 用于人工介入审核时展示和编辑执行上下文
 */

/** 人工介入信息 */
export interface HumanInterventionInfo {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    checkMessage: string;
    allowModifyOutput: boolean;
}

/** 节点执行记录 */
export interface NodeExecutionRecord {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
    startTime: number;
    endTime?: number;
    duration?: number;
    input?: any;
    output?: any;
    error?: string;
}

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
    conversationId: string;  // 与后端 executionId 对应
    lastNodeId: string;
    timestamp: number;
    status: 'COMPLETED' | 'PAUSED' | 'RUNNING' | 'ERROR';

    // 状态数据 (包含所有运行时数据)
    stateData: Record<string, any>;

    // 新增字段 (v2.0)
    /** 人工介入信息 (仅当 status=PAUSED 时有值) */
    humanIntervention?: HumanInterventionInfo;

    /** 节点执行历史 (标准化格式) */
    executionHistory?: NodeExecutionRecord[];

    /** 后端驱动的可编辑字段描述 */
    editableFields?: EditableFieldMeta[];

    // 兼容旧字段 (Optional) - 逐步废弃
    executionId?: string;  // 已废弃,使用 conversationId
    pausedNodeName?: string;
    pausedAt?: number;
    executedNodeIds?: string[];

    // 审核相关 (已迁移到 humanIntervention)
    checkMessage?: string;
    allowModifyOutput?: boolean;
}

/** 快照修改请求 */
export interface SnapshotModifications {
    stateData?: Record<string, any>;
}
