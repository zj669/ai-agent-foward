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

    // 3. 转换边 (保留 edgeType)
    const convertedEdges: EdgeDefinition[] = edges.map(edge => ({
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label as string || undefined,
        condition: undefined,
        edgeType: (edge.data?.edgeType as string) || 'DEPENDENCY'
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

    // 2. 转换边 (恢复 edgeType 到 data)
    const edges: Edge[] = (schema.edges || []).map(edge => ({
        id: edge.edgeId,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'custom', // Force custom edge type for visual rendering
        data: {
            edgeType: edge.edgeType || 'DEPENDENCY'
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
