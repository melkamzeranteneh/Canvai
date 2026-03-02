import type { CanvasState, Node as CanvasNode, Edge as CanvasEdge } from '../../types/canvas';
import { canvasStore } from '../../state/canvas.store';
import { generateId } from '../../utils/id';

// Build a JSON-friendly representation of the canvas nodes/edges.
// Format: { "1": { id, title, content, connectedTo: [2,3] }, ... }
export function buildGraphJson(state?: CanvasState) {
    const s = state ?? canvasStore.getState();
    const nodes = s.nodes ?? [];
    const edges = s.edges ?? [];

    // Map original node id -> numeric index (1-based)
    const idMap: Record<string, number> = {};
    nodes.forEach((n, i) => { idMap[n.id] = i + 1; });

    const out: Record<string, any> = {};
    nodes.forEach((n, i) => {
        const idx = i + 1;
        const connectedTo = edges
            .filter(e => e.source === n.id)
            .map(e => idMap[e.target])
            .filter(Boolean);

        out[String(idx)] = {
            id: n.id,
            title: (n.data && (n.data as any).title) || '',
            content: (n.data && (n.data as any).content) || '',
            connectedTo,
        };
    });

    return out;
}

export function exportGraphJson(state?: CanvasState) {
    const json = buildGraphJson(state);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvai-graph-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function getGraphPreviewString(state?: CanvasState) {
    return JSON.stringify(buildGraphJson(state), null, 2);
}

export function saveGraphToLocalStorage(key = 'canvai_graph_json', state?: CanvasState) {
    const json = buildGraphJson(state);
    try {
        localStorage.setItem(key, JSON.stringify(json));
        return true;
    } catch (e) {
        console.error('Failed to save graph to localStorage', e);
        return false;
    }
}

export function loadGraphFromLocalStorage(key = 'canvai_graph_json') {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error('Failed to load graph from localStorage', e);
        return null;
    }
}

/**
 * Convert the exported JSON format back into canvas nodes & edges.
 * Expected format: {
 *  "1": { id?:string, title, content, connectedTo: [2,3] },
 *  ...
 * }
 */
export function importGraphJson(obj: any): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    if (!obj || typeof obj !== 'object') return { nodes: [], edges: [] };

    const entries = Object.entries(obj).sort((a, b) => Number(a[0]) - Number(b[0]));
    const indexToId: Record<string, string> = {};
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];

    // create nodes
    entries.forEach(([key, val], i) => {
        const nodeId = val && val.id ? String(val.id) : generateId('node_');
        indexToId[key] = nodeId;
        const col = i % 4;
        const row = Math.floor(i / 4);
        nodes.push({
            id: nodeId,
            type: 'markdown',
            position: { x: 120 + col * 320, y: 80 + row * 220 },
            data: {
                title: val.title || '',
                content: val.content || '',
                badge: val.badge || undefined,
                category: val.category || undefined,
                cardType: val.cardType || 'detail',
            },
            width: 320,
            height: 160,
        });
    });

    // create edges from connectedTo lists
    entries.forEach(([key, val]) => {
        if (!val || !Array.isArray(val.connectedTo)) return;
        const fromId = indexToId[key];
        val.connectedTo.forEach((toIdx: number) => {
            const toKey = String(toIdx);
            const toId = indexToId[toKey];
            if (fromId && toId) {
                edges.push({ id: generateId('edge_'), source: fromId, target: toId });
            }
        });
    });

    return { nodes, edges };
}

export function applyImportedGraph(obj: any) {
    const { nodes, edges } = importGraphJson(obj);
    try {
        canvasStore.setState({ nodes, edges });
        saveGraphToLocalStorage();
        return true;
    } catch (e) {
        console.error('Failed to apply imported graph', e);
        return false;
    }
}
