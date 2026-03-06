import type { CanvasState, Node, Edge } from '../types/canvas';

let state: CanvasState = {
    nodes: [],
    edges: []
};

type Listener = (state: CanvasState) => void;
const listeners = new Set<Listener>();

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 160;
const NODE_GAP = 18;

const getNodeSize = (node: Partial<Node>) => ({
    width: node.width ?? node.data?.width ?? DEFAULT_NODE_WIDTH,
    height: node.height ?? node.data?.height ?? DEFAULT_NODE_HEIGHT,
});

const isOverlapping = (
    position: { x: number; y: number },
    size: { width: number; height: number },
    other: Node
) => {
    const otherW = other.width ?? other.data?.width ?? DEFAULT_NODE_WIDTH;
    const otherH = other.height ?? other.data?.height ?? DEFAULT_NODE_HEIGHT;

    return (
        position.x < other.position.x + otherW + NODE_GAP &&
        position.x + size.width + NODE_GAP > other.position.x &&
        position.y < other.position.y + otherH + NODE_GAP &&
        position.y + size.height + NODE_GAP > other.position.y
    );
};

const findNearestFreePosition = (
    desired: { x: number; y: number },
    movingNodeId: string | null,
    size: { width: number; height: number }
) => {
    const collidesAt = (pos: { x: number; y: number }) =>
        state.nodes.some((n) => n.id !== movingNodeId && isOverlapping(pos, size, n));

    if (!collidesAt(desired)) return desired;

    // Probe around target in expanding rings so nodes settle close to drop position.
    const step = 28;
    const maxRadius = 24;
    for (let r = 1; r <= maxRadius; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const candidate = { x: desired.x + dx * step, y: desired.y + dy * step };
                if (!collidesAt(candidate)) return candidate;
            }
        }
    }

    return desired;
};

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
    addNode: (node: Partial<Node>) => {
        const size = getNodeSize(node);
        const desiredPosition = node.position || { x: 0, y: 0 };
        const safePosition = findNearestFreePosition(desiredPosition, node.id || null, size);

        const n: Node = {
            id: node.id || `node_${Date.now()}`,
            type: node.type || 'markdown',
            position: safePosition,
            data: node.data || {},
            width: size.width,
            height: size.height,
        };
        canvasStore.setState({ nodes: [...state.nodes, n] });
    },
    updateNode: (id: string, updates: Partial<Node>) => {
        const current = state.nodes.find(n => n.id === id);
        if (!current) return;

        let resolvedUpdates = updates;

        if (updates.position) {
            const size = getNodeSize({ ...current, ...updates });
            const safePosition = findNearestFreePosition(updates.position, id, size);
            resolvedUpdates = { ...updates, position: safePosition };
        }

        canvasStore.setState({
            nodes: state.nodes.map(n => n.id === id ? { ...n, ...resolvedUpdates } : n)
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
