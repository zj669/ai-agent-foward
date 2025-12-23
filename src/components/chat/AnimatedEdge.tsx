import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';

const AnimatedEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isExecuting = data?.isExecuting;

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            {isExecuting && (
                <circle r="4" fill="#3b82f6">
                    <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
                </circle>
            )}
        </>
    );
};

export default AnimatedEdge;
