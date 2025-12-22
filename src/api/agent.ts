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
