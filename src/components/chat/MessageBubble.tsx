import React from 'react';
import { Avatar, Tooltip, Button, message as antdMessage } from 'antd';
import { UserOutlined, RobotOutlined, CopyOutlined, CheckCircleOutlined } from '@ant-design/icons';
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
                                className="rounded-md !bg-[#1a1b26] !my-0 text-sm border border-gray-700"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        </div>
                    ) : (
                        <code className={`${className} bg-gray-100 text-pink-500 rounded px-1.5 py-0.5 text-xs font-mono border border-gray-200`} {...props}>
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
        <div className={`flex gap-4 message-bubble ${isUser ? 'justify-end message-bubble-user-container' : 'justify-start message-bubble-ai-container'}`}>
            {isAssistant && (
                <Avatar
                    icon={<RobotOutlined />}
                    className="bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 mt-1 shadow-lg border-2 border-white"
                    size="large"
                />
            )}

            <div className={`flex flex-col max-w-[90%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>

                {/* User Message */}
                {isUser && (
                    <div className="message-bubble-user p-4 rounded-2xl rounded-tr-sm text-sm leading-relaxed whitespace-pre-wrap shadow-lg">
                        {message.content}
                    </div>
                )}

                {/* Assistant Message */}
                {isAssistant && (
                    <div className="flex flex-col gap-3 w-full">
                        {/* Progress Bar */}
                        {message.dagProgress && message.dagProgress.total > 0 && (
                            <ProgressBar
                                current={message.dagProgress.current}
                                total={message.dagProgress.total}
                                percentage={message.dagProgress.percentage}
                                loading={message.loading}
                            />
                        )}

                        {/* Glass Box Container */}
                        <div className="message-bubble-ai rounded-2xl rounded-tl-sm p-1 overflow-hidden">
                            {/* Inner Content Padding */}
                            <div className="p-4 flex flex-col gap-2">
                                {/* Nodes Timeline */}
                                <div className="space-y-0">
                                    {message.nodes.map((node, idx) => {
                                        const isFinalNode = node.nodeName.includes('精准执行') || node.nodeName === '最终回复';

                                        if (isFinalNode) {
                                            return (
                                                <div key={node.nodeId} className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                                                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:text-gray-700 prose-strong:text-gray-700 text-gray-800">
                                                        {renderMarkdown(node.content)}
                                                        {node.status === 'running' && (
                                                            <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 animate-pulse align-middle" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <NodeTimeline
                                                key={node.nodeId}
                                                node={node}
                                                isLast={idx === message.nodes.length - 1}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Fallback Content */}
                                {message.content && !message.nodes.length && (
                                    <div className="prose prose-sm max-w-none text-gray-800">
                                        {renderMarkdown(message.content)}
                                    </div>
                                )}

                                {/* Error State */}
                                {message.error && (
                                    <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg border border-red-100 flex items-center gap-2 mt-2">
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                                        生成过程中断或发生错误
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs text-gray-400 mt-1.5 px-1 font-medium ${isUser ? 'text-right' : 'text-left'}`}>
                    {dayjs(message.timestamp).format('HH:mm')}
                </div>
            </div>

            {isUser && (
                <Avatar
                    icon={<UserOutlined />}
                    className="bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 flex-shrink-0 mt-1 shadow-md border-2 border-white"
                    size="large"
                />
            )}
        </div>
    );
};

export default MessageBubble;
