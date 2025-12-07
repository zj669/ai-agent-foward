import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Terminal, StopCircle, Sparkles, Activity, Trash2, Command } from 'lucide-react';
import { LogEntryItem } from './components/LogEntryItem';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { fetchAgentStream } from './services/agentService';
import { StreamData, ChatMessage } from './types';

// Constants
const API_ENDPOINT = 'http://localhost:8091/api/v1/agent/auto_agent';
const DEFAULT_SESSION_ID = 'session-' + Date.now();

const App: React.FC = () => {
  // --- State ---
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processLogs, setProcessLogs] = useState<StreamData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { 
        role: 'assistant', 
        content: 'Hello! I am your Autonomous Agent. I can analyze complex tasks, execute code, and provide summarized results. How can I help you today?', 
        timestamp: Date.now() 
    }
  ]);
  const [sessionId] = useState(DEFAULT_SESSION_ID);
  
  // --- Refs for Scrolling ---
  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setIsLoading(true);

    // Add User Message
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() }]);

    // Initial placeholder for Agent response (optional, or just wait for stream)
    // We choose to wait for the stream to populate the logs first.

    await fetchAgentStream(
      API_ENDPOINT,
      {
        aiAgentId: "3", 
        message: userMsg,
        sessionId: sessionId,
        maxStep: 10
      },
      (data) => {
        // 1. Always append to process logs (Left Pane)
        setProcessLogs(prev => [...prev, data]);

        // 2. If it is a Summary/Final Answer, append to Chat (Right Pane)
        // We only want the final synthesized answer in the chat view
        if (data.type?.includes('SUMMARY_ASSISTANT') && data.content !== '执行完成' && !data.completed) {
            setChatMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                // Check if the last message was already an assistant message from THIS stream
                // This logic depends on how the backend streams. 
                // If the backend streams the summary token by token, we would need to update the last message.
                // If the backend sends the full summary block at once (as implied by the original code), we push new.
                
                // Assuming block-based sending for now based on original code snippet:
                return [...prev, { role: 'assistant', content: data.content, timestamp: data.timestamp }];
            });
        }
      },
      (err) => {
        console.error("Stream Error", err);
        setProcessLogs(prev => [...prev, {
            type: 'ERROR',
            content: `Connection Error: ${err.message}. Ensure backend is running at ${API_ENDPOINT}`,
            step: 0,
            timestamp: Date.now(),
            sessionId: sessionId
        }]);
        setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `**System Error:** I encountered a problem connecting to the agent core. Check the logs panel for details.`,
            timestamp: Date.now()
        }]);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
        // Optional: Add a subtle 'done' marker in logs?
      }
    );
  };

  const clearLogs = () => {
      setProcessLogs([]);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* ================= LEFT PANE: KERNEL LOGS (The Brain) ================= */}
      <div className="hidden md:flex w-5/12 lg:w-4/12 h-full bg-slate-950 flex-col border-r border-slate-800 shadow-2xl z-20">
        
        {/* Header */}
        <div className="h-16 px-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-900/30 rounded-md border border-blue-800/50">
                <Terminal size={16} className="text-blue-400" />
            </div>
            <div>
                <h2 className="text-sm font-bold tracking-wide text-slate-200">AGENT KERNEL</h2>
                <div className="flex items-center gap-1.5 opacity-60">
                    <Activity size={10} className="text-emerald-500" />
                    <span className="text-[10px] text-slate-400 font-mono uppercase">System Online</span>
                </div>
            </div>
          </div>
          <button 
            onClick={clearLogs}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded hover:bg-slate-900"
            title="Clear Logs"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        {/* Log Stream Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth bg-slate-950/50 relative">
          
          {/* Background Decor */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          </div>

          {processLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4 select-none">
               <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center">
                 <Command size={24} />
               </div>
               <div className="text-center">
                 <p className="text-xs font-mono uppercase tracking-widest mb-1">Awaiting Sequence</p>
                 <p className="text-[10px] text-slate-600">Internal thought processes will appear here</p>
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
        
        {/* Status Footer */}
        <div className="h-8 border-t border-slate-800 bg-slate-950 flex items-center px-4 justify-between text-[10px] text-slate-500 font-mono">
            <span>SESSION: {sessionId.slice(-6)}</span>
            <span>MEM: {processLogs.length * 0.4}KB</span>
        </div>
      </div>

      {/* ================= RIGHT PANE: CHAT INTERFACE (The Persona) ================= */}
      <div className="flex-1 h-full flex flex-col bg-white relative">
        
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isLoading ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                {isLoading ? <Sparkles size={18} className="animate-pulse" /> : <Bot size={18} />}
            </div>
            <div>
                <h1 className="font-semibold text-slate-800 text-sm md:text-base">AutoAgent Assistant</h1>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                   {isLoading ? (
                       <>Thinking <span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></>
                   ) : 'Ready for instruction'}
                </p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 custom-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
            {chatMessages.map((msg, index) => (
              <ChatMessageBubble key={index} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
          <div className="max-w-3xl mx-auto relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask me to analyze data, write code, or solve a problem..."
              disabled={isLoading}
              className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 rounded-xl pl-5 pr-14 py-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className={`absolute right-2 top-2 bottom-2 aspect-square rounded-lg flex items-center justify-center transition-all duration-200
                ${isLoading || !input.trim() 
                  ? 'bg-transparent text-slate-300 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'}`}
            >
              {isLoading ? <StopCircle size={20} className="animate-spin-slow" /> : <Send size={20} />}
            </button>
          </div>
          <div className="text-center mt-3 text-[10px] text-slate-400 uppercase tracking-widest font-medium opacity-50">
            Powered by AutoAgent Framework
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;