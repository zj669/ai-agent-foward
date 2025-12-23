import React from 'react';
import { Avatar, Tooltip, Button, message as antdMessage } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import dayjs from 'dayjs';
import { ChatMessage } from './types';
import ProgressBar from './ProgressBar';
import NodeTimeline from './NodeTimeline';

interface MessageBubbleProps {
    message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => antdMessage.success('复制成功'));
    };

    const renderMarkdown = (content: string) => (
        <ReactMarkdown
            components={{
                code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                        <div className="relative group/code my-2">
                            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                <Tooltip title="复制带代码">
                                    <Button
                                        type="text"
                                        icon={<CopyOutlined />}
                                        size="small"
                                        className="text-gray-400 hover:text-white"
                                        onClick={() => handleCopy(String(children))}
                                    />
                                </Tooltip>
                            </div>
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md !bg-[#0d1117] !my-0 text-sm border border-white/10"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        </div>
                    ) : (
                        <code className={`${className} bg-white/5 text-pink-400 rounded px-1.5 py-0.5 text-xs font-mono border border-white/10`} {...props}>
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
        <div className={`flex gap-4 message-bubble ${isUser ? 'justify-end' : 'justify-start'}`}>
            {isAssistant && (
                <Avatar
                    icon={<RobotOutlined />}
                    className="bg-indigo-600 flex-shrink-0 mt-1 shadow-lg shadow-indigo-500/20 border-2 border-white/10"
                    size="large"
                />
            )}

            <div className={`flex flex-col max-w-[90%] md:max-w-[85%] gap-2 ${isUser ? 'items-end' : 'items-start'}`}>

                {/* User Message */}
                {isUser && (
                    <div className="bubble-user p-4 rounded-2xl rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                    </div>
                )}

                {/* Assistant Message */}
                {isAssistant && (
                    <div className="flex flex-col gap-3 w-full animate-fadeIn">

                        {/* 1. Reasoning Process (Glass Box) */}
                        {(message.nodes.length > 0 || (message.loading && !message.content)) && (
                            <div className={`bubble-process p-4 ${message.loading ? 'active' : ''}`}>
                                {/* Progress Bar inside Glass Box */}
                                {message.dagProgress && message.dagProgress.total > 0 && (
                                    <div className="mb-4">
                                        <ProgressBar
                                            current={message.dagProgress.current}
                                            total={message.dagProgress.total}
                                            percentage={message.dagProgress.percentage}
                                            loading={message.loading}
                                        />
                                    </div>
                                )}

                                {/* Nodes Timeline */}
                                <div className="space-y-0">
                                    {message.nodes.map((node, idx) => (
                                        <NodeTimeline
                                            key={node.nodeId}
                                            node={node}
                                            isLast={idx === message.nodes.length - 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Final Result (Solid Gradient Box) */}
                        {message.content && (
                            <div className="bubble-result p-5 rounded-2xl rounded-tl-sm animate-fadeIn">
                                <div className="message-content text-gray-200">
                                    {renderMarkdown(message.content)}
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {message.error && (
                            <div className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg border border-red-500/20 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                                生成过程中断或发生错误
                            </div>
                        )}
                    </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs text-gray-500 mt-1 px-1 font-mono ${isUser ? 'text-right' : 'text-left'}`}>
                    {dayjs(message.timestamp).format('HH:mm')}
                </div>
            </div>

            {isUser && (
                <Avatar
                    icon={<UserOutlined />}
                    className="bg-gray-700 text-gray-400 flex-shrink-0 mt-1 border-2 border-white/5"
                    size="large"
                />
            )}
        </div>
    );
};

export default MessageBubble;
