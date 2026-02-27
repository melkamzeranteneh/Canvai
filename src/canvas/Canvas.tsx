import { useCallback, useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
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

    const [nodes, setNodes, _onNodesChange] = useNodesState(canvasStore.getState().nodes as any);
    const [edges, setEdges, _onEdgesChange] = useEdgesState(canvasStore.getState().edges as any);

    useEffect(() => {
        const unsubscribe = uiStore.subscribe(state => {
            setEraserMode(state.eraserMode);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsub = canvasStore.subscribe((state) => {
            // Update local state ONLY if it's different to prevent infinite loops or jumps
            // But actually, React Flow changes need to be pushed TO the store.
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

                // Small delay to ensure connection state is still valid if needed, 
                // but usually fine to do immediately.
                const newNode = {
                    id: newNodeId,
                    type: 'markdown',
                    position: { x: position.x - 150, y: position.y - 100 },
                    data: { content: '', width: 300, height: 200 },
                };

                canvasStore.addNode(newNode as any);

                const newEdge = {
                    id: nanoid(),
                    source: connection.fromNodeId,
                    sourceHandle: connection.fromHandleId,
                    target: newNodeId,
                    targetHandle: null,
                };
                canvasStore.addEdge(newEdge as any);
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
                onNodesChange={_onNodesChange}
                onEdgesChange={_onEdgesChange}
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
                        width: 18,
                        height: 18,
                        color: '#6b7280',
                    },
                    style: {
                        strokeWidth: 2,
                        stroke: '#6b7280',
                    },
                    animated: false,
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
                className="canvas-react-flow"
                colorMode="dark"
            >
                <Background
                    gap={20}
                    size={1}
                    color="rgba(255, 255, 255, 0.08)"
                    variant={BackgroundVariant.Dots}
                />
                <Controls />
                <MiniMap
                    style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        bottom: 20,
                        right: 20,
                        width: 200,
                        height: 150
                    }}
                    nodeColor="#333"
                    maskColor="rgba(0, 0, 0, 0.4)"
                    ariaLabel="Canvas Overview"
                />
            </ReactFlow>
        </div>
    );
};

export const Canvas = () => (
    <CanvasInner />
);
