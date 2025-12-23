import request from '@/utils/request';
import { AiAgent } from '@/types';

export const getAgentList = async (): Promise<AiAgent[]> => {
    return request.get('/client/agent/list');
};

export const saveAgent = async (data: Partial<AiAgent>) => {
    return request.post('/client/agent/save', data);
};

export const getAgentDetail = async (agentId: string): Promise<AiAgent> => {
    // Use the new detail endpoint
    return request.get(`/client/agent/detail/${agentId}`);
};

export const publishAgent = async (agentId: string) => {
    return request.post(`/client/agent/publish/${agentId}`);
};

export const getConversationIds = async (agentId: string): Promise<{ conversationId: string }[]> => {
    return request.get(`/client/agent/conversations/${agentId}`);
};

export const getNewConversationId = async (): Promise<string> => {
    return request.get('/client/agent/newChat');
};

export const getChatHistory = async (conversationId: string): Promise<any[]> => {
    return request.get(`/client/agent/chat/history/${conversationId}`);
};

// --- Human Intervention APIs ---

/** 人工介入审核请求类型 */
export interface ReviewRequest {
    conversationId: string;
    nodeId: string;
    approved: boolean;
    comments?: string;
    modifiedOutput?: string;
}

/** 执行上下文响应类型 */
export interface ExecutionContextResponse {
    conversationId: string;
    status: 'PENDING' | 'PAUSED' | 'COMPLETED';
    pausedNodeId?: string;
    pausedNodeName?: string;
    pausedAt?: number;
    nodeResults: Record<string, any>;
    allowModifyOutput?: boolean;
    checkMessage?: string;
    interventionRequest?: any; // Include interventionRequest object
}

/** 提交人工介入审核 */
export const submitReview = async (data: ReviewRequest): Promise<void> => {
    return request.post('/client/agent/review', data);
};

/** 获取执行上下文 */
export const getExecutionContext = async (conversationId: string): Promise<ExecutionContextResponse> => {
    return request.get(`/client/agent/context/${conversationId}`);
};

/** 更新执行上下文 */
export const updateExecutionContext = async (
    conversationId: string,
    modifications: Record<string, any>
): Promise<void> => {
    return request.put(`/client/agent/context/${conversationId}`, { modifications });
};
