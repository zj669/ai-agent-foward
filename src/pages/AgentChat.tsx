import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Card, Layout, Typography, Tooltip, Empty, Collapse, theme } from 'antd';
import {
    SendOutlined,
    UserOutlined,
    RobotOutlined,
    ArrowLeftOutlined,
    PlusOutlined,
    MessageOutlined,
    StopOutlined,
    CopyOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    SyncOutlined,
    CaretRightOutlined,
    ClockCircleOutlined,
    BulbOutlined,
    ToolOutlined,
    PlayCircleOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAgentDetail, getConversationIds, getNewConversationId } from '@/api/agent';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { Panel } = Collapse;

// --- Data Models ---

interface NodeExecution {
    nodeId: string;
    nodeName: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    content: string; // Accumulated content for this node
    startTime: number;
    duration?: number;
    result?: string; // Optional result summary
    progress?: {     // 新增
        current: number;
        total: number;
        percentage: number;
    };
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content?: string; // Legacy/Fallback flat content
    nodes: NodeExecution[]; // Structured execution steps
    timestamp: number;
    loading?: boolean;
    error?: boolean;
    dagProgress?: {   // 新增
        current: number;
        total: number;
        percentage: number;
    };
}

interface ConversationItem {
    conversationId: string;
    lastMessage?: string;
    timestamp?: number;
}

// --- Icons & Styles ---

const getNodeIcon = (nodeName: string) => {
    if (nodeName.includes('计划')) return <BulbOutlined />;
    if (nodeName.includes('执行')) return <PlayCircleOutlined />;
    if (nodeName.includes('工具')) return <ToolOutlined />;
    return <CaretRightOutlined />;
};

const AgentChat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState('Agent');
    const [agentDesc, setAgentDesc] = useState('');
    const [conversationId, setConversationId] = useState<string>('');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationIdRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load Data
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

    // Auto-scroll (Smart Lock)
    useLayoutEffect(() => {
        // Only scroll if we are near bottom or if it's a new message
        // For simplicity, just scroll to bottom on new chunks for now, but user can scroll up
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, activeNodeId]);

    // Cleanup
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
    };

    const selectConversation = async (cid: string) => {
        if (cid === conversationId) return;
        if (loading) {
            message.warning('请先停止当前对话');
            return;
        }

        setConversationId(cid);
        conversationIdRef.current = cid;

        // 显示加载状态
        setMessages([]);

        try {
            // 查询历史消息
            const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
            const response = await fetch(`${API_BASE_URL}/client/agent/chat/history/${cid}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
            });

            if (!response.ok) {
                throw new Error('加载历史消息失败');
            }

            const result = await response.json();

            if (result.code === 200 && result.data) {
                const history = result.data;

                // 转换为前端消息格式
                const historyMessages: ChatMessage[] = history.map((msg: any) => ({
                    role: msg.role,
                    content: msg.content,
                    nodes: (msg.nodes || []).map((node: any) => ({
                        nodeId: node.nodeId,
                        nodeName: node.nodeName,
                        status: node.status as 'pending' | 'running' | 'completed' | 'error',
                        content: node.content || '',
                        startTime: 0, // History messages don't need precise startTime for display
                        duration: node.duration,
                        result: node.result,
                        progress: node.progress
                    })),
                    timestamp: msg.timestamp,
                    error: msg.error,
                    loading: false,
                    dagProgress: msg.dagProgress
                }));

                setMessages(historyMessages);

                if (historyMessages.length > 0) {
                    message.success(`已加载 ${historyMessages.length} 条历史消息`);
                } else {
                    message.info('该会话暂无历史消息');
                }
            } else {
                throw new Error(result.message || '加载失败');
            }

        } catch (e: any) {
            console.error('加载历史消息失败', e);
            message.error('加载历史消息失败: ' + (e.message || '未知错误'));

            // 降级显示提示
            setMessages([
                {
                    role: 'assistant',
                    nodes: [],
                    content: `会话 ${cid} 历史消息加载失败\n\n请稍后重试或开始新对话`,
                    timestamp: Date.now()
                }
            ]);
        }
    };


    const handleSend = async () => {
        if (loading) return;
        if (!input.trim() || !id) return;

        const userMessage = input;
        setInput('');

        // Add User Message
        setMessages(prev => [...prev, { role: 'user', content: userMessage, nodes: [], timestamp: Date.now() }]);
        setLoading(true);

        // Add Assistant Placeholder
        setMessages(prev => [...prev, { role: 'assistant', nodes: [], timestamp: Date.now(), loading: true }]);

        try {
            // Ensure we have a conversation ID
            if (!conversationIdRef.current) {
                try {
                    const newCid = await getNewConversationId();
                    setConversationId(newCid);
                    conversationIdRef.current = newCid;
                } catch (e) {
                    console.error('Failed to generate conversation ID', e);
                    // allow fallback to undefined, let backend handle it or fail
                }
            }

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

            if (!response.ok) throw new Error(response.statusText);
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
                    if (!line.trim().startsWith('data:')) continue;
                    const dataStr = line.replace('data:', '').trim();
                    if (dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);
                        handleSSEEvent(data);
                    } catch (e) {
                        console.warn('SSE Parse Error', e);
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
                    if (lastMsg) {
                        lastMsg.loading = false;
                        lastMsg.error = true;
                        // Fallback error display
                        if (lastMsg.nodes.length === 0) {
                            lastMsg.content = `[请求失败: ${error.message}]`;
                        }
                    }
                    return newMsgs;
                });
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
            setActiveNodeId(null);
        }
    };

    const handleSSEEvent = (data: any) => {
        // 1. DAG Start Event (\u65b0\u589e)
        if (data.type === 'dag_start') {
            setMessages(prev => {
                const newMsgs = [...prev];
                const currentMsg = newMsgs[newMsgs.length - 1];
                if (currentMsg && currentMsg.role === 'assistant') {
                    currentMsg.dagProgress = {
                        current: 0,
                        total: data.totalNodes || 0,
                        percentage: 0
                    };
                }
                return newMsgs;
            });

            // Update conversationId
            if (data.conversationId && conversationIdRef.current !== data.conversationId) {
                conversationIdRef.current = data.conversationId;
                setConversationId(data.conversationId);
                setConversations(prev => {
                    if (prev.find(c => c.conversationId === data.conversationId)) return prev;
                    return [{ conversationId: data.conversationId }, ...prev];
                });
            }
            return;
        }

        // 2. DAG Complete Event (\u65b0\u589e)
        if (data.type === 'dag_complete') {
            setMessages(prev => {
                const newMsgs = [...prev];
                const currentMsg = newMsgs[newMsgs.length - 1];
                if (currentMsg && currentMsg.role === 'assistant') {
                    currentMsg.loading = false;
                    if (data.status === 'failed') {
                        currentMsg.error = true;
                    }
                }
                return newMsgs;
            });
            return;
        }

        // 3. Update conversationId (\u4fee\u6539\u5b57\u6bb5\u540d)
        if (data.conversationId && conversationIdRef.current !== data.conversationId) {
            conversationIdRef.current = data.conversationId;
            setConversationId(data.conversationId);
            setConversations(prev => {
                if (prev.find(c => c.conversationId === data.conversationId)) return prev;
                return [{ conversationId: data.conversationId }, ...prev];
            });
        }

        setMessages(prev => {
            const newMsgs = [...prev];
            const currentMsg = newMsgs[newMsgs.length - 1];
            if (!currentMsg || currentMsg.role !== 'assistant') return prev;

            // 4. Node Lifecycle (\u6dfb\u52a0\u8fdb\u5ea6\u5904\u7406)
            if (data.type === 'node_lifecycle') {
                if (data.status === 'starting') {
                    const existingNode = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (!existingNode) {
                        currentMsg.nodes.push({
                            nodeId: data.nodeId,
                            nodeName: data.nodeName || '\u672a\u77e5\u8282\u70b9',
                            status: 'running',
                            content: '',
                            startTime: data.timestamp || Date.now(),
                            progress: data.progress  // \u65b0\u589e
                        });
                        setActiveNodeId(data.nodeId);
                    }
                } else if (data.status === 'completed') {
                    const node = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (node) {
                        node.status = 'completed';
                        node.duration = data.durationMs;
                        node.result = data.result;
                        node.progress = data.progress;  // \u65b0\u589e
                    }

                    // \u66f4\u65b0 DAG \u8fdb\u5ea6
                    if (data.progress && currentMsg.dagProgress) {
                        currentMsg.dagProgress = {
                            current: data.progress.current,
                            total: data.progress.total,
                            percentage: data.progress.percentage
                        };
                    }
                } else if (data.status === 'failed') {
                    const node = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (node) {
                        node.status = 'error';
                        node.duration = data.durationMs;
                        node.result = data.result;
                    }
                }
            }

            // 5. Node Execute (\u5b57\u6bb5\u540d\u4fdd\u6301\u4e0d\u53d8,\u56e0\u4e3a\u540e\u7aef\u5df2\u6539\u4e3a conversationId)
            else if (data.type === 'node_execute') {
                let node = currentMsg.nodes.find(n => n.nodeName === data.nodeName && n.status === 'running');

                if (!node && data.nodeName) {
                    node = {
                        nodeId: `implied_${Date.now()}`,
                        nodeName: data.nodeName,
                        status: 'running',
                        content: '',
                        startTime: Date.now()
                    };
                    currentMsg.nodes.push(node);
                }

                if (node) {
                    node.content += (data.content || '');
                }
            }

            // 6. Error Event (\u65b0\u589e\u6807\u51c6\u5316\u5904\u7406)
            else if (data.type === 'error') {
                currentMsg.error = true;
                currentMsg.loading = false;

                // \u521b\u5efa\u9519\u8bef\u8282\u70b9
                const errorNode = {
                    nodeId: 'error_node',
                    nodeName: '\u9519\u8bef',
                    status: 'error' as const,
                    content: `[${data.errorCode || 'ERROR'}] ${data.message}`,
                    startTime: Date.now()
                };
                currentMsg.nodes.push(errorNode);
            }

            // 7. Legacy formats (\u4fdd\u6301\u4e0d\u53d8)
            else if (data.type === 'token' || data.type === 'answer') {
                let finalNode = currentMsg.nodes.find(n => n.nodeName === '\u6700\u7ec8\u56de\u590d');
                if (!finalNode) {
                    finalNode = {
                        nodeId: 'final_response',
                        nodeName: '\u6700\u7ec8\u56de\u590d',
                        status: 'running',
                        content: '',
                        startTime: Date.now()
                    };
                    currentMsg.nodes.push(finalNode);
                }
                finalNode.content += (data.content || '');
            }

            return newMsgs;
        });
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLoading(false);
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.loading) {
                    lastMsg.loading = false;
                    // Mark running nodes as stops
                    lastMsg.nodes.forEach(n => {
                        if (n.status === 'running') n.status = 'error'; // or cancelled
                    });
                }
                return newMsgs;
            });
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => message.success('复制成功'));
    };

    // --- Components for Glass Box UI ---

    const renderMarkdown = (content: string) => (
        <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:text-xs">
            <ReactMarkdown
                components={{
                    code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <div className="relative group/code">
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
                {content}
            </ReactMarkdown>
        </div>
    );

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
                                    <div className="truncate flex-1">{c.conversationId}</div>
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

            {/* Main Chat */}
            <Layout className="bg-white flex flex-col h-full relative">
                {/* Header */}
                <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 z-10 shadow-sm">
                    <div className="font-medium text-gray-700">
                        {conversationId ? `会话: ${conversationId}` : '新对话'}
                    </div>
                </div>

                {/* Message List */}
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
                                    <Avatar icon={<RobotOutlined />} className="bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 mt-1 shadow-md" size="large" />
                                )}

                                <div className={`flex flex-col max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>

                                    {/* User Message Bubble */}
                                    {msg.role === 'user' && (
                                        <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-sm shadow-md text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                    )}

                                    {/* Assistant Complex Glass Box */}
                                    {msg.role === 'assistant' && (
                                        <div className="flex flex-col gap-2 w-full">

                                            {/* DAG Progress Indicator */}
                                            {msg.dagProgress && msg.dagProgress.total > 0 && (
                                                <div className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-gray-700">
                                                            执行进度
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {msg.dagProgress.current}/{msg.dagProgress.total} 节点
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                                                            style={{ width: `${msg.dagProgress.percentage}%` }}
                                                        />
                                                    </div>
                                                    {msg.dagProgress.percentage === 100 && !msg.loading && (
                                                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                                                            <CheckCircleOutlined />
                                                            <span>执行完成</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 1. Legacy/Fallback Content */}
                                            {msg.content && !msg.nodes.length && (
                                                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm text-gray-800">
                                                    {renderMarkdown(msg.content)}
                                                </div>
                                            )}

                                            {/* 2. Structured Nodes (Glass Box) */}
                                            {msg.nodes.map((node) => {
                                                const isFinalNode = node.nodeName.includes('精准执行') || node.nodeName === '最终回复';

                                                // --- Process Nodes (Accordion Style) ---
                                                if (!isFinalNode) {
                                                    return (
                                                        <div key={node.nodeId} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-1">
                                                            <Collapse
                                                                ghost
                                                                size="small"
                                                                defaultActiveKey={node.status === 'running' ? ['1'] : []}
                                                                expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} className="text-gray-400" />}
                                                            >
                                                                <Panel
                                                                    key="1"
                                                                    header={
                                                                        <div className="flex items-center gap-2 w-full">
                                                                            <span className={`text-lg ${node.status === 'running' ? 'text-blue-500 animate-pulse' : 'text-gray-500'}`}>
                                                                                {getNodeIcon(node.nodeName)}
                                                                            </span>
                                                                            <span className="font-medium text-gray-700 text-sm">{node.nodeName}</span>

                                                                            <div className="flex-1" />

                                                                            {node.status === 'running' && (
                                                                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                                                                    <SyncOutlined spin /> 执行中...
                                                                                </span>
                                                                            )}
                                                                            {node.status === 'completed' && (
                                                                                <span className="flex items-center gap-1 text-xs text-green-500">
                                                                                    <CheckCircleOutlined />
                                                                                    {node.duration ? ` ${(node.duration / 1000).toFixed(1)}s` : '已完成'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    }
                                                                >
                                                                    <div className="pl-7 pb-2 text-xs text-gray-600 font-mono bg-gray-50 rounded p-2 mx-2 mb-2 border border-gray-100">
                                                                        {node.content ? renderMarkdown(node.content) :
                                                                            <span className="text-gray-400 italic">等待输出...</span>
                                                                        }
                                                                    </div>
                                                                </Panel>
                                                            </Collapse>
                                                        </div>
                                                    );
                                                }

                                                // --- Final Response Node (Hero Bubble) ---
                                                return (
                                                    <div key={node.nodeId} className="bg-white border-2 border-blue-50 p-5 rounded-2xl rounded-tl-sm shadow-sm mt-2">
                                                        {renderMarkdown(node.content)}
                                                        {node.status === 'running' && <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />}
                                                    </div>
                                                );
                                            })}

                                            {/* Failure Message */}
                                            {msg.error && (
                                                <div className="text-red-400 text-xs mt-1 bg-red-50 p-2 rounded">
                                                    生成过程中断或发生错误
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="text-xs text-gray-400 mt-1 px-1">{dayjs(msg.timestamp).format('HH:mm')}</div>
                                </div>

                                {msg.role === 'user' && (
                                    <Avatar icon={<UserOutlined />} className="bg-gray-300 flex-shrink-0 mt-1" size="large" />
                                )}
                            </div>
                        ))}

                        {/* Loading Indicator for very start before any node */}
                        {loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].nodes.length === 0 && (
                            <div className="flex gap-4">
                                <Avatar icon={<RobotOutlined />} className="bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0 mt-1" size="large" />
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center">
                                    <Spin size="small" />
                                    <span className="ml-2 text-gray-400 text-sm">正在初始化执行计划...</span>
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
                            placeholder="输入消息..."
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
                        AI内容仅供参考
                    </div>
                </div>
            </Layout>
        </Layout>
    );
};

export default AgentChat;
