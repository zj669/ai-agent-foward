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

export const deleteAgent = async (agentId: string): Promise<void> => {
    return request.post(`/client/agent/delete/${agentId}`);
};

export const getConversationIds = async (agentId: string): Promise<string[]> => {
    return request.get(`/client/chat/conversations/${agentId}`);
};

export const getNewConversationId = async (): Promise<string> => {
    return request.get('/client/chat/newChat');
};

export const getChatHistory = async (agentId: string, conversationId: string): Promise<any[]> => {
    return request.get(`/client/chat/history/${agentId}/${conversationId}`);
};

// --- Human Intervention APIs ---

/** 人工介入审核请求类型 */
export interface ReviewRequest {
    conversationId: string;
    nodeId: string;
    approved: boolean;
    agentId: string;  // 必填字段,用于加载工作流图
}

/** 提交人工介入审核 */
export const submitReview = async (data: ReviewRequest): Promise<void> => {
    return request.post('/client/chat/review', data);
};


// --- Snapshot APIs ---

import { ExecutionContextSnapshot, SnapshotModifications } from '@/types/snapshot';

/** 获取完整快照 */
export const getContextSnapshot = async (
    agentId: string,
    conversationId: string
): Promise<ExecutionContextSnapshot> => {
    return request.get(`/client/chat/snapshot/${agentId}/${conversationId}`);
};

/** 更新快照可编辑字段 */
export const updateContextSnapshot = async (
    agentId: string,
    conversationId: string,
    nodeId: string | undefined,
    stateData: Record<string, any>
): Promise<void> => {
    return request.post(`/client/chat/snapshot/${agentId}/${conversationId}`, {
        nodeId,
        stateData
    });
};
