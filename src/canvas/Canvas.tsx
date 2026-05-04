import { useCallback, useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    useNodesState,
    useEdgesState,
    useReactFlow,
    BackgroundVariant,
    MarkerType,
    type OnConnect,
    useStore,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { canvasStore } from '../state/canvas.store';
import { uiStore } from '../state/ui.store';
import { MarkdownNode } from './nodes/MarkdownNode';
import { DeletableEdge } from './edges/DeletableEdge';
import { nanoid } from 'nanoid';
import './Canvas.css';

const nodeTypes = {
    markdown: MarkdownNode,
};

const edgeTypes = {
    smoothstep: DeletableEdge,
};

const connectionSelector = (state: any) => state.connection;

const CanvasInner: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
    const { screenToFlowPosition } = useReactFlow();
    const connection = useStore(connectionSelector);
    const [eraserMode, setEraserMode] = useState(uiStore.getState().eraserMode);

    const [nodes, setNodes, onNodesChange] = useNodesState(canvasStore.getState().nodes as any);
    const [edges, setEdges, onEdgesChange] = useEdgesState(canvasStore.getState().edges as any);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            setEraserMode(state.eraserMode);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsub = canvasStore.subscribe((state) => {
            setNodes(state.nodes as any);
            setEdges(state.edges as any);
        });
        return () => unsub();
    }, [setNodes, setEdges]);

    const onConnect: OnConnect = useCallback(
        (params) => {
            const edge = { ...params, id: nanoid() };
            canvasStore.addEdge(edge as any);
        },
        []
    );

    const onDrop = useCallback((event: any) => {
        // Detect if dropping onto an existing edge element
        const targetEl = (event.target as HTMLElement).closest?.('.react-flow__edge');
        const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;

        if (targetEl) {
            // Try to extract edge id from element id or data attributes
            const elId = (targetEl as HTMLElement).id || '';
            let edgeId = '';
            if (elId) edgeId = elId.replace('reactflow__edge-', '').replace('react-flow__edge-', '');
            if (!edgeId) edgeId = targetEl.getAttribute('data-edgeid') || targetEl.getAttribute('data-id') || '';

            const edge = edges.find(e => e.id === edgeId);
            if (edge) {
                const pos = screenToFlowPosition({ x: clientX, y: clientY });
                const newNodeId = nanoid();
                const newNode = {
                    id: newNodeId,
                    type: 'markdown',
                    position: { x: pos.x - 160, y: pos.y - 60 },
                    data: { title: 'Inserted Node', content: '', cardType: 'detail', category: 'Inserted' },
                } as any;

                // Replace edge by connecting source->newNode and newNode->target
                canvasStore.removeEdge(edge.id);
                canvasStore.addNode(newNode);
                canvasStore.addEdge({ id: nanoid(), source: edge.source, target: newNodeId } as any);
                canvasStore.addEdge({ id: nanoid(), source: newNodeId, target: edge.target } as any);
            }
        }
    }, [edges, screenToFlowPosition]);

    const onConnectEnd = useCallback(
        (event: any) => {
            const targetIsPane = event.target.classList.contains('react-flow__pane');

            if (targetIsPane && connection.fromNodeId) {
                const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
                const position = screenToFlowPosition({ x: clientX, y: clientY });
                const newNodeId = nanoid();

                const newNode = {
                    id: newNodeId,
                    type: 'markdown',
                    position: { x: position.x - 160, y: position.y - 100 },
                    data: {
                        title: 'New Idea',
                        content: '',
                        cardType: 'detail',
                        category: 'Expansion',
                    },
                };

                canvasStore.addNode(newNode as any);

                canvasStore.addEdge({
                    id: nanoid(),
                    source: connection.fromNodeId,
                    target: newNodeId,
                } as any);
            }
        },
        [screenToFlowPosition, connection]
    );

    const onEdgeClick = useCallback((_: React.MouseEvent, edge: any) => {
        if (uiStore.getState().eraserMode) {
            canvasStore.removeEdge(edge.id);
        }
    }, []);

    const onNodeDragStop = useCallback((_: any, node: any) => {
        canvasStore.updateNode(node.id, { position: node.position });
    }, []);

    const onSelectionChange = useCallback(({ nodes }: { nodes: any[] }) => {
        const selectedId = nodes.length > 0 ? nodes[0].id : null;
        uiStore.setState({ selectedNodeId: selectedId });
    }, []);

    return (
        <div className={`canvas-container ${eraserMode ? 'eraser-cursor' : ''}`}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onEdgeClick={onEdgeClick}
                onNodeDragStop={onNodeDragStop}
                onSelectionChange={onSelectionChange}
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes as any}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 12,
                        height: 12,
                        color: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.20)',
                    },
                    style: {
                        strokeWidth: 1.5,
                        stroke: theme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.16)',
                    },
                    animated: false,
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                className="canvas-react-flow"
                colorMode={theme}
                fitView
            >
                <Background
                    gap={24}
                    size={1}
                    color={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'}
                    variant={BackgroundVariant.Dots}
                />
            </ReactFlow>
        </div>
    );
};

export const Canvas: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => (
    <CanvasInner theme={theme} />
);
