import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Terminal, StopCircle, Sparkles, Activity, Trash2, Command, MessageSquare, History, Plus, ChevronDown } from 'lucide-react';
import { LogEntryItem } from './components/LogEntryItem';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { fetchAgentStream } from './services/agentService';
import { StreamData, ChatMessage } from './types';

// Constants
const API_BASE_URL = 'http://localhost:8091';
const AGENT_ENDPOINT = '/api/v1/agent/auto_agent';
const NEW_CHAT_ENDPOINT = '/api/v1/agent/newChat';
const OLD_CHAT_ENDPOINT = '/api/v1/agent/oldChat';
const AGENT_LIST_ENDPOINT = '/api/v1/agent/list';

// Agent类型定义
interface AiAgent {
  id: number;
  agentId: string;
  agentName: string;
  description: string;
  channel: string;
  status: number;
  createTime: string;
  updateTime: string;
}

const App: React.FC = () => {
  // --- State ---
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processLogs, setProcessLogs] = useState<StreamData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
        role: 'assistant', 
        content: '您好！我是您的自主代理。我可以分析复杂任务、执行代码并提供总结结果。今天我能为您做些什么？', 
        timestamp: Date.now() 
    }
  ]);
  const [sessionId, setSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<string[]>([]);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  
  // --- Refs for Scrolling ---
  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  
  // 初始化时获取新的会话ID和agent列表
  useEffect(() => {
    fetchNewSessionId();
    fetchAgentList();
  }, []);

  // 点击外部关闭历史记录面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
      if (agentRef.current && !agentRef.current.contains(event.target as Node)) {
        setShowAgentSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-scroll logs when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [processLogs]);

  // Auto-scroll chat when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length]); // Scroll on new message count change

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // --- Handlers ---

  const fetchNewSessionId = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${NEW_CHAT_ENDPOINT}`);
      const data = await response.json();
      if (data.code === '0000') {
        setSessionId(data.data);
        // 重置聊天记录
        setChatMessages([
          { 
              role: 'assistant', 
              content: '您好！我是您的自主代理。我可以分析复杂任务、执行代码并提供总结结果。今天我能为您做些什么？', 
              timestamp: Date.now() 
          }
        ]);
        setProcessLogs([]);
      } else {
        // 如果API失败，使用默认ID
        setSessionId('session-' + Date.now());
      }
    } catch (error) {
      console.error('获取会话ID失败:', error);
      // 如果API失败，使用默认ID
      setSessionId('session-' + Date.now());
    }
  };

  const fetchAgentList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${AGENT_LIST_ENDPOINT}`);
      const data = await response.json();
      if (data.code === '0000') {
        setAgents(data.data);
        // 默认选择第一个agent
        if (data.data.length > 0) {
          setSelectedAgent(data.data[0]);
        }
      }
    } catch (error) {
      console.error('获取Agent列表失败:', error);
    }
  };

  const fetchHistorySessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${OLD_CHAT_ENDPOINT}`);
      const data = await response.json();
      if (data.code === '0000') {
        setHistorySessions(data.data);
      }
    } catch (error) {
      console.error('获取历史会话失败:', error);
      setHistorySessions([]);
    }
  };

  const handleSelectHistory = (historySessionId: string) => {
    setSessionId(historySessionId);
    setShowHistory(false);
    // 这里可以添加加载历史会话的逻辑
    setChatMessages([
      { 
          role: 'assistant', 
          content: `已加载历史会话 ${historySessionId.slice(-6)}。请注意，当前界面仅用于演示，实际应用中应从服务器加载完整的历史记录。`, 
          timestamp: Date.now() 
      }
    ]);
    setProcessLogs([]);
  };

  const handleSelectAgent = (agent: AiAgent) => {
    setSelectedAgent(agent);
    setShowAgentSelector(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedAgent) return;

    const userMsg = input;
    setInput('');
    setIsLoading(true);

    // Add User Message
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);

    // Initial placeholder for Agent response (optional, or just wait for stream)
    // We choose to wait for the stream to populate the logs first.

    await fetchAgentStream(
      `${API_BASE_URL}${AGENT_ENDPOINT}`,
      {
        aiAgentId: selectedAgent.agentId, 
        message: userMsg,
        sessionId: sessionId,
        maxStep: 10
      },
      (data) => {
        // 1. 总是添加到进程日志(左侧面板)
        setProcessLogs(prev => [...prev, data]);

        // 2. 如果是摘要/最终答案，则添加到聊天(右侧面板)
        // 我们只希望在聊天视图中看到最终合成的答案
        if (data.type?.includes('SUMMARY_ASSISTANT') && data.content !== '执行完成' && !data.completed) {
            setChatMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                // 检查最后一条消息是否来自此流的助手消息
                // 此逻辑取决于后端如何传输流数据。
                // 如果后端逐个令牌传输摘要，我们需要更新最后一条消息。
                // 如果后端一次性发送完整的摘要块(如原始代码所示)，我们则推送新的消息。
                
                // 基于原始代码片段，目前假设采用基于块的发送方式：
                return [...prev, { role: 'assistant', content: data.content, timestamp: data.timestamp }];
            });
        }
      },
      (err) => {
        console.error("流错误", err);
        setProcessLogs(prev => [...prev, {
            type: 'ERROR',
            content: `连接错误: ${err.message}。请确保后端服务正在运行 ${API_BASE_URL}${AGENT_ENDPOINT}`,
            step: 0,
            timestamp: Date.now(),
            sessionId: sessionId
        }]);
        setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `**系统错误:** 连接到代理核心时遇到问题。请查看日志面板获取详细信息。`,
            timestamp: Date.now()
        }]);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        // 可选：在日志中添加一个微妙的'done'标记？
      }
    );
  };

  const clearLogs = () => {
      setProcessLogs([]);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* ================= 左侧面板: 内核日志 (大脑) ================= */}
      <div className="hidden md:flex w-5/12 lg:w-4/12 h-full bg-slate-950 flex-col border-r border-slate-800 shadow-2xl z-20">
        
        {/* 头部 */}
        <div className="h-16 px-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-900/30 rounded-md border border-blue-800/50">
                <Terminal size={16} className="text-blue-400" />
            </div>
            <div>
                <h2 className="text-sm font-bold tracking-wide text-slate-200">代理内核</h2>
                <div className="flex items-center gap-1.5 opacity-60">
                    <Activity size={10} className="text-emerald-500" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase">系统在线</span>
                </div>
            </div>
          </div>
          <button 
            onClick={clearLogs}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded hover:bg-slate-900"
            title="清除日志"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        {/* 日志流内容 */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth bg-slate-950/50 relative">
          
          {/* 背景装饰 */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          {processLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4 select-none">
               <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center">
                 <Command size={24} />
               </div>
               <div className="text-center">
                 <p className="text-xs font-mono uppercase tracking-widest mb-1">等待序列</p>
                 <p className="text-[10px] text-slate-600">内部思维过程将在此处显示</p>
               </div>
            </div>
          ) : (
             <div className="space-y-4">
               {processLogs.map((log, idx) => (
                 <LogEntryItem key={`${log.sessionId}-${idx}`} data={log} />
               ))}
               <div ref={logsEndRef} className="h-4" />
             </div>
          )}
        </div>
        
        {/* 状态页脚 */}
        <div className="h-8 border-t border-slate-800 bg-slate-950 flex items-center px-4 justify-between text-[10px] text-slate-500 font-mono">
            <span>会话: {sessionId ? sessionId.slice(-6) : '加载中...'}</span>
            <span>内存: {processLogs.length * 0.4}KB</span>
        </div>
      </div>

      {/* ================= 右侧面板: 聊天界面 (角色) ================= */}
      <div className="flex-1 h-full flex flex-col bg-white relative">
        
        {/* 头部 */}
        <div className="h-16 px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isLoading ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                {isLoading ? <Sparkles size={18} className="animate-pulse" /> : <Bot size={18} />}
            </div>
            <div>
                <h1 className="font-semibold text-slate-800 text-sm md:text-base">自动代理助手</h1>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                   {isLoading ? (
                       <>思考中 <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></>
                   ) : '等待指令'}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Agent选择器 */}
            <div className="relative" ref={agentRef}>
              <button
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                disabled={isLoading}
              >
                <Bot size={16} />
                <span className="hidden sm:inline">
                  {selectedAgent ? selectedAgent.agentName : '选择Agent'}
                </span>
                <ChevronDown size={16} />
              </button>
              
              {/* Agent选择面板 */}
              {showAgentSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                  <div className="p-3 border-b border-slate-100">
                    <h3 className="font-medium text-slate-800 flex items-center gap-2">
                      <Bot size={16} />
                      选择Agent
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {agents.length > 0 ? (
                      agents.map((agent) => (
                        <div
                          key={agent.id}
                          onClick={() => handleSelectAgent(agent)}
                          className={`p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors ${
                            selectedAgent?.id === agent.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div className="font-medium text-slate-800">{agent.agentName}</div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2">{agent.description}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        暂无可用Agent
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* 历史记录按钮 */}
            <div className="relative" ref={historyRef}>
              <button
                onClick={() => {
                  if (!showHistory) {
                    fetchHistorySessions();
                  }
                  setShowHistory(!showHistory);
                }}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <History size={16} />
                <span className="hidden sm:inline">历史记录</span>
              </button>
              
              {/* 历史记录面板 */}
              {showHistory && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                  <div className="p-3 border-b border-slate-100">
                    <h3 className="font-medium text-slate-800 flex items-center gap-2">
                      <History size={16} />
                      历史会话
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {historySessions.length > 0 ? (
                      historySessions.map((session, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectHistory(session)}
                          className="p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono text-slate-600">#{session.slice(-6)}</span>
                            <span className="text-xs text-slate-400">{index + 1}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-sm">
                        暂无历史记录
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-100">
                    <button
                      onClick={fetchNewSessionId}
                      className="w-full flex items-center justify-center gap-2 p-2 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    >
                      <Plus size={16} />
                      新建会话
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 聊天区域 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 custom-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
            {chatMessages.map((msg, index) => (
              <ChatMessageBubble key={index} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="让我分析数据、编写代码或解决问题..."
              disabled={isLoading || !sessionId || !selectedAgent}
              className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 rounded-xl pl-5 pr-14 py-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !sessionId || !selectedAgent}
              className={`absolute right-2 top-2 bottom-2 aspect-square rounded-lg flex items-center justify-center transition-all duration-200
                ${isLoading || !input.trim() || !sessionId || !selectedAgent
                  ? 'bg-transparent text-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'}`}
            >
              {isLoading ? <StopCircle size={20} className="animate-spin-slow" /> : <Send size={20} />}
            </button>
          </div>
          <div className="text-center mt-3 text-[10px] text-slate-400 uppercase tracking-widest font-medium opacity-50">
            由自动代理框架驱动
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;