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
    // New fields for Template mechanism
    templateId?: string;
    userConfig?: string; // JSON string of user configuration
    // Deprecated but kept for compatibility
    config?: Record<string, any>;
}

export interface EdgeDefinition {
    edgeId: string;
    source: string;
    target: string;
    label?: string;
    condition?: string;
    edgeType?: string; // DEPENDENCY, LOOP_BACK, CONDITIONAL
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
    const targetIds = new Set(edges.map(e => e.target));
    const startNodes = nodes.filter(n => !targetIds.has(n.id));

    let startNodeId = '';
    if (startNodes.length > 0) {
        startNodeId = startNodes[0].id;
    } else if (nodes.length > 0) {
        // 可能是环状图，或者其它情况，默认取第一个
        startNodeId = nodes[0].id;
    }

    // 2. 转换节点
    const convertedNodes: NodeDefinition[] = nodes.map(node => {
        const nodeData = node.data || {};

        // Convert config object to userConfig JSON string if templateId exists
        let userConfig: string | undefined = undefined;
        let config: Record<string, any> | undefined = undefined;

        // Ensure we are working with Key-Value pairs that align with backend expectations
        // The node.data.config usually stores values as { MODULE: { field: value } }
        // We perform the key conversion (UPPER_SNAKE -> camelCase) here
        const configObject = convertNodeConfig(nodeData.config as Record<string, any> || {});

        if (nodeData.templateId) {
            userConfig = JSON.stringify(configObject);
        } else {
            // Fallback for legacy nodes without templateId
            config = configObject;
        }

        return {
            nodeId: node.id,
            nodeType: (nodeData.nodeType as string) || node.type || 'UNKNOWN',
            nodeName: nodeData.label as string || '未命名节点',
            position: {
                x: Math.round(node.position.x),
                y: Math.round(node.position.y)
            },
            templateId: nodeData.templateId as string | undefined,
            userConfig: userConfig,
            config: config
        };
    });

    // 3. 转换边 (保留 edgeType, condition)
    const convertedEdges: EdgeDefinition[] = edges.map(edge => ({
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label as string || undefined,
        condition: (edge.data?.condition as string) || undefined,
        edgeType: (edge.data?.edgeType as string) || 'DEPENDENCY'
    }));

    // 4. 组装完整结构
    return {
        dagId: `dag-${uuidv4()}`,
        version: '2.0', // Update version to 2.0
        description: description || agentName,
        startNodeId: startNodeId,
        nodes: convertedNodes,
        edges: convertedEdges
    };
}

/**
 * 转换节点配置
 * 将前端的配置格式转换为后端期望的格式
 * 
 * 数据驱动：直接根据前端表单的配置类型动态组装，无需硬编码字段
 * 前端格式: { CONFIG_TYPE: { field1, field2, ... }, ... }
 * 后端格式: { configType: { field1, field2, ... }, ... }
 */
function convertNodeConfig(config: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};
    if (!config) return converted;

    // 将 UPPER_SNAKE_CASE 转换为 camelCase
    const toBackendKey = (configType: string): string => {
        return configType
            .toLowerCase()
            .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    };

    // 遍历所有配置类型，动态转换
    Object.keys(config).forEach(configType => {
        const value = config[configType];
        if (value === null || value === undefined) return;

        const backendKey = toBackendKey(configType);

        // 直接复制整个配置对象（包含所有字段）
        if (typeof value === 'object' && !Array.isArray(value)) {
            // 对象类型：复制所有内部字段
            converted[backendKey] = { ...value };
        } else {
            // 基本类型或数组：直接赋值
            converted[backendKey] = value;
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
            if (legacySchema.nodes.length > 0 && legacySchema.nodes[0].data && legacySchema.nodes[0].data.config) {
                return { nodes: legacySchema.nodes, edges: legacySchema.edges || [] };
            }
        }
        return { nodes: [], edges: [] };
    }

    // 1. 转换节点
    const nodes: Node[] = schema.nodes.map(node => {
        let configObj: Record<string, any> = {};

        // Parse userConfig if available, otherwise use legacy config
        if (node.userConfig) {
            try {
                const parsed = JSON.parse(node.userConfig);
                configObj = reverseConvertNodeConfig(parsed);
            } catch (e) {
                console.error("Failed to parse userConfig", e);
            }
        } else if (node.config) {
            configObj = reverseConvertNodeConfig(node.config);
        } else if (typeof node.config === 'string') {
            // Handle case where legacy config might be a string (though it shouldn't be per interface)
            try {
                const parsed = JSON.parse(node.config);
                configObj = reverseConvertNodeConfig(parsed);
            } catch (e) {
                // ignore
            }
        }

        return {
            id: node.nodeId,
            type: node.nodeType,
            position: node.position,
            data: {
                label: node.nodeName,
                nodeType: node.nodeType,
                templateId: node.templateId, // Restore templateId
                config: configObj,
                // Note: supportedConfigs and other template metadata are NOT stored in the graph JSON
                // They need to be re-fetched or re-associated in the editor if needed.
                // Usually the editor fetches templates on load and can match by templateId.
            }
        };
    });

    // 2. 转换边 (恢复 edgeType, condition 到 data)
    const edges: Edge[] = (schema.edges || []).map(edge => ({
        id: edge.edgeId,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'custom', // Force custom edge type for visual rendering
        data: {
            edgeType: edge.edgeType || 'DEPENDENCY',
            condition: edge.condition
        }
    }));

    return { nodes, edges };
}

/**
 * 反向转换节点配置 (从后端格式转为前端格式)
 * 
 * 数据驱动：直接根据后端返回的配置字段动态组装，无需硬编码字段
 * 后端格式: { configType: { field1, field2, ... }, ... }
 * 前端格式: { CONFIG_TYPE: { field1, field2, ... }, ... }
 */
function reverseConvertNodeConfig(config: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};
    if (!config) return converted;

    // 将 camelCase 转换为 UPPER_SNAKE_CASE
    const toFrontendKey = (backendKey: string): string => {
        return backendKey
            .replace(/([A-Z])/g, '_$1')
            .toUpperCase();
    };

    // 遍历后端返回的所有配置，动态转换
    Object.keys(config).forEach(backendKey => {
        const value = config[backendKey];
        if (value === null || value === undefined) return;

        const frontendKey = toFrontendKey(backendKey);

        // 直接复制整个配置对象（包含所有字段）
        if (typeof value === 'object' && !Array.isArray(value)) {
            // 对象类型：复制所有内部字段
            converted[frontendKey] = { ...value };
        } else {
            // 基本类型或数组：直接赋值
            converted[frontendKey] = value;
        }
    });

    return converted;
}
