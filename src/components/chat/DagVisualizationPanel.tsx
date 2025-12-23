import React from 'react';
import { ReactFlow, Background, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ExecutionNode from './ExecutionNode';
import AnimatedEdge from './AnimatedEdge';
import { DagNode, DagEdge } from './types';

interface DagVisualizationPanelProps {
    nodes: DagNode[];
    edges: DagEdge[];
    activeNodeId: string | null;
    completedNodeIds: string[];
    errorNodeId: string | null;
    pausedNodeId?: string | null;
    className?: string;
}

const DagVisualization: React.FC<DagVisualizationPanelProps> = ({
    nodes: initialNodes,
    edges: initialEdges,
    activeNodeId,
    completedNodeIds,
    errorNodeId,
    pausedNodeId,
    className
}) => {
    const reactFlowInstance = useReactFlow();

    const nodeTypes = React.useMemo(() => ({ custom: ExecutionNode }), []);
    const edgeTypes = React.useMemo(() => ({ custom: AnimatedEdge }), []);

    const nodesWithStatus = React.useMemo(() => {
        return initialNodes.map(node => {
            let status: 'pending' | 'running' | 'completed' | 'error' | 'paused' = 'pending';

            if (activeNodeId === node.id) status = 'running';
            else if (completedNodeIds.includes(node.id)) status = 'completed';
            else if (errorNodeId === node.id) status = 'error';
            else if (pausedNodeId === node.id) status = 'paused';

            return {
                ...node,
                type: 'custom',
                data: {
                    ...node.data,
                    status,
                    label: node.data.label || node.data.nodeName || 'Unknown Node'
                }
            };
        });
    }, [initialNodes, activeNodeId, completedNodeIds, errorNodeId, pausedNodeId]);

    const edgesWithAnimation = React.useMemo(() => {
        return initialEdges.map(edge => {
            const isSourceRunning = activeNodeId === edge.source;
            return {
                ...edge,
                type: 'custom',
                animated: true,
                data: {
                    isExecuting: isSourceRunning
                },
                style: isSourceRunning
                    ? { stroke: '#a855f7', strokeWidth: 2.5 }
                    : { stroke: '#475569', strokeWidth: 1.5 }
            };
        });
    }, [initialEdges, activeNodeId]);

    React.useEffect(() => {
        if (activeNodeId && reactFlowInstance) {
            const node = nodesWithStatus.find(n => n.id === activeNodeId);
            if (node) {
                reactFlowInstance.setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.2, duration: 800 });
            }
        }
    }, [activeNodeId, reactFlowInstance, nodesWithStatus]);

    React.useEffect(() => {
        if (initialNodes.length > 0) {
            setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 100);
        }
    }, [initialNodes.length, reactFlowInstance]);

    const progressPercentage = React.useMemo(() => {
        if (initialNodes.length === 0) return 0;
        return Math.round((completedNodeIds.length / initialNodes.length) * 100);
    }, [completedNodeIds.length, initialNodes.length]);

    return (
        <div className={`relative w-full h-full dag-blueprint-bg ${className}`}>
            {/* Progress Bar - Dark Theme */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-4 bg-slate-950/90 backdrop-blur-xl rounded-2xl px-5 py-3 border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeNodeId ? 'bg-indigo-500 animate-pulse shadow-lg shadow-indigo-500/50' :
                        completedNodeIds.length > 0 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' :
                            'bg-slate-600'
                        }`}></div>
                    <span className="text-sm font-bold text-slate-100 whitespace-nowrap">
                        {completedNodeIds.length} / {initialNodes.length}
                    </span>
                    <span className="text-xs text-slate-400">nodes</span>
                </div>

                <div className="flex-1 h-2.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <span className="text-sm font-bold text-slate-100 tabular-nums min-w-[3.5rem] text-right">
                    {progressPercentage}%
                </span>
            </div>

            <ReactFlow
                nodes={nodesWithStatus}
                edges={edgesWithAnimation}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                minZoom={0.5}
                maxZoom={2}
                nodesDraggable={false}
                nodesConnectable={false}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#475569" gap={25} size={1} />
            </ReactFlow>
        </div>
    );
};

const DagVisualizationPanel: React.FC<DagVisualizationPanelProps> = (props) => {
    return (
        <ReactFlowProvider>
            <DagVisualization {...props} />
        </ReactFlowProvider>
    );
};

export default DagVisualizationPanel;
