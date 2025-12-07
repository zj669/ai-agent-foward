import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4 group`}>
        
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm mt-1 transition-colors duration-200
          ${isUser ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        
        {/* Bubble */}
        <div className="flex flex-col">
            <div className={`relative px-5 py-4 rounded-2xl shadow-sm text-sm leading-6 
              ${isUser 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
              
              <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-slate'}`}>
                <ReactMarkdown 
                  components={{
                      a: ({node, ...props}) => <a {...props} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
                      p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                      pre: ({node, ...props}) => (
                          <div className="relative">
                              <pre {...props} className={`p-3 rounded-lg overflow-x-auto ${isUser ? 'bg-indigo-800/50' : 'bg-slate-900 text-slate-50'}`} />
                          </div>
                      )
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* Metadata (Hidden by default, shown on hover) */}
            <span className={`text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'text-right' : 'text-left'}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
            </span>
        </div>
      </div>
    </div>
  );
};