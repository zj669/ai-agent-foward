import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Terminal, Cpu, CheckCircle, Brain, AlertCircle } from 'lucide-react';
import { StreamData } from '../types';

interface LogEntryItemProps {
  data: StreamData;
}

export const LogEntryItem: React.FC<LogEntryItemProps> = ({ data }) => {
  // Determine style and icon based on step type
  const isAnalyzer = data.type?.includes('ANALYZER');
  const isExecutor = data.type?.includes('EXECUTOR');
  const isSummary = data.type?.includes('SUMMARY');
  const isError = data.type?.includes('ERROR');
  
  // Filter out internal completion signals from rendering as a full card if content is trivial
  if (data.content === '执行完成' || data.completed) return null;

  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-900/50';
  let Icon = Terminal;
  let title = 'System Log';
  let textColor = 'text-slate-300';
  let headerColor = 'text-slate-400';

  if (isAnalyzer) {
    borderColor = 'border-blue-500/50';
    bgColor = 'bg-blue-950/10';
    Icon = Brain;
    title = 'Analysis Engine';
    textColor = 'text-blue-100';
    headerColor = 'text-blue-400';
  } else if (isExecutor) {
    borderColor = 'border-amber-500/50';
    bgColor = 'bg-amber-950/10';
    Icon = Cpu;
    title = 'Execution Step';
    textColor = 'text-amber-100';
    headerColor = 'text-amber-400';
  } else if (isSummary) {
    borderColor = 'border-emerald-500/50';
    bgColor = 'bg-emerald-950/10';
    Icon = CheckCircle;
    title = 'Synthesis';
    textColor = 'text-emerald-100';
    headerColor = 'text-emerald-400';
  } else if (isError) {
    borderColor = 'border-red-500/50';
    bgColor = 'bg-red-950/10';
    Icon = AlertCircle;
    title = 'System Error';
    textColor = 'text-red-100';
    headerColor = 'text-red-400';
  }

  return (
    <div className={`group relative mb-4 rounded-md border-l-2 ${borderColor} ${bgColor} p-3 shadow-sm transition-all hover:bg-slate-800/80`}>
      <div className={`flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider ${headerColor}`}>
        <Icon size={14} />
        <span>{title}</span>
        <span className="ml-auto font-mono text-slate-600">SEQ: {data.step}</span>
      </div>
      
      <div className={`prose prose-invert prose-sm max-w-none font-mono text-xs leading-relaxed ${textColor}`}>
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              return (
                <code className={`${className} bg-slate-950 rounded px-1 py-0.5 text-yellow-200/90`} {...props}>
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return (
                 <pre className="bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto my-2">
                   {children}
                 </pre>
              );
            }
          }}
        >
          {data.content}
        </ReactMarkdown>
      </div>

      <div className="mt-2 flex justify-between items-center">
        <span className="text-[10px] text-slate-600 font-mono">
            ID: {data.sessionId?.slice(0, 8)}...
        </span>
        <span className="text-[10px] text-slate-600 font-mono">
          {new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
};