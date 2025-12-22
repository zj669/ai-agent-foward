export enum AgentStepType {
  ANALYZER = 'ANALYZER',
  EXECUTOR = 'EXECUTOR',
  SUMMARY_ASSISTANT = 'SUMMARY_ASSISTANT',
  ERROR = 'ERROR',
  SYSTEM = 'SYSTEM'
}

export interface StreamData {
  sessionId: string;
  content: string;
  type: string;
  step: number;
  timestamp: number;
  completed?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentRequest {
  aiAgentId: string;
  message: string;
  sessionId: string;
  maxStep: number;
}

export interface AiAgent {
  id: number;
  agentId: string;
  agentName: string;
  description: string;
  channel: string;
  status: number; // 0: Draft, 1: Published, 2: Disabled
  createTime: string;
  updateTime: string;
  graphJson?: string; // Optional, might be large
}