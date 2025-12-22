import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, List, Avatar, Spin, message, Card } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { getAgentDetail } from '@/api/agent';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const AgentChat: React.FC = () => {
    const { id } = useParams(); // agentId (string in DB, but here route param)
    // Actually the route is /agent/chat/:id where id is usually agentId string or DB ID?
    // Let's assume passed ID is the `agentId` string used for chat.
    // If it's number ID, we might need to fetch agent details first to get the guid agentId.

    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [agentName, setAgentName] = useState('Agent');
    const [conversationId, setConversationId] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationIdRef = useRef<string>(''); // Ref for latest access in stream
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (id) {
            // Optional: Load agent details to show name
            // Assuming ID is reliable.
            fetchAgentInfo(id);
        }
    }, [id]);

    const fetchAgentInfo = async (agentId: string) => {
        try {
            const agent = await getAgentDetail(agentId);
            setAgentName(agent.agentName || 'Agent');
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        // Scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !id) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
        setLoading(true);

        // Add assistant placeholder
        const placeholderTimestamp = Date.now();
        setMessages(prev => [...prev, { role: 'assistant', content: '', timestamp: placeholderTimestamp }]);

        try {
            abortControllerRef.current = new AbortController();

            // NOTE: The endpoint in LegacyChat was /api/v1/agent/auto_agent which returns StreamData logs?
            // The prompt requests integration with `POST /client/agent/chat` which supports SSE.
            // Let's assume standard fetch with Authorization.

            const response = await fetch(`${(import.meta as any).env.VITE_API_BASE_URL || '/api'}/client/agent/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    agentId: id,
                    message: userMessage,
                    conversationId: conversationIdRef.current || undefined
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                // Try to read error body
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
                buffer = lines.pop() || ''; // Keep default incomplete line

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data:')) {
                        const dataStr = line.slice(5).trim();
                        if (dataStr === '[DONE]') continue; // Standard SSE done

                        try {
                            const data = JSON.parse(dataStr);
                            // Expected data format from prompt:
                            // { type: 'token' | 'done', content: string, conversationId: string }

                            if (data.type === 'token' || data.type === 'answer') { // Using 'answer' or 'token'
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    if (lastMsg.role === 'assistant') {
                                        lastMsg.content += (data.content || '');
                                    }
                                    return newMsgs;
                                });
                            }

                            if (data.conversationId) {
                                conversationIdRef.current = data.conversationId;
                                setConversationId(data.conversationId);
                            }

                        } catch (e) {
                            console.warn('Failed to parse SSE data', e);
                        }
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
                        lastMsg.content += '\n\n**[请求失败]**';
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
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
                        返回
                    </Button>
                    <div className="font-bold flex items-center gap-2">
                        <RobotOutlined className="text-blue-500" />
                        {agentName}
                    </div>
                </div>
                {conversationId && <div className="text-xs text-gray-400">会话ID: {conversationId}</div>}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
                <List
                    itemLayout="horizontal"
                    dataSource={messages}
                    renderItem={(msg) => (
                        <div className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                                <Avatar icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                    className={msg.role === 'user' ? 'bg-blue-500' : 'bg-green-500'} />
                                <Card
                                    className={`${msg.role === 'user' ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-200'} shadow-sm`}
                                    size="small"
                                    bodyStyle={{ padding: '8px 12px' }}
                                >
                                    <div className="prose prose-sm max-w-none">
                                        <ReactMarkdown>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                />
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="max-w-4xl mx-auto flex gap-2">
                    <Input.TextArea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onPressEnter={(e) => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        placeholder="输入消息与Agent对话..."
                        className="flex-1"
                        disabled={loading && false} // Allow typing but not sending?
                    />
                    {loading ? (
                        <Button type="primary" danger onClick={handleStop}>停止</Button>
                    ) : (
                        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} disabled={!input.trim()}>发送</Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentChat;
