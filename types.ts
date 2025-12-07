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
  type: string; // The backend might send variations like "ANALYZER_1", so we treat as string but check includes
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