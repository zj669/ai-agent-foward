import React, { useState } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { EdgeType } from '@/types';
import { Dropdown, MenuProps } from 'antd';
import { SwapOutlined, SyncOutlined, BranchesOutlined, LinkOutlined } from '@ant-design/icons';
import { useAgentStore } from '@/store/useAgentStore';

const edgeTypeConfig = {
    [EdgeType.DEPENDENCY]: {
        label: '标准依赖',
        icon: <LinkOutlined />,
        color: '#1890ff',
    },
    [EdgeType.LOOP_BACK]: {
        label: '循环回溯',
        icon: <SyncOutlined />,
        color: '#ff4d4f',
    },
    [EdgeType.CONDITIONAL]: {
        label: '条件分支',
        icon: <BranchesOutlined />,
        color: '#faad14',
    },
};

const CustomEdge: React.FC<EdgeProps> = ({
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
    selected,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const { updateEdgeData } = useAgentStore();

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 20,
    });

    const edgeType = (data?.edgeType as EdgeType) || EdgeType.DEPENDENCY;
    const config = edgeTypeConfig[edgeType];

    // Determine styles based on edge type
    let edgeStyle: React.CSSProperties = { ...style };

    if (edgeType === EdgeType.LOOP_BACK) {
        edgeStyle = {
            ...edgeStyle,
            stroke: '#ff4d4f',
            strokeDasharray: '5,5',
            strokeWidth: selected || isHovered ? 3 : 2,
        };
    } else if (edgeType === EdgeType.CONDITIONAL) {
        edgeStyle = {
            ...edgeStyle,
            stroke: '#faad14',
            strokeWidth: selected || isHovered ? 3 : 2,
        };
    } else {
        edgeStyle = {
            ...edgeStyle,
            stroke: selected || isHovered ? '#1890ff' : '#b1b1b7',
            strokeWidth: selected || isHovered ? 3 : 2,
        };
    }

    if (selected) {
        edgeStyle.filter = 'drop-shadow(0 0 4px rgba(24, 144, 255, 0.5))';
    }

    const handleTypeChange = (newType: EdgeType) => {
        updateEdgeData(id, { edgeType: newType });
    };

    const menuItems: MenuProps['items'] = [
        {
            key: EdgeType.DEPENDENCY,
            label: '标准依赖 (Dependency)',
            icon: <LinkOutlined style={{ color: '#1890ff' }} />,
            onClick: () => handleTypeChange(EdgeType.DEPENDENCY),
        },
        {
            key: EdgeType.LOOP_BACK,
            label: '循环回溯 (Loop Back)',
            icon: <SyncOutlined style={{ color: '#ff4d4f' }} />,
            onClick: () => handleTypeChange(EdgeType.LOOP_BACK),
        },
        {
            key: EdgeType.CONDITIONAL,
            label: '条件分支 (Conditional)',
            icon: <BranchesOutlined style={{ color: '#faad14' }} />,
            onClick: () => handleTypeChange(EdgeType.CONDITIONAL),
        },
    ];

    return (
        <>
            {/* Invisible wider path for easier hover/click */}
            <path
                d={edgePath}
                fill="none"
                strokeWidth={20}
                stroke="transparent"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ cursor: 'pointer' }}
            />
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />

            {/* Center button - always visible on hover or selected */}
            {(isHovered || selected) && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <Dropdown menu={{ items: menuItems, selectedKeys: [edgeType] }} trigger={['click']} placement="bottom">
                            <button
                                className="flex items-center justify-center w-7 h-7 rounded-full shadow-lg border-2 transition-all duration-200 hover:scale-110"
                                style={{
                                    backgroundColor: 'white',
                                    borderColor: config.color,
                                    color: config.color,
                                }}
                                title="点击切换连接类型"
                            >
                                <SwapOutlined style={{ fontSize: 14 }} />
                            </button>
                        </Dropdown>
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* Loop label */}
            {edgeType === EdgeType.LOOP_BACK && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 20}px)`,
                            fontSize: 10,
                            pointerEvents: 'none',
                        }}
                        className="nodrag nopan text-red-500 font-bold bg-white px-1 rounded shadow-sm"
                    >
                        ↺ Loop
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* Conditional label */}
            {edgeType === EdgeType.CONDITIONAL && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 20}px)`,
                            fontSize: 10,
                            pointerEvents: 'none',
                        }}
                        className="nodrag nopan text-yellow-600 font-bold bg-white px-1 rounded shadow-sm"
                    >
                        ⇉ Conditional
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default CustomEdge;
