import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Card, Layout, Typography, Tooltip, Empty, Collapse, Drawer, Grid } from 'antd';
import {
    UserOutlined, RobotOutlined, MessageOutlined, PlusOutlined, DeleteOutlined,
    StopOutlined, SendOutlined, ArrowLeftOutlined, FunctionOutlined, MenuUnfoldOutlined, MenuFoldOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getNewConversationId, getChatHistory, getAgentDetail, getConversationIds } from '../api/agent';
import '../styles/chat.css'; // Import custom styles
import MessageBubble from '../components/chat/MessageBubble';
import EmptyState from '../components/chat/EmptyState';
import HumanInterventionReview from '../components/chat/HumanInterventionReview';
import DagVisualizationPanel from '../components/chat/DagVisualizationPanel';
import { ChatMessage, NodeExecution, HumanInterventionState, DagNode, DagEdge } from '../components/chat/types';
import { convertFromGraphJsonSchema } from '@/utils/graphConverter';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { useBreakpoint } = Grid;

interface ConversationItem {
    conversationId: string;
    lastMessage?: string;
    timestamp?: number;
}

const AgentChat: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const screens = useBreakpoint();

    // State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState('Agent');
    const [agentDesc, setAgentDesc] = useState('');
    const [conversationId, setConversationId] = useState<string>('');
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [interventionState, setInterventionState] = useState<HumanInterventionState | null>(null);

    // DAG Visualization State
    const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
    const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
    const [errorNodeId, setErrorNodeId] = useState<string | null>(null);
    const [pausedNodeId, setPausedNodeId] = useState<string | null>(null);
    const [isDagPanelVisible, setIsDagPanelVisible] = useState(true);
    // For smaller screens
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

    // Responsive Logic
    useEffect(() => {
        if (screens.xl) {
            setIsDagPanelVisible(true);
        } else {
            setIsDagPanelVisible(false);
        }
    }, [screens.xl]);

    const fetchAgentInfo = async (agentId: string) => {
        try {
            const agent = await getAgentDetail(agentId);
            setAgentName(agent.agentName || 'Agent');
            setAgentDesc(agent.description || '智能助手');

            // Parse DAG structure
            if (agent.graphJson) {
                try {
                    const schema = JSON.parse(agent.graphJson);
                    const { nodes, edges } = convertFromGraphJsonSchema(schema);

                    // Transform to partial DAG Structure
                    const dNodes = nodes.map(node => ({
                        id: node.id,
                        type: 'custom',
                        position: node.position,
                        data: {
                            label: (node.data.label as string) || 'Unknown Node',
                            nodeType: (node.data.nodeType as string) || 'UNKNOWN'
                        }
                    }));

                    const dEdges = edges.map(edge => ({
                        id: edge.id,
                        source: edge.source,
                        target: edge.target,
                        type: 'custom'
                    }));

                    setDagNodes(dNodes);
                    setDagEdges(dEdges);
                } catch (e) {
                    console.error('Failed to parse graphJson', e);
                }
            }
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

    const resetDagState = () => {
        setActiveNodeId(null);
        setCompletedNodeIds([]);
        setErrorNodeId(null);
        setPausedNodeId(null);
    };

    const startNewChat = () => {
        if (loading) return;
        setConversationId('');
        conversationIdRef.current = '';
        setMessages([]);
        setInput('');
        resetDagState();
    };

    const selectConversation = async (cid: string) => {
        if (cid === conversationId) return;
        if (loading) {
            message.warning('请先停止当前对话');
            return;
        }

        setConversationId(cid);
        conversationIdRef.current = cid;
        setMessages([]);
        resetDagState();

        try {
            // 查询历史消息
            const history = await getChatHistory(cid);

            // 辅助函数：解析可能被 JSON 字符串化的 content
            const parseContent = (content: string | null | undefined): string => {
                if (!content) return '';
                if (content.startsWith('"') && content.endsWith('"')) {
                    try {
                        return JSON.parse(content);
                    } catch {
                        return content;
                    }
                }
                return content;
            };

            if (history) {
                const data = Array.isArray(history) ? history : (history as any).data || [];

                const historyMessages: ChatMessage[] = data.map((msg: any) => ({
                    role: msg.role,
                    content: parseContent(msg.content),
                    nodes: (msg.nodes || []).map((node: any) => ({
                        nodeId: node.nodeId,
                        nodeName: node.nodeName,
                        status: node.status as 'pending' | 'running' | 'completed' | 'error',
                        content: parseContent(node.content),
                        startTime: 0,
                        duration: node.duration,
                        result: parseContent(node.result),
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
                throw new Error('加载失败');
            }

        } catch (e: any) {
            console.error('加载历史消息失败', e);
            message.error('加载历史消息失败: ' + (e.message || '未知错误'));
            setMessages([]);
        }
    };


    const processStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
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

                    if (data.type === 'node_lifecycle' && data.status === 'paused') {
                        const checkMessage = data.result?.replace('WAITING_FOR_HUMAN:', '') || '请审核此内容';
                        setInterventionState({
                            isPaused: true,
                            nodeId: data.nodeId,
                            nodeName: data.nodeName,
                            checkMessage: checkMessage,
                            allowModifyOutput: true
                        });
                        setPausedNodeId(data.nodeId);
                        setActiveNodeId(null);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.warn('SSE Parse Error', e);
                }
            }
        }
    };

    const handleSend = async (userInput?: string, isResume: boolean = false) => {
        const messageToSend = isResume ? '' : (userInput || input);

        if (!isResume && !messageToSend.trim()) return;

        if (!isResume) {
            // New interaction, reset partial DAG state for new run
            setActiveNodeId(null);
            setErrorNodeId(null);
            setPausedNodeId(null);
            setCompletedNodeIds([]);

            const newUserMsg: ChatMessage = {
                role: 'user',
                content: messageToSend,
                nodes: [],
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, newUserMsg]);
            setInput('');
        }

        const newAssistantMsg: ChatMessage = {
            role: 'assistant',
            content: '',
            nodes: [],
            timestamp: Date.now(),
            loading: true
        };
        setMessages(prev => [...prev, newAssistantMsg]);
        setLoading(true);

        try {
            const chatConversationId = isResume
                ? conversationIdRef.current
                : (conversationId || await getNewConversationId());

            if (!conversationId) {
                setConversationId(chatConversationId);
                conversationIdRef.current = chatConversationId;
            }

            const token = localStorage.getItem('token');
            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';

            const response = await fetch(`${API_BASE_URL}/client/agent/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    agentId: id,
                    userMessage: messageToSend,
                    conversationId: chatConversationId
                }),
                signal: abortController.signal
            });

            if (!response.ok || !response.body) {
                throw new Error(response.statusText);
            }

            const reader = response.body.getReader();
            await processStream(reader);

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Chat error', error);
                message.error('发送消息失败');
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg) {
                        lastMsg.loading = false;
                        lastMsg.error = true;
                        if (lastMsg.nodes.length === 0) {
                            lastMsg.content = `[请求失败: ${error.message}]`;
                        }
                    }
                    return newMsgs;
                });
                setErrorNodeId(activeNodeId); // Mark active as error
                setActiveNodeId(null);
            }
        } finally {
            if (!interventionState?.isPaused) {
                setLoading(false);
                setActiveNodeId(null);
            }
            abortControllerRef.current = null;
        }
    };

    const handleReviewSubmit = async (data: { approved: boolean }) => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';

            const response = await fetch(`${API_BASE_URL}/client/agent/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    conversationId: conversationIdRef.current,
                    nodeId: interventionState?.nodeId,
                    approved: data.approved
                })
            });

            if (!response.ok || !response.body) {
                throw new Error(response.statusText);
            }

            setInterventionState(null);
            setPausedNodeId(null); // Clear pause state

            const reader = response.body.getReader();
            await processStream(reader);

        } catch (error) {
            console.error('Review execution failed', error);
            message.error('恢复执行失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSSEEvent = (data: any) => {
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

            if (data.conversationId && conversationIdRef.current !== data.conversationId) {
                conversationIdRef.current = data.conversationId;
                setConversationId(data.conversationId);
                setConversations(prev => {
                    if (prev.find(c => c.conversationId === data.conversationId)) return prev;
                    return [{ conversationId: data.conversationId }, ...prev];
                });
            }
            // Reset DAG visualization state for new run
            setCompletedNodeIds([]);
            setActiveNodeId(null);
            setErrorNodeId(null);
            return;
        }

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

            // 聊天结束后重置 DAG 状态
            resetDagState();
            return;
        }

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

            if (data.type === 'node_lifecycle') {
                if (data.status === 'starting') {
                    // Update Message State
                    const existingNode = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (!existingNode) {
                        currentMsg.nodes.push({
                            nodeId: data.nodeId,
                            nodeName: data.nodeName || '未知节点',
                            status: 'running',
                            content: '',
                            startTime: data.timestamp || Date.now(),
                            progress: data.progress
                        });
                    }

                    // Update DAG Vis State
                    setActiveNodeId(data.nodeId);
                    setErrorNodeId(null);
                    setPausedNodeId(null);

                } else if (data.status === 'completed') {
                    let node = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (!node && data.nodeName) {
                        node = currentMsg.nodes.find(n => n.nodeName === data.nodeName && n.status === 'running');
                    }
                    if (node) {
                        node.status = 'completed';
                        node.duration = data.durationMs;
                        node.result = data.result;
                        node.progress = data.progress;
                    }

                    if (data.progress && currentMsg.dagProgress) {
                        currentMsg.dagProgress = {
                            current: data.progress.current,
                            total: data.progress.total,
                            percentage: data.progress.percentage
                        };
                    }

                    // Update DAG Vis State
                    setCompletedNodeIds(prevC => [...new Set([...prevC, data.nodeId])]);
                    if (activeNodeId === data.nodeId) {
                        setActiveNodeId(null);
                    }

                } else if (data.status === 'failed') {
                    let node = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (!node && data.nodeName) {
                        node = currentMsg.nodes.find(n => n.nodeName === data.nodeName && n.status === 'running');
                    }
                    if (node) {
                        node.status = 'error';
                        node.duration = data.durationMs;
                        node.result = data.result;
                    }

                    // Update DAG Vis State
                    setErrorNodeId(data.nodeId);
                    setActiveNodeId(null);
                }
            } else if (data.type === 'node_execute') {
                let node = currentMsg.nodes.find(n => n.nodeName === data.nodeName && n.status === 'running');
                if (!node && data.nodeName) {
                    // Auto-create implied node if missing
                    node = {
                        nodeId: `implied_${Date.now()}`,
                        nodeName: data.nodeName,
                        status: 'running',
                        content: '',
                        startTime: Date.now()
                    };
                    currentMsg.nodes.push(node);
                    // Also try to find it in DAG to highlight
                    const dagNode = dagNodes.find(n => n.data.label === data.nodeName);
                    if (dagNode) setActiveNodeId(dagNode.id);
                }

                if (node) {
                    node.content += (data.content || '');
                }
            } else if (data.type === 'error') {
                currentMsg.error = true;
                currentMsg.loading = false;
                const errorNode = {
                    nodeId: 'error_node',
                    nodeName: '错误',
                    status: 'error' as const,
                    content: `[${data.errorCode || 'ERROR'}] ${data.message}`,
                    startTime: Date.now()
                };
                currentMsg.nodes.push(errorNode);
            } else if (data.type === 'token' || data.type === 'answer') {
                // Final response logic
                let finalNode = currentMsg.nodes.find(n => n.nodeName === '最终回复');
                if (!finalNode) {
                    finalNode = {
                        nodeId: 'final_response',
                        nodeName: '最终回复',
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
                    lastMsg.nodes.forEach(n => {
                        if (n.status === 'running') n.status = 'error';
                    });
                }
                return newMsgs;
            });
            setActiveNodeId(null);
            setErrorNodeId(activeNodeId);
        }
    };


    return (
        <Layout className="h-screen bg-[#0B0F19] overflow-hidden">
            {/* Sidebar - History */}
            <Sider
                width={280}
                className="chat-sidebar hidden md:block"
                style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-slate-100 font-bold text-xl px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                            <RobotOutlined className="text-white text-lg" />
                        </div>
                        <span className="truncate tracking-wide">{agentName}</span>
                    </div>
                    <Button
                        type="primary"
                        block
                        icon={<PlusOutlined />}
                        onClick={startNewChat}
                        className="rounded-xl h-11 bg-white/10 border-none hover:bg-white/20 text-white shadow-none backdrop-blur-sm transition-all"
                    >
                        新对话
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                    <div className="text-xs text-slate-400 mb-3 px-3 uppercase tracking-wider font-semibold">历史记录</div>
                    {conversations.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-gray-500">暂无历史对话</span>} className="mt-10 opacity-50" />
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {conversations.map(c => (
                                <div
                                    key={c.conversationId}
                                    onClick={() => selectConversation(c.conversationId)}
                                    className={`
                                        conversation-item rounded-none cursor-pointer flex items-center gap-3 text-sm mb-1
                                        ${conversationId === c.conversationId ? 'active' : ''}
                                    `}
                                >
                                    <MessageOutlined className={conversationId === c.conversationId ? 'text-indigo-400' : ''} />
                                    <div className="truncate flex-1 font-mono text-xs">{c.conversationId}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-white/5 bg-transparent">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} block type="text" className="text-slate-400 hover:text-white h-10 hover:bg-white/5">
                        返回仪表盘
                    </Button>
                </div>
            </Sider>

            {/* Split Screen Layout */}
            <Layout className="flex-1 h-full relative">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md shrink-0 z-10 sticky top-0 border-b border-slate-800">
                    <div className="font-semibold text-slate-200 flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${conversationId ? 'bg-emerald-500 shadow-glow animate-pulse' : 'bg-slate-600'}`} />
                        <div>
                            <div className="text-sm font-bold text-slate-100">{conversationId ? `SESSION: ${conversationId}` : 'New Session'}</div>
                            <div className="text-xs text-slate-400 font-normal">
                                {loading ? 'Agent is thinking...' : 'Waiting for input'}
                            </div>
                        </div>
                    </div>

                    {/* Right Header Actions */}
                    <div className="flex items-center gap-2">
                        {!screens.xl && (
                            <Button
                                type="text"
                                icon={<FunctionOutlined />}
                                onClick={() => setIsDrawerOpen(true)}
                            >
                                Show Graph
                            </Button>
                        )}
                        {screens.xl && (
                            <Tooltip title={isDagPanelVisible ? "Collapse Graph" : "Expand Graph"}>
                                <Button
                                    type="text"
                                    icon={isDagPanelVisible ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                    onClick={() => setIsDagPanelVisible(!isDagPanelVisible)}
                                />
                            </Tooltip>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Chat Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#111827] transition-all duration-300 relative z-10">
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
                            <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-4">
                                {messages.length === 0 && !loading && (
                                    <EmptyState agentName={agentName} agentDesc={agentDesc} />
                                )}

                                <div className="message-list">
                                    {messages.map((msg, index) => (
                                        <div key={index}>
                                            <MessageBubble message={msg} />
                                            {index === messages.length - 1 && interventionState?.isPaused && (
                                                <div style={{ maxWidth: '80%', marginTop: 8 }}>
                                                    <HumanInterventionReview
                                                        conversationId={conversationId}
                                                        nodeId={interventionState.nodeId!}
                                                        nodeName={interventionState.nodeName!}
                                                        checkMessage={interventionState.checkMessage!}
                                                        onReview={handleReviewSubmit}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {loading && messages.length > 0 && !interventionState?.isPaused && (
                                        <div style={{ marginLeft: 16, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }} className="text-gray-400 text-sm">
                                            <Spin size="small" />
                                            <span>Processing node logic...</span>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-gradient-to-t from-[#111827] via-[#111827] to-transparent shrink-0">
                            <div className="max-w-3xl mx-auto relative chat-input-container">
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
                                    placeholder="输入消息以开始对话..."
                                    className="!pr-24 !py-3 !px-4 !bg-black/20 !border !border-white/10 !text-slate-200 !text-base resize-none !shadow-sm focus:!shadow-md focus:!border-indigo-500/50 transition-all rounded-2xl placeholder:!text-slate-500"
                                />
                                <div className="absolute bottom-2.5 right-2.5 flex gap-2">
                                    {loading && !interventionState?.isPaused ? (
                                        <Tooltip title="停止生成">
                                            <Button
                                                type="default"
                                                shape="circle"
                                                size="large"
                                                icon={<StopOutlined />}
                                                onClick={handleStop}
                                                className="border-red-100 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            />
                                        </Tooltip>
                                    ) : (
                                        <Button
                                            type="primary"
                                            shape="circle"
                                            size="large"
                                            icon={<SendOutlined />}
                                            onClick={() => handleSend()}
                                            disabled={!input.trim() || (loading && !interventionState?.isPaused)}
                                            className={`gradient-btn shadow-lg shadow-blue-500/30 border-none ${(!input.trim() || (loading && !interventionState?.isPaused)) && 'opacity-50 grayscale'}`}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="text-center mt-3 text-xs text-gray-400">
                                AI agent execution may produce unpredictable results. Review important outputs.
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: DAG Visualization (Desktop) */}
                    {isDagPanelVisible && (
                        <div
                            className="width-[40%] min-w-[400px] border-l border-gray-200 bg-slate-900 transition-all duration-300 ease-in-out relative flex flex-col"
                            style={{ flexBasis: '40%' }}
                        >
                            <div className="h-full w-full">
                                {dagNodes.length > 0 ? (
                                    <DagVisualizationPanel
                                        nodes={dagNodes}
                                        edges={dagEdges}
                                        activeNodeId={activeNodeId}
                                        completedNodeIds={completedNodeIds}
                                        errorNodeId={errorNodeId}
                                        pausedNodeId={pausedNodeId}
                                        className="h-full w-full"
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                        <FunctionOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                                        <span>No Execution Graph Available</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Layout>

            {/* Mobile Drawer for DAG */}
            <Drawer
                title="Execution Graph"
                placement="right"
                onClose={() => setIsDrawerOpen(false)}
                open={isDrawerOpen}
                width="85%"
                styles={{ body: { padding: 0, overflow: 'hidden' } }}
            >
                <div className="h-full bg-slate-900">
                    <DagVisualizationPanel
                        nodes={dagNodes}
                        edges={dagEdges}
                        activeNodeId={activeNodeId}
                        completedNodeIds={completedNodeIds}
                        errorNodeId={errorNodeId}
                        pausedNodeId={pausedNodeId}
                        className="h-full w-full"
                    />
                </div>
            </Drawer>
        </Layout>
    );
};

export default AgentChat;
