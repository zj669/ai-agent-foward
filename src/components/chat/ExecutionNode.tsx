import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined, PauseCircleFilled } from '@ant-design/icons';
import { getIcon } from '@/components/editor/nodeIcons';

interface ExecutionNodeProps {
    data: {
        label: string;
        nodeType: string;
        status?: 'pending' | 'running' | 'completed' | 'error' | 'paused';
        isTarget?: boolean;
        isSource?: boolean;
    };
}

const ExecutionNode: React.FC<ExecutionNodeProps> = ({ data }) => {
    const { label, nodeType, status = 'pending' } = data;

    const getStatusStyles = () => {
        switch (status) {
            case 'running': return { border: 'border-blue-500', strip: 'bg-blue-500', glow: 'node-glow-running', text: 'text-blue-600', iconBg: 'bg-blue-50' };
            case 'completed': return { border: 'border-emerald-500', strip: 'bg-emerald-500', glow: 'node-glow-success', text: 'text-emerald-600', iconBg: 'bg-emerald-50' };
            case 'error': return { border: 'border-red-500', strip: 'bg-red-500', glow: 'node-glow-error', text: 'text-red-600', iconBg: 'bg-red-50' };
            case 'paused': return { border: 'border-amber-500', strip: 'bg-amber-500', glow: '', text: 'text-amber-600', iconBg: 'bg-amber-50' };
            default: return { border: 'border-slate-200', strip: 'bg-slate-200', glow: '', text: 'text-slate-500', iconBg: 'bg-slate-50' };
        }
    };

    const s = getStatusStyles();
    const Icon = getIcon(nodeType);

    return (
        <div className={`
            relative min-w-[180px] rounded-lg bg-paper border transition-all duration-300 overflow-hidden
            ${s.border} ${s.glow} shadow-paper
        `}>
            {/* Color Strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${s.strip}`} />

            {/* Handles */}
            <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2.5 !h-2.5 !border-2 !border-white" />
            <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white" />

            <div className="flex items-center gap-3 p-3 pt-4">
                {/* Icon */}
                <div className={`
                    w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors
                    ${s.iconBg} ${s.text}
                `}>
                    {Icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{label}</div>
                    <div className="text-xs text-slate-500 truncate uppercase tracking-wider scale-90 origin-left font-medium">
                        {nodeType.replace('_NODE', '')}
                    </div>
                </div>

                {/* Status Indicator (Optional, maybe redundant with strip/glow but good for accessibility) */}
                <div className="absolute top-2 right-2">
                    {status === 'running' && <LoadingOutlined className="text-blue-500 text-sm" spin />}
                    {status === 'paused' && <PauseCircleFilled className="text-amber-500 text-sm" />}
                    {status === 'error' && <CloseCircleFilled className="text-red-500 text-sm" />}
                    {status === 'completed' && <CheckCircleFilled className="text-emerald-500 text-sm opacity-50" />}
                </div>
            </div>
        </div>
    );
};

export default ExecutionNode;
