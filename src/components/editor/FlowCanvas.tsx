import React, { useCallback, useRef } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAgentStore } from '@/store/useAgentStore';

const FlowCanvas: React.FC = () => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setSelectedNodeId } = useAgentStore();
    // const { screenToFlowPosition } = useReactFlow(); // screenToFlowPosition might be unstable in some versions? No, it's standard now.
    // However, useReactFlow must be inside ReactFlowProvider. FlowCanvas is inside FlowCanvasWrapper which has Provider.
    const instance = useReactFlow();

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
                type: 'default', // Using default visual type for now
                position,
                data: {
                    label: label,
                    ...extraData,
                    nodeType: extraData.nodeType || 'UNKNOWN', // Store real business logic type in data.nodeType
                },
            };

            addNode(newNode);
        },
        [instance, addNode],
    );

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, [setSelectedNodeId]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
        setSelectedNodeId(node.id);
    }, [setSelectedNodeId]);

    return (
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onPaneClick={onPaneClick}
                onNodeClick={onNodeClick}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap />
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
