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

    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;

    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (node: Node) => void;
    setNodeTypes: (types: any[]) => void;
    setSelectedNodeId: (id: string | null) => void;
    updateNodeData: (id: string, data: any) => void;
    setGraph: (nodes: Node[], edges: Edge[]) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
    nodes: [],
    edges: [],
    nodeTypes: [],
    selectedNodeId: null,

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
            edges: addEdge(connection, state.edges),
        }));
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

    setNodeTypes: (types) => set({ nodeTypes: types }),

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    updateNodeData: (id, data) => set((state) => ({
        nodes: state.nodes.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...data } };
            }
            return node;
        })
    })),

    setGraph: (nodes, edges) => set({ nodes, edges }),
}));
