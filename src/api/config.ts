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

// --- New Node Template APIs ---

export interface NodeTemplate {
    templateId: string;
    nodeType: string;
    templateLabel: string;
    description: string;
    icon: string;
    displayType: string;
    supportedConfigs: string[];
    isBuiltIn: boolean;
    isDeprecated: boolean;
}

export const getNodeTemplates = async (includeDeprecated = false): Promise<NodeTemplate[]> => {
    return request.get(`/client/agent/config/node-templates?includeDeprecated=${includeDeprecated}`);
};

export const getConfigSchema = async (module: string): Promise<any> => {
    return request.get(`/client/agent/config/config-schema/${module}`);
};
