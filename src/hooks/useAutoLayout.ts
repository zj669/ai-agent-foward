import { useCallback } from 'react';
import dagre from 'dagre';
import { Node, Edge, useReactFlow } from '@xyflow/react';

const options = {
    rankdir: 'LR', // Left to Right
    align: 'DL',   // Align top-left
    nodesep: 80,   // Horizontal spacing between nodes
    ranksep: 120,  // Vertical spacing between ranks
    edgesep: 20,   // Separation between edges
};

/**
 * Hook to perform auto layout on the graph using Dagre
 */
const useAutoLayout = () => {
    const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow();

    const onLayout = useCallback((direction: 'LR' | 'TB' = 'LR') => {
        const nodes = getNodes();
        const edges = getEdges();

        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        // Direction: 'LR' (Left to Right) or 'TB' (Top to Bottom)
        const isHorizontal = direction === 'LR';
        dagreGraph.setGraph({
            ...options,
            rankdir: direction,
        });

        // Add nodes to dagre
        nodes.forEach((node) => {
            // Need to account for node dimensions. Custom nodes might be larger.
            // Using approximate dimensions if not measured yet.
            const width = node.measured?.width || 200;
            const height = node.measured?.height || 80;
            dagreGraph.setNode(node.id, { width, height });
        });

        // Add edges to dagre
        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        // Calculate layout
        dagre.layout(dagreGraph);

        // Update node positions
        // Dagre coordinate is the center of the node, React Flow needs top-left
        const layoutedNodes = nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            const width = node.measured?.width || 200;
            const height = node.measured?.height || 80;

            return {
                ...node,
                targetPosition: isHorizontal ? 'left' : 'top',
                sourcePosition: isHorizontal ? 'right' : 'bottom',
                // We are shifting the dagre node position (anchor=center center) to the top left
                // so it matches the React Flow node anchor point (top left).
                position: {
                    x: nodeWithPosition.x - width / 2,
                    y: nodeWithPosition.y - height / 2,
                },
            };
        });

        setNodes(layoutedNodes);

        // Fit view after small delay to allow node re-rendering
        window.requestAnimationFrame(() => {
            fitView({ padding: 0.2, duration: 800 });
        });
    }, [getNodes, getEdges, setNodes, setEdges, fitView]);

    return { onLayout };
};

export default useAutoLayout;
