import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';

interface AgentState {
    nodes: Node[];
    edges: Edge[];
    nodeTypes: any[];
    selectedNodeId: string | null;
    selectedEdgeId: string | null;

    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onNodesDelete: (nodes: Node[]) => void;

    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (node: Node) => void;
    setNodeTypes: (types: any[]) => void;
    setSelectedNodeId: (id: string | null) => void;
    setSelectedEdgeId: (id: string | null) => void;
    updateNodeData: (id: string, data: any) => void;
    updateEdgeData: (id: string, data: any) => void;
    setGraph: (nodes: Node[], edges: Edge[]) => void;
    deleteNode: (id: string) => void;
    deleteEdge: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
    nodes: [],
    edges: [],
    nodeTypes: [],
    selectedNodeId: null,
    selectedEdgeId: null,

    onNodesChange: (changes: NodeChange[]) => {
        set((state) => ({
            nodes: applyNodeChanges(changes, state.nodes),
        }));
    },

    onEdgesChange: (changes: EdgeChange[]) => {
        set((state) => ({
            edges: applyEdgeChanges(changes, state.edges),
        }));
    },

    onConnect: (connection: Connection) => {
        set((state) => ({
            edges: addEdge({ ...connection, type: 'custom' }, state.edges), // Use custom edge type by default
        }));
    },

    onNodesDelete: (deleted: Node[]) => {
        set((state) => {
            const deletedIds = new Set(deleted.map((n) => n.id));
            return {
                edges: state.edges.filter(
                    (edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target)
                ),
            };
        });
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

    setNodeTypes: (types) => set({ nodeTypes: types }),

    setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }), // Clear edge selection when node selected
    setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }), // Clear node selection when edge selected

    updateNodeData: (id, data) => set((state) => ({
        nodes: state.nodes.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...data } };
            }
            return node;
        })
    })),

    updateEdgeData: (id, data) => set((state) => ({
        edges: state.edges.map((edge) => {
            if (edge.id === id) {
                return { ...edge, data: { ...edge.data, ...data } };
            }
            return edge;
        })
    })),

    setGraph: (nodes, edges) => set({ nodes, edges }),

    deleteNode: (id) => set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    })),

    deleteEdge: (id) => set((state) => ({
        edges: state.edges.filter((edge) => edge.id !== id),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId
    })),
}));
