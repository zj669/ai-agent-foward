import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Tooltip, Empty, Collapse, Drawer, Grid, Dropdown, Badge } from 'antd';
import {
    UserOutlined, RobotOutlined, PlusOutlined, DeleteOutlined,
    StopOutlined, SendOutlined, ArrowLeftOutlined, FunctionOutlined,
    MenuOutlined, MoreOutlined, HistoryOutlined, ThunderboltOutlined,
    SettingOutlined, LogoutOutlined, DownOutlined, ShareAltOutlined,
    MessageOutlined
} from '@ant-design/icons';
import { getNewConversationId, getChatHistory, getAgentDetail, getConversationIds, getContextSnapshot, getAgentList } from '../api/agent';
import { AiAgent } from '@/types';
import '../styles/chat.css';
import MessageBubble from '../components/chat/MessageBubble';
import HumanInterventionReview from '../components/chat/HumanInterventionReview';
import DagVisualizationPanel from '../components/chat/DagVisualizationPanel';
import { ChatMessage, HumanInterventionState, DagNode, DagEdge } from '../components/chat/types';
import { convertFromGraphJsonSchema } from '@/utils/graphConverter';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

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
    const [agentList, setAgentList] = useState<AiAgent[]>([]);

    // DAG Visualization State
    const [dagNodes, setDagNodes] = useState<DagNode[]>([]);
    const [dagEdges, setDagEdges] = useState<DagEdge[]>([]);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
    const [errorNodeId, setErrorNodeId] = useState<string | null>(null);
    const [pausedNodeId, setPausedNodeId] = useState<string | null>(null);
    const [isDagPanelVisible, setIsDagPanelVisible] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationIdRef = useRef<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Load Data
    useEffect(() => {
        if (!id || id === 'undefined') {
            message.error('无效的 Agent ID');
            navigate('/dashboard');
            return;
        }

        fetchAgentList();
        fetchAgentInfo(id);
        loadConversationHistory(id);
    }, [id, navigate]);

    // Responsive Logic
    useEffect(() => {
        if (!screens.xl) {
            setIsDagPanelVisible(false);
            setIsSidebarOpen(false);
        } else {
            setIsDagPanelVisible(true);
            setIsSidebarOpen(true);
        }
    }, [screens.xl]);

    const fetchAgentList = async () => {
        try {
            const list = await getAgentList();
            setAgentList(list);
        } catch (error) {
            console.error('Failed to fetch agent list', error);
        }
    };

    const fetchAgentInfo = async (agentId: string) => {
        try {
            const agent = await getAgentDetail(agentId);
            setAgentName(agent.agentName || 'Agent');
            setAgentDesc(agent.description || '智能助手');

            if (agent.graphJson) {
                try {
                    const schema = JSON.parse(agent.graphJson);
                    const { nodes, edges } = convertFromGraphJsonSchema(schema);

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
            const res = await getConversationIds(agentId);
            const list = Array.isArray(res) ? res : (res as any).data || [];
            setConversations(list.map((item: string) => ({ conversationId: item })));

            if (list.length > 0 && !conversationId) {
                const firstConversationId = list[0];
                selectConversation(firstConversationId, true);
            }
        } catch (e) {
            console.error('Failed to load history', e);
        }
    };

    useLayoutEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, activeNodeId]);

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
        setInterventionState(null);
    };

    const startNewChat = async () => {
        if (loading) return;
        setConversationId('');
        conversationIdRef.current = '';
        setMessages([]);
        setInput('');
        resetDagState();

        try {
            const newId = await getNewConversationId();
            setConversationId(newId);
            conversationIdRef.current = newId;
            setConversations(prev => [{ conversationId: newId }, ...prev]);
        } catch (error) {
            message.error("创建新会话失败");
        }
    };

    const selectConversation = async (cid: string, force = false) => {
        if (!force && cid === conversationId) return;
        if (loading && !force) {
            message.warning('请先停止当前对话');
            return;
        }

        setConversationId(cid);
        conversationIdRef.current = cid;
        setMessages([]);
        resetDagState();

        try {
            const history = await getChatHistory(id!, cid);
            const parseContent = (content: string | null | undefined): string => {
                if (!content) return '';
                if (content.startsWith('"') && content.endsWith('"')) {
                    try { return JSON.parse(content); } catch { return content; }
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
                        status: node.status,
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
            }

            // Restore intervention state
            try {
                const { getContextSnapshot } = await import('@/api/agent');
                const snapshot = await getContextSnapshot(id!, cid);
                if (snapshot && snapshot.status === 'PAUSED' && snapshot.humanIntervention) {
                    setInterventionState({
                        isPaused: true,
                        conversationId: cid,
                        nodeId: snapshot.humanIntervention.nodeId,
                        nodeName: snapshot.humanIntervention.nodeName,
                        checkMessage: snapshot.humanIntervention.checkMessage,
                        allowModifyOutput: snapshot.humanIntervention.allowModifyOutput
                    });
                    setPausedNodeId(snapshot.humanIntervention.nodeId);
                }
            } catch (e) {
                // Ignore snapshot errors
            }
        } catch (e: any) {
            message.error('加载历史消息失败');
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
                            conversationId: conversationIdRef.current,
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
                } catch (e) { console.warn('SSE Parse Error', e); }
            }
        }
    };

    const handleSend = async (userInput?: string, isResume: boolean = false) => {
        const messageToSend = isResume ? '' : (userInput || input);
        if (!isResume && !messageToSend.trim()) return;

        if (!isResume) {
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
                setConversations(prev => {
                    if (prev.find(c => c.conversationId === chatConversationId)) return prev;
                    return [{ conversationId: chatConversationId }, ...prev];
                });
            }

            const token = localStorage.getItem('token');
            const abortController = new AbortController();
            abortControllerRef.current = abortController;
            const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';

            const response = await fetch(`${API_BASE_URL}/client/chat`, {
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

            if (!response.ok || !response.body) throw new Error(response.statusText);
            await processStream(response.body.getReader());

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                message.error('发送消息失败');
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg) {
                        lastMsg.loading = false;
                        lastMsg.error = true;
                        if (lastMsg.nodes.length === 0) lastMsg.content = `[请求失败: ${error.message}]`;
                    }
                    return newMsgs;
                });
                setErrorNodeId(activeNodeId);
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

            const response = await fetch(`${API_BASE_URL}/client/chat/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                body: JSON.stringify({
                    conversationId: conversationIdRef.current,
                    nodeId: interventionState?.nodeId,
                    approved: data.approved,
                    agentId: id
                })
            });

            if (!response.ok || !response.body) throw new Error(response.statusText);

            setInterventionState(null);
            setPausedNodeId(null);
            await processStream(response.body.getReader());

        } catch (error) {
            message.error('恢复执行失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSSEEvent = (data: any) => {
        if (data.type === 'dag_start') {
            setMessages(prev => {
                const newMsgs = [...prev];
                const currentMsg = { ...newMsgs[newMsgs.length - 1] };
                if (currentMsg.role === 'assistant') {
                    currentMsg.dagProgress = { current: 0, total: data.totalNodes || 0, percentage: 0 };
                    newMsgs[newMsgs.length - 1] = currentMsg;
                }
                return newMsgs;
            });
            setCompletedNodeIds([]);
            setActiveNodeId(null);
            setErrorNodeId(null);
            return;
        }

        if (data.type === 'dag_complete') {
            setMessages(prev => {
                const newMsgs = [...prev];
                const currentMsg = { ...newMsgs[newMsgs.length - 1] };
                if (currentMsg.role === 'assistant') {
                    currentMsg.loading = false;
                    if (data.status === 'failed') currentMsg.error = true;
                    newMsgs[newMsgs.length - 1] = currentMsg;
                }
                return newMsgs;
            });
            resetDagState();
            setSnapshotRefreshKey(prev => prev + 1);
            return;
        }

        setMessages(prev => {
            if (prev.length === 0) return prev;
            const newMsgs = [...prev];
            const currentMsg = { ...newMsgs[newMsgs.length - 1] };
            if (currentMsg.role !== 'assistant') return prev;

            currentMsg.nodes = currentMsg.nodes ? [...currentMsg.nodes] : [];

            if (data.type === 'node_lifecycle') {
                if (data.status === 'starting') {
                    const exists = currentMsg.nodes.find(n => n.nodeId === data.nodeId);
                    if (!exists) {
                        currentMsg.nodes.push({
                            nodeId: data.nodeId,
                            nodeName: data.nodeName || '未知节点',
                            status: 'running',
                            content: '',
                            startTime: data.timestamp || Date.now(),
                            progress: data.progress
                        });
                    }
                    setActiveNodeId(data.nodeId);
                    setErrorNodeId(null);
                    setPausedNodeId(null);
                } else if (data.status === 'completed') {
                    const idx = currentMsg.nodes.findIndex(n => n.nodeId === data.nodeId);
                    if (idx !== -1) {
                        currentMsg.nodes[idx] = {
                            ...currentMsg.nodes[idx],
                            status: 'completed',
                            duration: data.durationMs,
                            result: data.result,
                            progress: data.progress
                        };
                    }
                    if (data.progress && currentMsg.dagProgress) {
                        currentMsg.dagProgress = data.progress;
                    }
                    setCompletedNodeIds(prev => [...new Set([...prev, data.nodeId])]);
                    if (activeNodeId === data.nodeId) setActiveNodeId(null);
                } else if (data.status === 'failed') {
                    const idx = currentMsg.nodes.findIndex(n => n.nodeId === data.nodeId);
                    if (idx !== -1) {
                        currentMsg.nodes[idx] = { ...currentMsg.nodes[idx], status: 'error', result: data.result };
                    }
                    setErrorNodeId(data.nodeId);
                    setActiveNodeId(null);
                }
            } else if (data.type === 'node_execute') {
                let idx = currentMsg.nodes.findIndex(n => n.nodeId === data.nodeId);
                if (idx === -1 && data.nodeName) {
                    idx = currentMsg.nodes.findIndex(n => n.nodeName === data.nodeName && n.status === 'running');
                }
                if (idx === -1 && data.nodeName) {
                    currentMsg.nodes.push({
                        nodeId: data.nodeId || `implied_${Date.now()}`,
                        nodeName: data.nodeName,
                        status: 'running',
                        content: '',
                        startTime: Date.now()
                    });
                    idx = currentMsg.nodes.length - 1;
                    const dagNode = dagNodes.find(n => n.data.label === data.nodeName);
                    if (dagNode) setActiveNodeId(dagNode.id);
                }
                if (idx !== -1) {
                    currentMsg.nodes[idx].content = (currentMsg.nodes[idx].content || '') + (data.content || '');
                }
            } else if (data.type === 'token' || data.type === 'answer') {
                let idx = currentMsg.nodes.findIndex(n => n.nodeName === '最终回复');
                if (idx === -1) {
                    currentMsg.nodes.push({
                        nodeId: 'final_response',
                        nodeName: '最终回复',
                        status: 'running',
                        content: '',
                        startTime: Date.now()
                    });
                    idx = currentMsg.nodes.length - 1;
                }
                currentMsg.nodes[idx].content = (currentMsg.nodes[idx].content || '') + (data.content || '');
            }

            newMsgs[newMsgs.length - 1] = currentMsg;
            return newMsgs;
        });
    };

    const handleStop = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (conversationIdRef.current) {
            try {
                const token = localStorage.getItem('token');
                const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
                await fetch(`${API_BASE_URL}/client/chat/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                    body: JSON.stringify({ conversationId: conversationIdRef.current })
                });
            } catch (error) { console.warn('Cancel failed', error); }
        }

        setLoading(false);
        setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = { ...newMsgs[newMsgs.length - 1] };
            if (lastMsg.loading) {
                lastMsg.loading = false;
                lastMsg.nodes = lastMsg.nodes?.map(n => n.status === 'running' ? { ...n, status: 'error' } : n) || [];
                newMsgs[newMsgs.length - 1] = lastMsg;
            }
            return newMsgs;
        });
        setActiveNodeId(null);
        setErrorNodeId(activeNodeId);
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* 1. Sidebar */}
            <div className={`
                ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}
                bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 relative
            `}>
                {/* Logo Area */}
                <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <ThunderboltOutlined />
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">AI Workbench</span>
                </div>

                {/* Agent Switcher */}
                <div className="p-4 border-b border-white/5">
                    <Dropdown
                        menu={{
                            items: agentList.map(a => ({
                                key: a.agentId,
                                label: <span className="font-medium">{a.agentName}</span>,
                                onClick: () => navigate(`/agent/chat/${a.agentId}`)
                            })),
                            className: "max-h-96 overflow-y-auto"
                        }}
                        trigger={['click']}
                    >
                        <div className="bg-white/5 hover:bg-white/10 p-3 rounded-xl cursor-pointer transition-all border border-white/5 hover:border-white/20 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <Avatar size="small" className="bg-indigo-500 text-xs">{agentName[0]}</Avatar>
                                <div className="flex flex-col">
                                    <span className="text-white font-medium text-sm leading-tight">{agentName}</span>
                                    <span className="text-slate-400 text-xs">正在对话</span>
                                </div>
                            </div>
                            <DownOutlined className="text-slate-500 text-xs group-hover:text-white transition-colors" />
                        </div>
                    </Dropdown>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
                    <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">会话历史</div>
                    <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        className="mb-4 bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-slate-500"
                        onClick={startNewChat}
                    >
                        新会话
                    </Button>

                    <div className="space-y-1">
                        {conversations.map((c) => (
                            <div
                                key={c.conversationId}
                                onClick={() => selectConversation(c.conversationId)}
                                className={`
                                    group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all
                                    ${conversationId === c.conversationId
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                    }
                                `}
                            >
                                <MessageOutlined className={conversationId === c.conversationId ? 'text-white' : 'text-slate-600 group-hover:text-slate-400'} />
                                <div className="flex-1 truncate text-sm font-medium">
                                    {c.conversationId.substring(0, 18)}...
                                </div>
                                {conversationId === c.conversationId && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* User Footer */}
                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-sm hover:text-white cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <ArrowLeftOutlined />
                        <span>返回控制台</span>
                    </div>
                </div>
            </div>

            {/* 2. Main Chat Area */}
            <div className={`flex-1 flex flex-col relative min-w-0 transition-all duration-300 bg-white`}>
                {/* Header */}
                <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-100 z-10">
                    <div className="flex items-center gap-4">
                        <Button
                            icon={isSidebarOpen ? <MenuOutlined /> : <MenuOutlined />}
                            type="text"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        />
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 leading-tight">{agentName}</h1>
                            <p className="text-xs text-slate-500 max-w-md truncate">{agentDesc}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tooltip title="可视化面板">
                            <Button
                                type={isDagPanelVisible ? 'primary' : 'text'}
                                icon={<FunctionOutlined />}
                                onClick={() => setIsDagPanelVisible(!isDagPanelVisible)}
                                className={isDagPanelVisible ? 'bg-slate-900' : 'text-slate-500'}
                            />
                        </Tooltip>
                        <Button icon={<ShareAltOutlined />} type="text" className="text-slate-500" />
                        <Button icon={<MoreOutlined />} type="text" className="text-slate-500" />
                    </div>
                </header>

                {/* Messages */}
                <div
                    className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar bg-slate-50/50"
                    ref={chatContainerRef}
                >
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center -mt-10">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-100 to-white shadow-xl flex items-center justify-center mb-6 animate-float">
                                <RobotOutlined className="text-5xl text-indigo-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">我是 {agentName}</h2>
                            <p className="text-slate-500 mb-8 max-w-md text-center">
                                {agentDesc || '我可以帮您处理复杂任务、分析数据或生成创意内容。'}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full px-4">
                                {['写一篇关于 AI 的博客', '分析最近的销售数据', '制定一个营销计划', '帮我检查这段代码'].map((suggestion, i) => (
                                    <div
                                        key={i}
                                        onClick={() => handleSend(suggestion)}
                                        className="p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all text-sm text-slate-600 hover:text-indigo-600 font-medium text-center"
                                    >
                                        "{suggestion}"
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8 pb-4">
                            {messages.map((msg, idx) => (
                                <MessageBubble key={idx} message={msg} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 relative">
                    {/* Intervention Alert */}
                    {interventionState && interventionState.isPaused && (
                        <div className="absolute bottom-full left-0 right-0 p-4 bg-amber-50 border-t border-amber-100 backdrop-blur-sm animate-fade-in-up">
                            <div className="max-w-4xl mx-auto w-full">
                                <HumanInterventionReview
                                    agentId={id || ''}
                                    conversationId={interventionState.conversationId}
                                    nodeId={interventionState.nodeId}
                                    nodeName={interventionState.nodeName}
                                    checkMessage={interventionState.checkMessage}
                                    refreshKey={snapshotRefreshKey}
                                    onReview={handleReviewSubmit}
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto relative">
                        <Input.TextArea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onPressEnter={e => {
                                if (!e.shiftKey && !loading) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={loading ? "AI 正在思考..." : "发送消息给智能体..."}
                            disabled={loading || (interventionState?.isPaused)}
                            className="w-full !min-h-[60px] !max-h-[200px] !rounded-2xl !bg-slate-50 !border-slate-200 !text-slate-800 !py-4 !px-5 !pr-16 text-base shadow-inner focus:!bg-white focus:!shadow-lg focus:!border-indigo-200 transition-all resize-none"
                            autoSize={{ minRows: 1, maxRows: 6 }}
                        />
                        <div className="absolute right-3 bottom-3 flex gap-2">
                            {loading ? (
                                <Button
                                    danger
                                    shape="circle"
                                    icon={<StopOutlined />}
                                    onClick={handleStop}
                                    className="shadow-md hover:scale-110 transition-transform"
                                />
                            ) : (
                                <Button
                                    type="primary"
                                    shape="circle"
                                    icon={<SendOutlined />}
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500 border-none shadow-md hover:scale-110 transition-transform btn-send"
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-center mt-2 text-xs text-slate-400">
                        AI 生成的内容可能不准确，请核实重要信息。
                    </div>
                </div>
            </div>

            {/* 3. DAG Panel */}
            <div className={`
                ${isDagPanelVisible ? 'w-96 translate-x-0' : 'w-0 translate-x-full overflow-hidden'}
                bg-slate-50 border-l border-slate-200 transition-all duration-300 ease-in-out relative flex flex-col shrink-0
            `}>
                <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white/50 backdrop-blur">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                        <HistoryOutlined /> 执行流
                    </span>
                    <Badge status="processing" text={loading ? '运行中' : '就绪'} />
                </div>
                <div className="flex-1 overflow-hidden relative">
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
            </div>
        </div>
    );
};

export default AgentChat;
