import type { CanvasState, Node, Edge } from '../types/canvas';

let state: CanvasState = {
    nodes: [],
    edges: []
};

type Listener = (state: CanvasState) => void;
const listeners = new Set<Listener>();

export const canvasStore = {
    getState: () => state,
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
    setState: (newState: Partial<CanvasState>) => {
        state = { ...state, ...newState };
        listeners.forEach(l => l(state));
    },
    onNodesChange: (_changes: any[]) => {
        // Handled in component
    },
    onEdgesChange: (_changes: any[]) => {
        // Handled in component
    },
    addNode: (node: Node) => {
        canvasStore.setState({ nodes: [...state.nodes, node] });
    },
    updateNode: (id: string, updates: Partial<Node>) => {
        canvasStore.setState({
            nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
        });
    },
    removeNode: (id: string) => {
        canvasStore.setState({
            nodes: state.nodes.filter(n => n.id !== id),
            edges: state.edges.filter(e => e.source !== id && e.target !== id)
        });
    },
    addEdge: (edge: Edge) => {
        canvasStore.setState({ edges: [...state.edges, edge] });
    },
    removeEdge: (id: string) => {
        canvasStore.setState({ edges: state.edges.filter(e => e.id !== id) });
    }
};
