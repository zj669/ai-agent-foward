// NodeExecution 状态扩展
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'error' | 'paused';

/* 人工介入状态 */
export interface HumanInterventionState {
    isPaused: boolean;
    nodeId?: string;
    nodeName?: string;
    checkMessage?: string;
    allowModifyOutput?: boolean;
    pausedAt?: number;
    currentOutput?: string;
}

export interface NodeExecution {
    nodeId: string;
    nodeName: string;
    status: NodeExecutionStatus;
    content: string;
    startTime: number;
    duration?: number;
    result?: string;
    progress?: {
        current: number;
        total: number;
        percentage: number;
    };
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content?: string;
    nodes: NodeExecution[];
    timestamp: number;
    loading?: boolean;
    error?: boolean;
    dagProgress?: {
        current: number;
        total: number;
        percentage: number;
    };
}
