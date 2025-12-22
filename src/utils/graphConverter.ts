import { Node, Edge } from '@xyflow/react';

// UUID Generator
function uuidv4(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export interface GraphJsonSchema {
    dagId: string;
    version: string;
    description?: string;
    startNodeId: string;
    nodes: NodeDefinition[];
    edges: EdgeDefinition[];
}

export interface NodeDefinition {
    nodeId: string;
    nodeType: string;
    nodeName: string;
    position: { x: number; y: number };
    config: Record<string, any>;
}

export interface EdgeDefinition {
    edgeId: string;
    source: string;
    target: string;
    label?: string;
    condition?: string;
}

/**
 * 将 React Flow 数据转换为后端 GraphJsonSchema 格式
 */
export function convertToGraphJsonSchema(
    nodes: Node[],
    edges: Edge[],
    agentName: string,
    description?: string
): GraphJsonSchema {
    // 1. 找到起始节点 (没有入边的节点)
    // 如果没有边，且只有一个节点，该节点就是起始节点
    // 如果有多个节点但没有边，这可能有问题，但我们取第一个
    // 更好的逻辑是：没有 target 指向它的节点

    const targetIds = new Set(edges.map(e => e.target));
    const startNodes = nodes.filter(n => !targetIds.has(n.id));

    let startNodeId = '';
    if (startNodes.length > 0) {
        startNodeId = startNodes[0].id;
    } else if (nodes.length > 0) {
        // 可能是环状图，或者其它情况，默认取第一个
        startNodeId = nodes[0].id;
    } else {
        // 空图，允许保存但不一定能运行
        // throw new Error('未找到起始节点');
        // 暂时允许空图保存
    }

    // 2. 转换节点
    const convertedNodes: NodeDefinition[] = nodes.map(node => ({
        nodeId: node.id,
        nodeType: (node.data?.nodeType as string) || node.type || 'UNKNOWN',
        nodeName: node.data?.label as string || '未命名节点',
        position: {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y)
        },
        config: convertNodeConfig(node.data?.config as Record<string, any> || {})
    }));

    // 3. 转换边
    const convertedEdges: EdgeDefinition[] = edges.map(edge => ({
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label as string || undefined,
        condition: undefined // 可根据需要设置，比如路由节点的输出条件
    }));

    // 4. 组装完整结构
    return {
        dagId: `dag-${uuidv4()}`,
        version: '1.0',
        description: description || agentName,
        startNodeId: startNodeId,
        nodes: convertedNodes,
        edges: convertedEdges
    };
}

/**
 * 转换节点配置
 * 将前端的配置格式转换为后端期望的格式
 */
function convertNodeConfig(config: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};

    // MODEL 配置 - 新的嵌套对象格式
    if (config.MODEL) {
        converted.model = {
            modelId: config.MODEL.modelId !== undefined ? config.MODEL.modelId : null,
            baseUrl: config.MODEL.baseUrl || null,
            apiKey: config.MODEL.apiKey || null,
            modelName: config.MODEL.modelName || null,
            temperature: config.MODEL.temperature,
            maxTokens: config.MODEL.maxTokens
        };
    }

    // USER_PROMPT 配置
    if (config.USER_PROMPT) {
        if (config.USER_PROMPT.systemPrompt) {
            converted.systemPrompt = config.USER_PROMPT.systemPrompt;
        }
        if (config.USER_PROMPT.userPromptTemplate) {
            converted.userPromptTemplate = config.USER_PROMPT.userPromptTemplate;
        }
        // New field: userPrompt
        if (config.USER_PROMPT.userPrompt) {
            converted.userPrompt = config.USER_PROMPT.userPrompt;
        }
    }

    // MCP_TOOL 配置
    if (config.MCP_TOOL) {
        converted.mcpTool = config.MCP_TOOL;
    }

    // TIMEOUT 配置
    if (config.TIMEOUT) {
        converted.timeout = config.TIMEOUT.timeout;
    }

    // ADVISOR 配置
    if (config.ADVISOR) {
        converted.advisor = config.ADVISOR;
    }

    // SYSTEM_PROMPT 配置
    if (config.SYSTEM_PROMPT) {
        converted.systemPrompt = config.SYSTEM_PROMPT;
    }

    // 保留其他可能直接设置的属性
    // Exclude processed keys
    const processedKeys = ['MODEL', 'USER_PROMPT', 'MCP_TOOL', 'TIMEOUT', 'ADVISOR', 'SYSTEM_PROMPT'];
    Object.keys(config).forEach(key => {
        if (!processedKeys.includes(key)) {
            converted[key] = config[key];
        }
    });

    return converted;
}

/**
 * 将后端 GraphJsonSchema 转换为 React Flow 格式 (用于编辑器加载)
 */
export function convertFromGraphJsonSchema(schema: GraphJsonSchema): {
    nodes: Node[];
    edges: Edge[];
} {
    // 如果 schema 为空或是旧格式（简单兼容）
    if (!schema || !schema.nodes) {
        // 尝试判断是否是旧格式（即直接是 { nodes: [], edges: [] }）
        const legacySchema = schema as any;
        if (legacySchema.nodes && Array.isArray(legacySchema.nodes)) {
            // 假设已经是 React Flow 格式或者接近
            // 但根据问题描述，后端之前存的是前端直接发的，所以可能是 React Flow 格式
            // 这里做一个简单的检查：如果 node 有 data.config 则直接返回
            if (legacySchema.nodes.length > 0 && legacySchema.nodes[0].data && legacySchema.nodes[0].data.config) {
                return { nodes: legacySchema.nodes, edges: legacySchema.edges || [] };
            }
        }
        return { nodes: [], edges: [] };
    }

    // 1. 转换节点
    const nodes: Node[] = schema.nodes.map(node => ({
        id: node.nodeId,
        type: node.nodeType,
        position: node.position,
        data: {
            label: node.nodeName,
            config: reverseConvertNodeConfig(node.config)
        }
    }));

    // 2. 转换边
    const edges: Edge[] = (schema.edges || []).map(edge => ({
        id: edge.edgeId,
        source: edge.source,
        target: edge.target,
        label: edge.label
    }));

    return { nodes, edges };
}

/**
 * 反向转换节点配置 (从后端格式转为前端格式)
 */
function reverseConvertNodeConfig(config: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};
    if (!config) return converted;

    // 处理 MODEL 配置 - 读取嵌套的 model 对象
    if (config.model && typeof config.model === 'object') {
        converted.MODEL = {
            modelId: config.model.modelId !== undefined && config.model.modelId !== null ? config.model.modelId : null,
            baseUrl: config.model.baseUrl || null,
            apiKey: config.model.apiKey || null,
            modelName: config.model.modelName || null,
            temperature: config.model.temperature,
            maxTokens: config.model.maxTokens
        };
    } else if (config.model || config.temperature !== undefined || config.maxTokens !== undefined) {
        // 兼容旧格式：扁平化的配置
        let modelName = null;
        if (typeof config.model === 'string') {
            modelName = config.model;
        } else if (typeof config.model === 'object' && config.model !== null) {
            // 极端情况：model 是对象但不在标准嵌套位置
            modelName = config.model.id || config.model.name || config.model.modelName;
        }

        converted.MODEL = {
            modelId: null,
            modelName: modelName,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            apiKey: config.apiKey,
            baseUrl: null
        };
    }

    // 提取 USER_PROMPT 相关字段
    if (config.userPrompt || config.userPromptTemplate) {
        converted.USER_PROMPT = {
            userPrompt: config.userPrompt,
            userPromptTemplate: config.userPromptTemplate
        };
    }

    // Warning: SystemPrompt priority
    // If systemPrompt is object with promptId, map to SYSTEM_PROMPT
    if (config.systemPrompt) {
        if (typeof config.systemPrompt === 'object' && config.systemPrompt.promptId) {
            converted.SYSTEM_PROMPT = config.systemPrompt;
        } else {
            // Fallback: put into USER_PROMPT for compatibility
            converted.USER_PROMPT = {
                ...(converted.USER_PROMPT || {}),
                systemPrompt: config.systemPrompt
            };
        }
    }

    // 提取 MCP_TOOL
    if (config.mcpTool) {
        converted.MCP_TOOL = config.mcpTool;
    }

    // 提取 TIMEOUT
    if (config.timeout !== undefined) {
        converted.TIMEOUT = {
            timeout: config.timeout
        };
    }

    // 提取 ADVISOR
    if (config.advisor) {
        converted.ADVISOR = config.advisor;
    }

    return converted;
}
