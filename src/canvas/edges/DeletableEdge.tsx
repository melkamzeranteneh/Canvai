import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';

export const DeletableEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.2,
    });

    const onEdgeRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        canvasStore.removeEdge(id);
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={{
                ...style,
                strokeWidth: selected ? 4 : 2,
                stroke: selected ? 'var(--accent-color)' : 'rgba(108,117,125,0.6)',
                transition: 'stroke 0.2s ease',
            }} />

            {/* Wider invisible path for interaction */}
            <path
                d={edgePath}
                fill="none"
                strokeOpacity={0}
                strokeWidth={20}
                className="react-flow__edge-interaction"
            />

            {selected && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            zIndex: 1000,
                        }}
                    >
                        <button
                            onClick={onEdgeRemove}
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: '#1e293b',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};
