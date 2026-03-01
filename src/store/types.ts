export interface Modalities {
  input?: ('text' | 'image')[];
  output?: ('text' | 'image')[];
}

export interface ModelConfig {
  id: string;
  name: string;
  platform: string; // 平台/厂商标识，如：火山引擎、OpenAI、Anthropic 等
  baseUrl: string;
  apiKey: string; // 每个模型独立的 API Key
  isMultimodal: boolean;
  modalities?: Modalities; // 模态配置
  isDefault?: boolean;
}

export interface FileAttachment {
  name: string;
  type: 'image' | 'text' | 'pdf' | 'word' | 'excel' | 'powerpoint' | 'file' | 'error';
  size: number;
  content: string; // Base64 或文本内容
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  imageUrls?: string[];
  thinkingContent?: string; // 思考过程内容
  attachments?: FileAttachment[]; // 多模态附件
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
  models?: ModelConfig[];
  currentModelId?: string;
  enableResumeModule?: boolean; // 是否启用简历生成模块
}

// 简历生成模块相关类型
export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'technical' | 'general' | 'fresh-graduate';
  content: string;
  isBuiltIn: boolean;
  placeholders: string[];
}

export interface ResumeDraft {
  templateId: string;
  content: string;
  lastUpdated: number;
  instruction: string;
}

export interface ResumeModuleState {
  templates: ResumeTemplate[];
  selectedTemplateId: string | null;
  draft: ResumeDraft | null;
  isGenerating: boolean;
  viewMode: 'edit' | 'preview';
}
