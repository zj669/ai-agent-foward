// NodeExecution 状态扩展
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'error' | 'paused';

/* 人工介入状态 */
export interface HumanInterventionState {
    isPaused: boolean;
    conversationId?: string; // Add conversationId to track which session this belongs to
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

// DAG Visualization Types
export interface DagNode {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: {
        label: string;
        nodeType: string;
        [key: string]: any;
    };
}

export interface DagEdge {
    id: string;
    source: string;
    target: string;
    type?: string;
    animated?: boolean;
    data?: any;
}

export interface DagVisualizationState {
    nodes: DagNode[];
    edges: DagEdge[];
    activeNodeId: string | null;
    completedNodeIds: string[];
    errorNodeId: string | null;
}
