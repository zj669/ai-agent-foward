import React from 'react';
import { RobotOutlined, ThunderboltFilled, BulbFilled, RocketFilled } from '@ant-design/icons';

interface EmptyStateProps {
    agentName: string;
    agentDesc: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ agentName, agentDesc }) => {
    return (
        <div className="mt-16 flex flex-col items-center justify-center gap-8 animate-fadeIn px-4">
            {/* Premium Avatar */}
            <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-xl shadow-indigo-500/30">
                    <RobotOutlined className="text-white drop-shadow-lg" />
                </div>
                {/* Status Badge */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-emerald-400 to-teal-500 px-2.5 py-1 rounded-full shadow-lg text-xs font-bold text-white border-2 border-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    Online
                </div>
            </div>

            {/* Title & Description */}
            <div className="text-center max-w-lg">
                <h2 className="font-extrabold text-2xl md:text-3xl mb-3 text-slate-100">
                    Hello, I'm <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">{agentName}</span>
                </h2>
                <p className="text-slate-400 leading-relaxed text-base">
                    {agentDesc || 'I\'m ready to assist you with complex tasks. Send a message to get started!'}
                </p>
            </div>

            {/* Capability Pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-2">
                <div className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-sm hover:border-indigo-500/50 transition-all cursor-default">
                    <BulbFilled className="text-amber-400 text-base" />
                    <span className="text-sm font-medium text-slate-300">Smart Planning</span>
                </div>
                <div className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-sm hover:border-purple-500/50 transition-all cursor-default">
                    <ThunderboltFilled className="text-purple-400 text-base" />
                    <span className="text-sm font-medium text-slate-300">Fast Execution</span>
                </div>
                <div className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 shadow-sm hover:border-emerald-500/50 transition-all cursor-default">
                    <RocketFilled className="text-emerald-400 text-base" />
                    <span className="text-sm font-medium text-slate-300">Multi-Agent</span>
                </div>
            </div>

            {/* Prompt Hint */}
            <div className="mt-4 px-5 py-3 rounded-xl bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 text-center max-w-md">
                <p className="text-sm text-slate-400">
                    💬 <span className="font-medium text-slate-300">Try asking:</span> "Help me analyze this data" or "Create a summary report"
                </p>
            </div>
        </div>
    );
};

export default EmptyState;
