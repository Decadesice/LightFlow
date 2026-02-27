export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  isMultimodal: boolean;
  enableReasoning: boolean;
  reasoningEffort?: 'low' | 'medium' | 'high';
}
