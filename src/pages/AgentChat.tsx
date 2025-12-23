import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Card, Layout, Typography, Tooltip, Empty, Collapse, theme } from 'antd';
import { UserOutlined, RobotOutlined, MessageOutlined, PlusOutlined, DeleteOutlined, StopOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
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
import { ChatMessage, NodeExecution, HumanInterventionState } from '../components/chat/types';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { Panel } = Collapse;

// --- Data Models ---

interface ConversationItem {
    conversationId: string;
    lastMessage?: string;
    timestamp?: number;
}

// --- Icons & Styles ---

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
    const [interventionState, setInterventionState] = useState<HumanInterventionState | null>(null);

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
            const history = await getChatHistory(cid);

            if (history) { // Assuming history is the array or data object
                // If API returns unwrapped array:
                const data = Array.isArray(history) ? history : (history as any).data || [];

                // 转换为前端消息格式
                const historyMessages: ChatMessage[] = data.map((msg: any) => ({
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
                throw new Error('加载失败');
            }

        } catch (e: any) {
            console.error('加载历史消息失败', e);
            message.error('加载历史消息失败: ' + (e.message || '未知错误'));

            // 如果加载失败，恢复为空状态
            setMessages([]);
        }
    };


    const handleSend = async (userInput?: string, isResume: boolean = false) => {
        const messageToSend = isResume ? '' : (userInput || input);

        if (!isResume && !messageToSend.trim()) return;

        if (!isResume) {
            // Add user message
            const newUserMsg: ChatMessage = {
                role: 'user',
                content: messageToSend,
                nodes: [],
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, newUserMsg]);
            setInput('');
        }

        // Add assistant placeholder
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

                        if (data.type === 'node_lifecycle' && data.status === 'paused') {
                            // 设置暂停状态
                            const checkMessage = data.result?.replace('WAITING_FOR_HUMAN:', '') || '请审核此内容';
                            setInterventionState({
                                isPaused: true,
                                nodeId: data.nodeId,
                                nodeName: data.nodeName,
                                checkMessage: checkMessage,
                                allowModifyOutput: true // Assuming default true for now, needs backend support to pass this
                            });

                            // 更新节点状态为 paused
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    // Update active node to paused
                                    const nodeIndex = lastMsg.nodes.findIndex(n => n.nodeId === data.nodeId);
                                    if (nodeIndex !== -1) {
                                        lastMsg.nodes[nodeIndex].status = 'paused';
                                        lastMsg.nodes[nodeIndex].result = checkMessage;
                                    } else {
                                        // If node not found (shouldn't happen with correct events), add it
                                        lastMsg.nodes.push({
                                            nodeId: data.nodeId,
                                            nodeName: data.nodeName,
                                            status: 'paused',
                                            content: '',
                                            startTime: Date.now(),
                                            result: checkMessage
                                        });
                                    }
                                }
                                return newMessages;
                            });
                            setLoading(false); // Stop loading indicator when paused
                            return; // Stop processing stream temporarily
                        }

                        if (data.type === 'node_lifecycle') {
                            // ... existing logic ...
                            setActiveNodeId(data.nodeId);
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    // Find existing node or add new
                                    const nodeIndex = lastMsg.nodes.findIndex(n => n.nodeId === data.nodeId);

                                    if (nodeIndex !== -1) {
                                        // Update existing
                                        lastMsg.nodes[nodeIndex].status = data.status;
                                        if (data.status === 'running') {
                                            lastMsg.nodes[nodeIndex].startTime = Date.now();
                                        } else if (data.status === 'completed') {
                                            lastMsg.nodes[nodeIndex].duration = Date.now() - lastMsg.nodes[nodeIndex].startTime;
                                            lastMsg.nodes[nodeIndex].result = data.result;
                                        } else if (data.status === 'error') {
                                            lastMsg.nodes[nodeIndex].result = data.result;
                                        }
                                    } else {
                                        // Add new node
                                        lastMsg.nodes.push({
                                            nodeId: data.nodeId,
                                            nodeName: data.nodeName,
                                            status: data.status,
                                            content: '',
                                            startTime: Date.now(),
                                            result: data.result
                                        });
                                    }
                                }
                                return newMessages;
                            });
                        } else if (data.type === 'node_execute') {
                            // ... existing logic ...
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg && lastMsg.role === 'assistant') {
                                    const nodeIndex = lastMsg.nodes.findIndex(n => n.nodeId === data.nodeId);
                                    if (nodeIndex !== -1) {
                                        lastMsg.nodes[nodeIndex].content += data.content;
                                    }
                                    // Also accumulate to main content if it's the final answer
                                    // For now just append to main content for visibility if needed
                                    if (data.nodeName === 'End' || data.nodeName === 'Answer') { // Simple heuristic
                                        lastMsg.content += data.content;
                                    }
                                }
                                return newMessages;
                            });
                        } else if (data.type === 'answer') {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastMsg = newMessages[newMessages.length - 1];
                                if (lastMsg) {
                                    lastMsg.content += data.content;
                                }
                                return newMessages;
                            });
                        }
                    } catch (e) {
                        console.warn('SSE Parse Error', e);
                    }
                }
            }

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
                        // Fallback error display
                        if (lastMsg.nodes.length === 0) {
                            lastMsg.content = `[请求失败: ${error.message}]`;
                        }
                    }
                    return newMsgs;
                });
            }
        } finally {
            if (!interventionState?.isPaused) { // Only stop loading if NOT paused
                setLoading(false);
            }
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



    // --- Components for Glass Box UI ---



    return (
        <Layout className="h-screen bg-[#f8fafc] overflow-hidden">
            {/* Sidebar */}
            <Sider
                width={280}
                className="chat-sidebar border-r border-gray-800 hidden md:block"
                style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div className="p-6 border-b border-gray-700/50 flex flex-col gap-4">
                    <div className="flex items-center gap-3 text-white font-bold text-xl px-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
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
                    <div className="text-xs text-gray-400 mb-3 px-3 uppercase tracking-wider font-semibold">历史记录</div>
                    {conversations.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-gray-500">暂无历史对话</span>} className="mt-10 opacity-50" />
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {conversations.map(c => (
                                <div
                                    key={c.conversationId}
                                    onClick={() => selectConversation(c.conversationId)}
                                    className={`
                                        conversation-item p-3.5 rounded-xl cursor-pointer flex items-center gap-3 text-sm
                                        ${conversationId === c.conversationId ? 'active text-white font-medium' : 'text-gray-400 hover:text-gray-200'}
                                    `}
                                >
                                    <MessageOutlined className={conversationId === c.conversationId ? 'text-indigo-400' : ''} />
                                    <div className="truncate flex-1 font-mono text-xs">{c.conversationId}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700/30 bg-black/10 backdrop-blur-md">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} block type="text" className="text-gray-400 hover:text-white h-10 rounded-xl hover:bg-white/5">
                        返回仪表盘
                    </Button>
                </div>
            </Sider>

            {/* Main Chat */}
            <Layout className="bg-[#f8fafc] flex flex-col h-full relative">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md shrink-0 z-10 sticky top-0">
                    <div className="font-semibold text-gray-700 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${conversationId ? 'bg-green-500 shadow-glow' : 'bg-gray-300'}`} />
                        {conversationId ? <span className="font-mono text-sm tracking-tight text-gray-500">ID: {conversationId}</span> : '新对话'}
                    </div>
                </div>

                {/* Message List */}
                <Content className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
                    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-4">
                        {messages.length === 0 && (
                            <EmptyState agentName={agentName} agentDesc={agentDesc} />
                        )}

                        <div className="message-list">
                            {messages.map((msg, index) => (
                                <div key={index}>
                                    <MessageBubble message={msg} />
                                    {/* Render Review Component if this is the last message relative to intervention */}
                                    {index === messages.length - 1 && interventionState?.isPaused && (
                                        <div style={{ maxWidth: '80%', marginTop: 8 }}>
                                            <HumanInterventionReview
                                                conversationId={conversationId}
                                                nodeId={interventionState.nodeId!}
                                                nodeName={interventionState.nodeName!}
                                                checkMessage={interventionState.checkMessage!}
                                                allowModifyOutput={interventionState.allowModifyOutput}
                                                onReviewComplete={(approved) => {
                                                    setInterventionState(null);
                                                    if (approved) {
                                                        // 审核通过后重新发起请求继续执行
                                                        handleSend(undefined, true);
                                                    } else {
                                                        setLoading(false); // Stop loading if rejected
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loading && messages.length > 0 && !interventionState?.isPaused && (
                                <div style={{ marginLeft: 16, marginTop: 8 }}>
                                    <Spin size="small" /> Thinking...
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>
                </Content>

                {/* Input Area */}
                <div className="p-6 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent shrink-0">
                    <div className="max-w-4xl mx-auto relative chat-input-container">
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
                            className="!pr-24 !py-3 !px-4 !bg-transparent !border-none !text-base resize-none !shadow-none focus:!ring-0 placeholder:text-gray-400"
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
                                        className="border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-500 hover:bg-red-50"
                                    />
                                </Tooltip>
                            ) : (
                                <Button
                                    type="primary"
                                    shape="circle"
                                    size="large"
                                    icon={<SendOutlined />}
                                    onClick={() => handleSend()}
                                    loading={loading && !interventionState?.isPaused}
                                    disabled={!input.trim() || (loading && !interventionState?.isPaused)}
                                    className={`gradient-btn shadow-lg shadow-blue-500/30 ${(!input.trim() || (loading && !interventionState?.isPaused)) && 'opacity-50 grayscale'}`}
                                />
                            )}
                        </div>
                    </div>
                    <div className="text-center mt-3 text-xs text-gray-400">
                        AI 生成的内容可能不准确，请核对重要信息
                    </div>
                </div>
            </Layout>
        </Layout>
    );
};

export default AgentChat;
