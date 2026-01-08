import request from '@/utils/request';



// --- New Node Template APIs ---

export interface NodeTemplate {
    templateId: string;
    nodeType: string;
    nodeName: string;
    templateLabel: string;
    description: string;
    baseType: string;
    icon: string;
    systemPromptTemplate: string;
    outputSchema: string;
    editableFields: string;
    isBuiltIn: boolean;
}

export const getNodeTemplates = async (): Promise<NodeTemplate[]> => {
    return request.get('/client/agent/config/node-templates');
};

export const getConfigSchema = async (module: string): Promise<any> => {
    return request.get(`/client/agent/config/config-schema/${module}`);
};
