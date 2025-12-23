import React, { useCallback, useRef, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useReactFlow, Connection, addEdge, Edge, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAgentStore } from '@/store/useAgentStore';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { Modal, message, Button, Tooltip } from 'antd';
import { ExclamationCircleOutlined, VerticalAlignTopOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { EdgeType } from '@/types';
import useAutoLayout from '@/hooks/useAutoLayout';

const nodeTypes = {
    custom: CustomNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

// Check if adding an edge would create a cycle
const wouldCreateCycle = (nodes: any[], edges: any[], source: string, target: string): boolean => {
    // Build adjacency list from existing edges
    const adjacencyList = new Map<string, string[]>();
    nodes.forEach(node => adjacencyList.set(node.id, []));
    edges.forEach(edge => {
        const neighbors = adjacencyList.get(edge.source) || [];
        neighbors.push(edge.target);
        adjacencyList.set(edge.source, neighbors);
    });

    // Add the new edge temporarily
    const neighbors = adjacencyList.get(source) || [];
    neighbors.push(target);
    adjacencyList.set(source, neighbors);

    // DFS to check if we can reach source from target (which would mean a cycle)
    const visited = new Set<string>();
    const stack = [target];

    while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) {
            return true; // Found a cycle
        }
        if (visited.has(current)) {
            continue;
        }
        visited.add(current);
        const nextNodes = adjacencyList.get(current) || [];
        stack.push(...nextNodes);
    }

    return false;
};

const FlowCanvas: React.FC = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        setEdges,
        addNode,
        setSelectedNodeId,
        setSelectedEdgeId,
        onNodesDelete
    } = useAgentStore();

    const instance = useReactFlow();
    const { onLayout } = useAutoLayout();

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow/type');
            const label = event.dataTransfer.getData('application/reactflow/label');
            const dataStr = event.dataTransfer.getData('application/reactflow/data');

            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = instance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            let extraData: any = {};
            try {
                if (dataStr) {
                    extraData = JSON.parse(dataStr);
                }
            } catch (e) {
                console.error('Failed to parse node data', e);
            }

            const newNode = {
                id: `node_${Date.now()}`,
                type: 'custom',
                position,
                data: {
                    label: label,
                    ...extraData,
                    nodeType: extraData.nodeType || 'UNKNOWN',
                },
            };

            addNode(newNode);
        },
        [instance, addNode],
    );

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
    }, [setSelectedNodeId, setSelectedEdgeId]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
        setSelectedNodeId(node.id);
    }, [setSelectedNodeId]);

    const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
        setSelectedEdgeId(edge.id);
    }, [setSelectedEdgeId]);

    // Custom connect handler with loop detection
    const handleConnect = useCallback((connection: Connection) => {
        if (!connection.source || !connection.target) return;

        const isCycle = wouldCreateCycle(nodes, edges, connection.source, connection.target);

        if (isCycle) {
            // Show confirmation modal for loop edge
            Modal.confirm({
                title: '检测到环形连接',
                icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
                content: (
                    <div>
                        <p>您正在创建一条会形成环路的连接线。</p>
                        <p className="mt-2 text-gray-500 text-sm">
                            环路连接将被设置为 <strong className="text-red-500">循环回溯 (Loop Back)</strong> 类型，
                            用于支持如 ReAct 模式的迭代执行。
                        </p>
                    </div>
                ),
                okText: '确认创建循环边',
                cancelText: '取消',
                okButtonProps: { danger: true },
                onOk: () => {
                    // Create edge with LOOP_BACK type
                    const newEdge: Edge = {
                        id: `${connection.source}-${connection.target}-${Date.now()}`,
                        source: connection.source!,
                        target: connection.target!,
                        sourceHandle: connection.sourceHandle,
                        targetHandle: connection.targetHandle,
                        type: 'custom',
                        data: { edgeType: EdgeType.LOOP_BACK },
                    };
                    setEdges([...edges, newEdge]);
                    message.success('已创建循环边');
                },
            });
        } else {
            // Normal edge
            const newEdge: Edge = {
                id: `${connection.source}-${connection.target}-${Date.now()}`,
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
                type: 'custom',
                data: { edgeType: EdgeType.DEPENDENCY },
            };
            setEdges([...edges, newEdge]);
        }
    }, [nodes, edges, setEdges]);

    return (
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                nodeTypes={nodeTypes}
                edges={edges}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onPaneClick={onPaneClick}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodesDelete={onNodesDelete}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />

                {/* Auto Layout Panel */}
                <Panel position="top-right" className="bg-white p-2 rounded shadow-md gap-2 flex">
                    <Tooltip title="自动整理 (水平布局)">
                        <Button
                            icon={<ArrowRightOutlined />}
                            onClick={() => onLayout('LR')}
                            size="small"
                        >
                            水平整理
                        </Button>
                    </Tooltip>
                    <Tooltip title="自动整理 (垂直布局)">
                        <Button
                            icon={<VerticalAlignTopOutlined />}
                            onClick={() => onLayout('TB')}
                            size="small"
                        >
                            垂直整理
                        </Button>
                    </Tooltip>
                </Panel>
            </ReactFlow>
        </div>
    );
};

const FlowCanvasWrapper: React.FC = () => {
    return (
        <ReactFlowProvider>
            <FlowCanvas />
        </ReactFlowProvider>
    );
}

export default FlowCanvasWrapper;
