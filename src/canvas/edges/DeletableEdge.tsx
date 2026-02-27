import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { canvasStore } from '../../state/canvas.store';
import { uiStore } from '../../state/ui.store';

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
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isEraserMode = uiStore.getState().eraserMode;

    const onEdgeClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        canvasStore.removeEdge(id);
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            {(selected || isEraserMode) && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            fontSize: 12,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        <button
                            className="edge-delete-button"
                            onClick={onEdgeClick}
                            title="Delete edge"
                        >
                            <X size={10} />
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};
