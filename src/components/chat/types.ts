export interface NodeExecution {
    nodeId: string;
    nodeName: string;
    status: 'pending' | 'running' | 'completed' | 'error';
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
