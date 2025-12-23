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

    const getStatusColor = () => {
        switch (status) {
            case 'running': return 'border-blue-500 text-blue-400 node-glow-running';
            case 'completed': return 'border-emerald-500 text-emerald-400 node-glow-success';
            case 'error': return 'border-red-500 text-red-400';
            case 'paused': return 'border-amber-500 text-amber-400';
            default: return 'border-gray-700 text-gray-500';
        }
    };

    const Icon = getIcon(nodeType);

    return (
        <div className={`
            relative min-w-[180px] p-3 rounded-lg bg-[#111827]/90 backdrop-blur-md border transition-all duration-300
            ${getStatusColor()}
        `}>
            {/* Handles */}
            <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />
            <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-2 !h-2" />

            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center text-lg
                    ${status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        status === 'running' ? 'bg-indigo-500/20 text-indigo-400' :
                            status === 'error' ? 'bg-red-500/20 text-red-400' :
                                'bg-slate-700 text-slate-400'}
                `}>
                    {Icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{label}</div>
                    <div className="text-xs text-slate-400 truncate uppercase tracking-wider scale-90 origin-left">
                        {nodeType.replace('_NODE', '')}
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute -top-1.5 -right-1.5 bg-slate-800 rounded-full p-0.5 shadow-sm">
                    {status === 'running' && <LoadingOutlined className="text-indigo-400 text-lg" spin />}
                    {status === 'completed' && <CheckCircleFilled className="text-emerald-500 text-lg" />}
                    {status === 'error' && <CloseCircleFilled className="text-red-500 text-lg" />}
                    {status === 'paused' && <PauseCircleFilled className="text-amber-500 text-lg" />}
                </div>
            </div>
        </div>
    );
};

export default ExecutionNode;
