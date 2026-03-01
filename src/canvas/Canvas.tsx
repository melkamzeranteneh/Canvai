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
    default: DeletableEdge,
};

const connectionSelector = (state: any) => state.connection;

const CanvasInner = () => {
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
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes as any}
                defaultEdgeOptions={{
                    type: 'default',
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 14,
                        height: 14,
                        color: 'var(--accent-color)',
                    },
                    style: {
                        strokeWidth: 3,
                        stroke: 'rgba(16,185,129,0.85)',
                    },
                    animated: false,
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                className="canvas-react-flow"
                colorMode="light"
                fitView
            >
                <Background
                    gap={25}
                    size={1}
                    color="rgba(0, 0, 0, 0.03)"
                    variant={BackgroundVariant.Dots}
                />
            </ReactFlow>
        </div>
    );
};

export const Canvas = () => (
    <CanvasInner />
);
