import React from 'react';
import { RobotOutlined } from '@ant-design/icons';

interface EmptyStateProps {
    agentName: string;
    agentDesc: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ agentName, agentDesc }) => {
    return (
        <div className="mt-20 flex flex-col items-center justify-center text-gray-400 gap-6 animate-fadeIn">
            <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center text-4xl shadow-lg border-2 border-white">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        <RobotOutlined />
                    </span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1 rounded-full shadow-md text-xs font-bold text-blue-600 border border-blue-50">
                    AI
                </div>
            </div>

            <div className="text-center max-w-md px-4">
                <h3 className="font-bold text-gray-800 text-xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
                    你好，我是 {agentName}
                </h3>
                <p className="text-gray-500 leading-relaxed text-sm">
                    {agentDesc || '我已准备好协助你，请发送消息开始对话。'}
                </p>
            </div>

            <div className="flex gap-3 text-xs text-gray-400 mt-4">
                <span className="bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm text-blue-600 bg-opacity-60 backdrop-blur-sm">
                    ✨ 任务规划
                </span>
                <span className="bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm text-purple-600 bg-opacity-60 backdrop-blur-sm">
                    ⚡ 高效执行
                </span>
                <span className="bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm text-indigo-600 bg-opacity-60 backdrop-blur-sm">
                    🧠 智能分析
                </span>
            </div>
        </div>
    );
};

export default EmptyState;
