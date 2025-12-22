import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
    RobotOutlined,
    ApiOutlined,
    CodeSandboxOutlined,
    GatewayOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    BugOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import llmIcon from '@/assets/icons/llm.svg';
import codeIcon from '@/assets/icons/code.svg';
import apiIcon from '@/assets/icons/api.svg';
import routerIcon from '@/assets/icons/router.svg';
import humanIcon from '@/assets/icons/human.svg';
import planIcon from '@/assets/icons/plan.svg';
import reactIcon from '@/assets/icons/react.svg';
import actIcon from '@/assets/icons/act.svg';

// Map icon strings to images
const getIcon = (iconName: string) => {
    if (!iconName) return <img src={codeIcon} className="w-5 h-5 opacity-50" />;
    const name = iconName.toLowerCase();

    if (name.includes('llm')) return <img src={llmIcon} className="w-6 h-6" />;
    if (name.includes('code')) return <img src={codeIcon} className="w-6 h-6" />;
    if (name.includes('api')) return <img src={apiIcon} className="w-6 h-6" />;
    if (name.includes('router')) return <img src={routerIcon} className="w-6 h-6" />;

    if (name.includes('act')) return <img src={actIcon} className="w-6 h-6" />;
    if (name.includes('human')) return <img src={humanIcon} className="w-6 h-6" />;
    if (name.includes('plan')) return <img src={planIcon} className="w-6 h-6" />;
    if (name.includes('react')) return <img src={reactIcon} className="w-6 h-6" />;

    return <img src={codeIcon} className="w-6 h-6 opacity-50" />;
};

// Define colors based on type
const getTypeStyle = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('llm') || t.includes('react')) return { border: 'border-purple-300', bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', glow: 'shadow-purple-200' };
    if (t.includes('code') || t.includes('plan')) return { border: 'border-blue-300', bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', glow: 'shadow-blue-200' };
    if (t.includes('api') || t.includes('act')) return { border: 'border-green-300', bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-600', glow: 'shadow-green-200' };
    if (t.includes('router')) return { border: 'border-orange-300', bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', glow: 'shadow-orange-200' };
    if (t.includes('human')) return { border: 'border-pink-300', bg: 'bg-pink-50', iconBg: 'bg-pink-100', iconColor: 'text-pink-600', glow: 'shadow-pink-200' };

    return { border: 'border-gray-300', bg: 'bg-white', iconBg: 'bg-gray-100', iconColor: 'text-gray-600', glow: 'shadow-gray-200' };
};

const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
    // nodeType is stored in data.nodeType (e.g., 'LLM_NODE')
    const nodeType = data.nodeType as string;
    const style = getTypeStyle(nodeType);

    // Mock status logic (later connect to real runtime status)
    const status = (data.status as string) || 'idle';

    return (
        <div
            className={`
                relative min-w-[160px] max-w-[240px] rounded-xl border-2 transition-all duration-300 animate-pop-in
                ${selected ? `border-blue-500 shadow-xl ${style.glow}` : `${style.border} shadow-md hover:shadow-lg`}
                bg-white group
            `}
        >
            {/* Header */}
            <div className={`
                flex items-center gap-2 px-3 py-2 rounded-t-lg border-b border-gray-100
                ${style.bg}
            `}>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${style.iconBg} flex-shrink-0`}>
                    {getIcon(data.icon as string || nodeType)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-xs truncate" title={data.label as string}>{data.label as React.ReactNode}</div>
                    <div className="text-[9px] text-gray-500 font-mono truncate opacity-70 leading-tight">{nodeType}</div>
                </div>
                {/* Status Indicator */}
                {status === 'running' && <LoadingOutlined className="text-blue-500 animate-spin text-xs" />}
                {status === 'success' && <CheckCircleOutlined className="text-emerald-500 text-xs" />}
                {status === 'error' && <BugOutlined className="text-red-500 text-xs" />}
            </div>

            {/* Body */}
            <div className="p-2 bg-white rounded-b-lg">
                <div className="text-[10px] text-gray-400 line-clamp-2 min-h-[1.2rem] leading-relaxed">
                    {(data.description as string) || '暂无描述...'}
                </div>
            </div>

            {/* Handles - Standard Left to Right */}
            <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-gray-400 border-2 border-white" />
            <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-blue-500 border-2 border-white" />
        </div>
    );
};

export default memo(CustomNode);
