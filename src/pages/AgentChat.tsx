import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Card, Layout, Typography, Tooltip, Empty } from 'antd';
import {
    SendOutlined,
    UserOutlined,
    RobotOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    MessageOutlined,
    StopOutlined,
    CopyOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAgentDetail, getConversationIds } from '@/api/agent';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    loading?: boolean;
    error?: boolean;
}

interface ConversationItem {
    conversationId: string;
    lastMessage?: string; // Optional: Backend currently only returns IDs
    timestamp?: number;
}

const AgentChat: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // Agent ID from URL
    const navigate = useNavigate();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState('Agent');
    const [agentDesc, setAgentDesc] = useState('');
    const [conversationId, setConversationId] = useState<string>('');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [siderVisible, setSiderVisible] = useState(true);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationIdRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Load Agent Details & History Logic
    useEffect(() => {
        if (id) {
            fetchAgentInfo(id);
            loadConversationHistory(id);
        }
    }, [id]);

    const fetchAgentInfo = async (agentId: string) => {
        try {
            const agent = await getAgentDetail(agentId);
            setAgentName(agent.agentName || 'Agent');
            setAgentDesc(agent.description || '智能助手');
        } catch (e) {
            console.error('Failed to load agent info', e);
            message.error('加载Agent信息失败');
        }
    };

    const loadConversationHistory = async (agentId: string) => {
        try {
            const list = await getConversationIds(agentId);
            setConversations(list.map(item => ({ conversationId: item.conversationId })));
        } catch (e) {
            console.error('Failed to load history', e);
        }
    };

    // Auto-scroll logic
    useLayoutEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const startNewChat = () => {
        if (loading) return;
        setConversationId('');
        conversationIdRef.current = '';
        setMessages([]);
        setInput('');
        // Optional: Focus input
    };

    const selectConversation = (cid: string) => {
        if (cid === conversationId) return;
        if (loading) {
            message.warning('请先停止当前对话');
            return;
        }
        setConversationId(cid);
        conversationIdRef.current = cid;
        // NOTE: Backend does not currently support fetching message history content.
        // We start with a blank slate but with the correct conversation ID context.
        setMessages([
            {
                role: 'assistant',
                content: `已加载历史会话: **${cid}**\n\n*(注意：当前版本暂不支持查看历史消息记录，但Agent已加载之前的上下文记忆)*`,
                timestamp: Date.now()
            }
        ]);
    };

    const handleSend = async () => {
        if (loading) return;
        if (!input.trim() || !id) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
        setLoading(true);

        // Add assistant placeholder
        const placeholderTimestamp = Date.now();
        setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: placeholderTimestamp, loading: true }]);

        try {
            abortControllerRef.current = new AbortController();

            const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
            const response = await fetch(`${API_BASE_URL}/client/agent/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    agentId: id,
                    userMessage: userMessage,
                    conversationId: conversationIdRef.current || undefined
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || response.statusText);
            }

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data:')) {
                        const dataStr = line.slice(5).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            // Handle "answer", "token" or plain text content
                            if (data.type === 'token' || data.type === 'answer' || !data.type) {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    if (lastMsg.role === 'assistant') {
                                        lastMsg.loading = false;
                                        // Some backends send "content", others send just the string in data?
                                        // Assuming { content: "..." } structure from analysis
                                        const newContent = data.content || '';
                                        lastMsg.content += newContent;
                                    }
                                    return newMsgs;
                                });
                            }

                            if (data.conversationId) {
                                if (conversationIdRef.current !== data.conversationId) {
                                    conversationIdRef.current = data.conversationId;
                                    setConversationId(data.conversationId);
                                    // Refresh conversation list if it's a new one
                                    if (!conversations.find(c => c.conversationId === data.conversationId)) {
                                        setConversations(prev => [{ conversationId: data.conversationId }, ...prev]);
                                    }
                                }
                            }

                        } catch (ev) {
                            console.warn('SSE Parse Error', ev);
                        }
                    } else if (line.startsWith('error:')) {
                        const errMsg = line.slice(6).trim();
                        throw new Error(errMsg);
                    }
                }
            }

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error(error);
                message.error('发送消息失败');
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg.role === 'assistant') {
                        lastMsg.loading = false;
                        lastMsg.error = true;
                        lastMsg.content += '\n\n**[请求失败: ' + (error.message || '未知错误') + ']**';
                    }
                    return newMsgs;
                });
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLoading(false);
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg.role === 'assistant' && lastMsg.loading) {
                    lastMsg.loading = false;
                    lastMsg.content += ' **[已停止]**';
                }
                return newMsgs;
            });
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            message.success('复制成功');
        });
    };

    return (
        <Layout className="h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <Sider
                width={260}
                theme="light"
                className="border-r border-gray-200 hidden md:block"
                style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div className="p-4 border-b border-gray-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-blue-600 font-bold text-lg px-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <RobotOutlined />
                        </div>
                        <span className="truncate">{agentName}</span>
                    </div>
                    <Button type="primary" block icon={<PlusOutlined />} onClick={startNewChat} className="rounded-lg h-10">
                        新对话
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    <div className="text-xs text-gray-400 mb-2 px-2">历史记录</div>
                    {conversations.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史对话" className="mt-10" />
                    ) : (
                        <div className="flex flex-col gap-1">
                            {conversations.map(c => (
                                <div
                                    key={c.conversationId}
                                    onClick={() => selectConversation(c.conversationId)}
                                    className={`
                                        p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 text-sm
                                        ${conversationId === c.conversationId ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'hover:bg-gray-100 text-gray-700 border border-transparent'}
                                    `}
                                >
                                    <MessageOutlined />
                                    <div className="truncate flex-1">
                                        {c.conversationId}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} block className="text-gray-500">
                        返回仪表盘
                    </Button>
                </div>
            </Sider>

            {/* Main Chat Area */}
            <Layout className="bg-white flex flex-col h-full relative">
                {/* Mobile Header (only visible on small screens usually, but here we can keep a simple header) */}
                <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10">
                    <div className="font-medium text-gray-700">
                        {conversationId ? `会话: ${conversationId}` : '新对话'}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Add extra tools here if needed */}
                    </div>
                </div>

                {/* Messages List */}
                <Content className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30 scroll-smooth">
                    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-4">
                        {messages.length === 0 && (
                            <div className="mt-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
                                    <RobotOutlined />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-gray-700 text-lg mb-1">你好，我是 {agentName}</h3>
                                    <p className="max-w-md">{agentDesc || '我已准备好协助你，请发送消息开始对话。'}</p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <Avatar icon={<RobotOutlined />} className="bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 mt-1" size="large" />
                                )}

                                <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`
                                        relative group p-4 rounded-2xl shadow-sm text-sm leading-relaxed
                                        ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-white border border-gray-100 rounded-tl-sm text-gray-800'}
                                    `}>
                                        {msg.role === 'user' ? (
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        ) : (
                                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-xs">
                                                <ReactMarkdown
                                                    components={{
                                                        code: ({ node, inline, className, children, ...props }: any) => {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            return !inline && match ? (
                                                                <div className="relative">
                                                                    <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                                        className="rounded-md !bg-[#1e1e1e] !my-0"
                                                                        {...props}
                                                                    >
                                                                        {String(children).replace(/\n$/, '')}
                                                                    </SyntaxHighlighter>
                                                                </div>
                                                            ) : (
                                                                <code className={`${className} bg-gray-100 text-red-500 rounded px-1 py-0.5`} {...props}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Error Retry Not Implemented - Just Visual */}
                                        {msg.error && <div className="text-red-300 text-xs mt-2">发生错误</div>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 px-1">
                                        {dayjs(msg.timestamp).format('HH:mm')}
                                    </div>
                                </div>

                                {
                                    msg.role === 'user' && (
                                        <Avatar icon={<UserOutlined />} className="bg-gray-300 flex-shrink-0 mt-1" size="large" />
                                    )
                                }
                            </div>
                        ))}
                        {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                            <div className="flex gap-4">
                                <Avatar icon={<RobotOutlined />} className="bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 mt-1" size="large" />
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center">
                                    <Spin size="small" />
                                    <span className="ml-2 text-gray-400 text-sm">正在思考...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </Content>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white border-t border-gray-100 shrink-0">
                    <div className="max-w-4xl mx-auto relative">
                        <Input.TextArea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onPressEnter={(e) => {
                                if (!e.shiftKey && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            autoSize={{ minRows: 1, maxRows: 6 }}
                            placeholder="输入消息与智能体对话 (Shift + Enter 换行)..."
                            className="!pr-24 !py-3 !px-4 !rounded-xl !bg-gray-50 hover:!bg-white focus:!bg-white !text-base resize-none"
                            style={{ boxShadow: 'none', border: '1px solid #e5e7eb' }}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            {loading ? (
                                <Tooltip title="停止生成">
                                    <Button
                                        type="default"
                                        shape="circle"
                                        icon={<StopOutlined />}
                                        onClick={handleStop}
                                        className="border-gray-300 text-gray-500 hover:text-red-500 hover:border-red-500"
                                    />
                                </Tooltip>
                            ) : (
                                <Button
                                    type="primary"
                                    shape="circle"
                                    icon={<SendOutlined />}
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className={`${input.trim() ? 'bg-blue-600' : 'bg-gray-300'} border-none`}
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-center text-gray-400 text-xs mt-3">
                        AI内容仅供参考，请仔细甄别
                    </div>
                </div>
            </Layout>
        </Layout >
    );
};

export default AgentChat;
