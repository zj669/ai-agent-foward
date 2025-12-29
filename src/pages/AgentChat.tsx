import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Card, Layout, Typography, Tooltip, Empty, Collapse, Drawer, Grid, Select } from 'antd';
import {
    UserOutlined, RobotOutlined, MessageOutlined, PlusOutlined, DeleteOutlined,
    StopOutlined, SendOutlined, ArrowLeftOutlined, FunctionOutlined, MenuUnfoldOutlined, MenuFoldOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getNewConversationId, getChatHistory, getAgentDetail, getConversationIds, getContextSnapshot, getAgentList } from '../api/agent';
import { AiAgent } from '@/types';
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
    const [agentList, setAgentList] = useState<AiAgent[]>([]);

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
        console.log('AgentChat mounted, id:', id);
        fetchAgentList();
        if (id) {
            console.log('Fetching agent info and history for id:', id);
            fetchAgentInfo(id);
            loadConversationHistory(id);
        } else {
            console.log('No agent id found in params');
        }
    }, [id]);

    const fetchAgentList = async () => {
        try {
            const list = await getAgentList();
            setAgentList(list);
        } catch (error) {
            console.error('Failed to fetch agent list', error);
        }
    };

    // Responsive Logic
    useEffect(() => {
        if (screens.xl) {
            setIsDagPanelVisible(true);
        } else {
            setIsDagPanelVisible(false);
        }
    }, [screens.xl]);

    const fetchAgentInfo = async (agentId: string) => {
        console.log('fetchAgentInfo called for:', agentId);
        try {
            const agent = await getAgentDetail(agentId);
            // ... (rest of function)
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
        console.log('loadConversationHistory called for agentId:', agentId);
        try {
            const res = await getConversationIds(agentId);
            const list = Array.isArray(res) ? res : (res as any).data || [];
            console.log('getConversationIds returned list:', list);
            setConversations(list.map((item: string) => ({ conversationId: item })));

            // 自动选择第一个会话并加载历史消息
            if (list.length > 0 && !conversationId) {
                const firstConversationId = list[0];
                setConversationId(firstConversationId);
                conversationIdRef.current = firstConversationId;

                // 加载第一个会话的历史消息
                try {
                    const res = await getChatHistory(agentId, firstConversationId);
                    const history = Array.isArray(res) ? res : (res as any).data || [];

                    // 解析历史消息
                    const parseContent = (content: string) => {
                        if (typeof content !== 'string') return content;
                        try {
                            return JSON.parse(content);
                        } catch {
                            return content;
                        }
                    };

                    const parsedMessages = history.map((msg: any) => ({
                        ...msg,
                        content: parseContent(msg.content)
                    }));

                    setMessages(parsedMessages);

                    // 尝试恢复人工介入状态
                    try {
                        const snapshot = await getContextSnapshot(agentId, firstConversationId);
                        if (snapshot && snapshot.status === 'PAUSED') {
                            setInterventionState({
                                isPaused: true,
                                conversationId: firstConversationId,
                                nodeId: snapshot.lastNodeId,
                                nodeName: snapshot.stateData?.current_node_name || '未知节点',
                                checkMessage: snapshot.stateData?.check_message || '请审核此内容',
                                allowModifyOutput: true
                            });
                            setPausedNodeId(snapshot.lastNodeId);
                        }
                    } catch (snapshotError: any) {
                        console.log('未找到暂停状态或加载失败:', snapshotError.message);
                    }
                } catch (historyError) {
                    console.error('Failed to load history for first conversation:', historyError);
                }
            }
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
        setInterventionState(null);
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
            // 查询历史消息 - 需要传递agentId
            const history = await getChatHistory(id!, cid);

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

            // 尝试恢复人工介入状态
            try {
                const { getContextSnapshot } = await import('@/api/agent');
                const snapshot = await getContextSnapshot(id!, cid);

                // 根据新的API结构判断是否处于暂停状态
                if (snapshot && snapshot.status === 'PAUSED') {
                    // 恢复人工介入状态
                    setInterventionState({
                        isPaused: true,
                        conversationId: cid,
                        nodeId: snapshot.lastNodeId,
                        nodeName: snapshot.stateData?.current_node_name || '未知节点',
                        checkMessage: snapshot.stateData?.check_message || '请审核此内容',
                        allowModifyOutput: true
                    });
                    setPausedNodeId(snapshot.lastNodeId);
                    console.log('已恢复人工介入状态:', snapshot.lastNodeId);
                }
            } catch (snapshotError: any) {
                // 如果没有快照或加载失败，不影响主流程
                console.log('未找到暂停状态或加载失败:', snapshotError.message);
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
                // 新对话时，立即添加到历史记录列表
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

            const response = await fetch(`${API_BASE_URL}/client/chat/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    conversationId: conversationIdRef.current,
                    nodeId: interventionState?.nodeId,
                    approved: data.approved,
                    agentId: id  // 添加必填的agentId字段
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

    const handleStop = async () => {
        // 1. 取消前端请求
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // 2. 调用后端取消接口
        if (conversationIdRef.current) {
            try {
                const token = localStorage.getItem('token');
                const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';

                await fetch(`${API_BASE_URL}/client/chat/cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                        conversationId: conversationIdRef.current
                    })
                });

                console.log('Cancellation request sent');
            } catch (error) {
                console.warn('Failed to send cancellation request', error);
                // 不影响前端状态更新
            }
        }

        // 3. 更新前端状态
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
    };


    return (
        <Layout className="h-screen bg-background overflow-hidden">
            {/* Sidebar - History */}
            <Sider
                width={280}
                className="chat-sidebar hidden md:block border-r border-border"
                style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}
            >
                <div className="p-6 border-b border-border flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-ink-900 font-bold text-xl px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-paper shrink-0 border border-border">
                            <RobotOutlined className="text-accent text-lg" />
                        </div>
                        <Select
                            value={id}
                            onChange={(value) => navigate(`/agent/chat/${value}`)}
                            className="flex-1 font-bold text-lg agent-select-dropdown"
                            style={{ width: 0 }} // Flex trick to allow shrinking
                            bordered={false}
                            dropdownStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            options={agentList.map(agent => ({
                                label: <span className="text-ink-900 font-medium">{agent.agentName}</span>,
                                value: String(agent.id)
                            }))}
                        />
                    </div>
                    <Button
                        type="primary"
                        block
                        icon={<PlusOutlined />}
                        onClick={startNewChat}
                        className="rounded-xl h-11 bg-white border border-border hover:border-accent text-ink-700 shadow-sm transition-all hover:bg-slate-50"
                    >
                        新对话
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                    <div className="text-xs text-ink-400 mb-3 px-3 uppercase tracking-wider font-semibold">历史记录</div>
                    {conversations.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-ink-400">暂无历史对话</span>} className="mt-10 opacity-50" />
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
                                    <MessageOutlined className={conversationId === c.conversationId ? 'text-accent' : 'text-ink-400'} />
                                    <div className="truncate flex-1 font-mono text-xs">{c.conversationId}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-border bg-transparent">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} block type="text" className="text-ink-400 hover:text-ink-900 h-10 hover:bg-slate-100">
                        返回仪表盘
                    </Button>
                </div>
            </Sider>

            {/* Split Screen Layout */}
            <Layout className="flex-1 h-full relative bg-background">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md shrink-0 z-10 sticky top-0 border-b border-border">
                    <div className="font-semibold text-ink-900 flex items-center gap-3">
                        {/* 移动端返回按钮 - 仅在侧边栏隐藏时显示 */}
                        <Tooltip title="返回仪表盘" className="md:hidden">
                            <Button
                                type="text"
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate('/dashboard')}
                                className="md:hidden text-ink-400 hover:text-ink-900 hover:bg-slate-100 transition-all"
                            />
                        </Tooltip>
                        <div className={`w-2.5 h-2.5 rounded-full ${conversationId ? 'bg-emerald-500 shadow-glow animate-pulse' : 'bg-slate-300'}`} />
                        <div>
                            <div className="text-sm font-bold text-ink-900">{conversationId ? `SESSION: ${conversationId}` : 'New Session'}</div>
                            <div className="text-xs text-ink-400 font-normal">
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
                    {/* Left Panel: Chat Area - CENTER PAPER */}
                    <div className="flex-1 flex flex-col min-w-0 bg-paper transition-all duration-300 relative z-10 shadow-paper mx-0 md:mx-4 md:my-4 rounded-xl border border-border">
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
                                            {index === messages.length - 1 &&
                                                interventionState?.isPaused &&
                                                interventionState?.conversationId === conversationId && (
                                                    <div style={{ maxWidth: '80%', marginTop: 8 }}>
                                                        <HumanInterventionReview
                                                            agentId={id!}
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
                        <div className="p-6 bg-white shrink-0 border-t border-slate-100 rounded-b-xl">
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
                                    className="!pr-24 !py-3 !px-4 !bg-transparent !border !border-border !text-ink-900 !text-base resize-none !shadow-none focus:!border-accent focus:!shadow-sm transition-all rounded-2xl placeholder:!text-ink-400"
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
                    {/* Right Panel: DAG Visualization (Desktop) - ENGINEERING BLUEPRINT */}
                    {isDagPanelVisible && (
                        <div
                            className="width-[40%] min-w-[400px] border-l border-border bg-background transition-all duration-300 ease-in-out relative flex flex-col"
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
                <div className="h-full bg-background">
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
