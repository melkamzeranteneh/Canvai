import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
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
    label,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 8,
    });

    const onEdgeRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        canvasStore.removeEdge(id);
    };

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: selected ? 2 : 1.5,
                    stroke: selected
                        ? 'var(--accent-color)'
                        : 'rgba(255, 255, 255, 0.18)',
                    transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
                    strokeDasharray: selected ? undefined : undefined,
                }}
            />

            {/* Wide invisible hit area */}
            <path
                d={edgePath}
                fill="none"
                strokeOpacity={0}
                strokeWidth={20}
                className="react-flow__edge-interaction"
            />

            {/* Edge label (e.g. "match" / "no match") */}
            {label && (
                <EdgeLabelRenderer>
                    <div
                        className="edge-label"
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'none',
                        }}
                    >
                        {label as string}
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* Delete button shown when selected */}
            {selected && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            zIndex: 1000,
                            /* offset so label & delete button don't stack */
                            marginTop: label ? '24px' : undefined,
                        }}
                    >
                        <button
                            onClick={onEdgeRemove}
                            className="edge-delete-btn"
                        >
                            <X size={11} />
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};
