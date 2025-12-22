import React, { useState } from 'react';
import { CaretRightOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, BulbOutlined, PlayCircleOutlined, ToolOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { NodeExecution } from './types';

interface NodeTimelineProps {
    node: NodeExecution;
    isLast: boolean;
}

const getNodeIcon = (nodeName: string) => {
    if (nodeName.includes('计划')) return <BulbOutlined />;
    if (nodeName.includes('执行')) return <PlayCircleOutlined />;
    if (nodeName.includes('工具')) return <ToolOutlined />;
    return <CaretRightOutlined />;
};

const NodeTimeline: React.FC<NodeTimelineProps> = ({ node, isLast }) => {
    const defaultExpanded = node.status === 'running' || node.status === 'error';
    const [expanded, setExpanded] = useState(defaultExpanded);

    const toggleExpand = () => setExpanded(!expanded);

    // Markdown rendering logic (reused)
    const renderMarkdown = (content: string) => (
        <ReactMarkdown
            components={{
                code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md !bg-[#1e1e1e] !my-2 text-xs"
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className={`${className} bg-gray-100 text-red-500 rounded px-1 py-0.5 text-xs`} {...props}>
                            {children}
                        </code>
                    );
                }
            }}
        >
            {content}
        </ReactMarkdown>
    );

    return (
        <div className="node-timeline-item">
            <div className="node-timeline-line" />

            {/* Header / Status Line */}
            <div
                className="flex items-center gap-3 py-1 cursor-pointer group"
                onClick={toggleExpand}
            >
                {/* Status Dot */}
                <div className={`node-status-dot flex items-center justify-center ${node.status}`}>
                    {node.status === 'running' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>

                {/* Node Info */}
                <div className="flex-1 flex items-center gap-2">
                    <span className={`text-sm font-medium ${node.status === 'running' ? 'text-blue-600' : 'text-gray-700'}`}>
                        {node.nodeName}
                    </span>
                    {node.status === 'running' && (
                        <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1">
                            <SyncOutlined spin /> 执行中...
                        </span>
                    )}
                    {node.status === 'completed' && node.duration && (
                        <span className="text-xs text-gray-400">
                            {(node.duration / 1000).toFixed(1)}s
                        </span>
                    )}
                    {node.status === 'error' && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                            <CloseCircleOutlined /> 失败
                        </span>
                    )}
                </div>

                {/* Expand Icon */}
                <div className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                    <CaretRightOutlined style={{ fontSize: '10px' }} />
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="ml-1 pl-4 pb-4 animate-fadeIn">
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-xs text-gray-600 font-mono shadow-inner max-h-60 overflow-y-auto custom-scrollbar">
                        {node.content ? renderMarkdown(node.content) : (
                            <span className="text-gray-400 italic flex items-center gap-2">
                                <SyncOutlined spin className="text-blue-400" />
                                等待输出...
                            </span>
                        )}
                        {node.result && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-green-700">
                                <strong>Result:</strong> {node.result}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodeTimeline;
