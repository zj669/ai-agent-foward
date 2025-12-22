import request from '@/utils/request';

export const getNodeTypes = async () => {
    // Expected to return list of { nodeType, nodeName, description, icon, supportedConfigs }
    return request.get('/client/agent/config/node-types');
};

export const getConfigDefinitions = async (configType: string): Promise<any[]> => {
    return request.get(`/client/agent/config/config-definitions?configType=${configType}`);
};

export const getConfigFieldDefinitions = async (configType: string): Promise<any[]> => {
    return request.get(`/client/agent/config/config-field-definitions?configType=${configType}`);
};
