import React from 'react';
import { CheckCircleOutlined } from '@ant-design/icons';

interface ProgressBarProps {
    current: number;
    total: number;
    percentage: number;
    loading?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, percentage, loading }) => {
    const isCompleted = percentage === 100 && !loading;

    return (
        <div className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm mb-2 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700 flex items-center gap-2">
                    {loading && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                    执行进度
                </span>
                <span className="text-xs text-gray-500 font-mono">
                    {current}/{total} 节点
                </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative">
                <div
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${loading ? 'progress-bar-animated' : 'bg-green-500'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isCompleted && (
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600 animate-fadeIn">
                    <CheckCircleOutlined />
                    <span>执行完成</span>
                </div>
            )}
        </div>
    );
};

export default ProgressBar;
