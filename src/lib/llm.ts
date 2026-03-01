import type { Settings } from '@/store/types';

// 动态导入 Tauri API - 在浏览器环境中会失败，需要降级到普通 fetch
let invoke: any = null;
let listen: any = null;

try {
  // 只在 Tauri 环境中可用
  const tauriCore = await import('@tauri-apps/api/core');
  const tauriEvent = await import('@tauri-apps/api/event');
  invoke = tauriCore.invoke;
  listen = tauriEvent.listen;
} catch (e) {
  console.log('Tauri API not available, using fallback');
}

export interface MessageContent {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface TauriMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface StreamChunk {
  content?: string;
  reasoning_content?: string;
  done?: boolean;
}

export interface StreamCompletionResult {
  content: string;
  thinkingContent?: string;
}

// 流式输出 - 支持 Tauri 和普通 fetch 两种模式
export async function* streamCompletion(
  messages: MessageContent[],
  settings: Settings,
  enableDeepThinking: boolean = false,
  decryptedApiKey?: string
): AsyncGenerator<StreamCompletionResult, void, unknown> {
  // 使用传入的解密 API Key 或原始 API Key
  const apiKey = decryptedApiKey || settings.apiKey;
  console.log('Starting stream completion with deep thinking:', enableDeepThinking);

  // 如果有 Tauri API，使用 Tauri 方式
  if (invoke && listen) {
    yield* streamWithTauri(messages, settings, enableDeepThinking, apiKey);
  } else {
    // 降级到普通 fetch（用于浏览器开发）
    yield* streamWithFetch(messages, settings, enableDeepThinking, apiKey);
  }
}

// Tauri 流式实现
async function* streamWithTauri(
  messages: MessageContent[],
  settings: Settings,
  enableDeepThinking: boolean,
  apiKey: string
): AsyncGenerator<StreamCompletionResult, void, unknown> {
  try {
    let unlisten: any = null;
    const eventQueue: StreamChunk[] = [];
    let resolveNext: ((value: StreamChunk) => void) | null = null;
    let isDone = false;
    
    // 累积变量
    let accumulatedThinking = '';
    let accumulatedContent = '';

    const createNextPromise = (): Promise<StreamChunk> => {
      return new Promise((resolve) => {
        resolveNext = resolve;
      });
    };

    let nextPromise = createNextPromise();

    unlisten = await listen('stream-chunk', (event: any) => {
      const data = event.payload as StreamChunk;
      console.log('Received stream chunk:', data);
      
      // 累积 thinking 和 content
      if (data.reasoning_content) {
        accumulatedThinking += data.reasoning_content;
        console.log('Accumulated thinking:', accumulatedThinking);
      }
      if (data.content) {
        accumulatedContent += data.content;
        console.log('Accumulated content:', accumulatedContent);
      }
      
      eventQueue.push(data);
      
      if (resolveNext && eventQueue.length > 0) {
        const chunk = eventQueue.shift()!;
        resolveNext(chunk);
        resolveNext = null;
        if (chunk.done) {
          isDone = true;
        }
      }
      
      if (data.done) {
        isDone = true;
      }
    });

    invoke('chat_completions_stream', {
      baseUrl: settings.baseUrl,
      apiKey: apiKey,
      model: settings.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      enableDeepThinking,
    }).catch((error: any) => {
      console.error('Stream error:', error);
      if (resolveNext) {
        resolveNext({ content: '', done: true });
      }
      isDone = true;
    });

    // 等待并 yield 每个 chunk
    let lastYieldedThinking = '';
    let lastYieldedContent = '';
    
    while (!isDone) {
      const chunk = await nextPromise;
      
      // 只在有变化时才 yield
      const hasThinkingChange = accumulatedThinking !== lastYieldedThinking;
      const hasContentChange = accumulatedContent !== lastYieldedContent;
      
      if (hasThinkingChange || hasContentChange || chunk.done) {
        yield { 
          content: accumulatedContent, 
          thinkingContent: accumulatedThinking || undefined 
        };
        
        lastYieldedThinking = accumulatedThinking;
        lastYieldedContent = accumulatedContent;
      }
      
      if (chunk.done) {
        break;
      }
      
      nextPromise = createNextPromise();
    }

    if (unlisten) {
      await unlisten();
    }
  } catch (error) {
    console.error('Tauri command error:', error);
    throw new Error(`API Error: ${error}`);
  }
}

// 普通 fetch 实现（用于浏览器开发）
async function* streamWithFetch(
  messages: MessageContent[],
  settings: Settings,
  enableDeepThinking: boolean,
  apiKey: string
): AsyncGenerator<StreamCompletionResult, void, unknown> {
  const url = `${settings.baseUrl}/chat/completions`;
  
  console.log('Sending request to:', url);
  console.log('Model:', settings.model);
  console.log('Messages:', messages);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: messages.map(m => ({ 
          role: m.role, 
          content: m.content 
        })),
        stream: true,
        ...(enableDeepThinking ? { thinking: { type: 'enabled' } } : { thinking: { type: 'disabled' } }),
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorText = await response.text();
      }
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as ChatResponse;
    console.log('Full Response:', result);
    console.log('Reasoning Content:', result.choices?.[0]?.message?.reasoning_content);
    console.log('Reasoning Content Length:', result.choices?.[0]?.message?.reasoning_content?.length);

    if (result.choices && result.choices.length > 0) {
      const choice = result.choices[0];
      const content = choice.message.content;
      const thinkingContent = choice.message.reasoning_content;
      
      console.log('Content length:', content.length);
      console.log('Thinking length:', thinkingContent?.length || 0);
      
      if (thinkingContent) {
        yield { content: '', thinkingContent };
      }
      
      const chunkSize = 5;
      for (let i = 0; i < content.length; i += chunkSize) {
        yield { content: content.slice(i, i + chunkSize), thinkingContent: undefined };
      }
    }
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error(`API Error: ${error}`);
  }
}
