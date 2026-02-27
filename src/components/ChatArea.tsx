import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Settings, User, Bot, Copy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { streamCompletion } from '@/lib/llm';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { SettingsDialog } from './SettingsDialog';

export function ChatArea({ onMenuClick }: { onMenuClick: () => void }) {
  const { 
    sessions, 
    currentSessionId, 
    addMessage, 
    updateMessage,
    createSession 
  } = useChatStore();
  
  const { settings } = useSettingsStore();
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, currentSessionId]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    const userContent = input;
    setInput('');
    
    addMessage(sessionId!, { role: 'user', content: userContent });
    addMessage(sessionId!, { role: 'assistant', content: '' });
    
    setIsGenerating(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: userContent });

      const generator = streamCompletion(history, settings);
      
      let fullContent = '';
      
      const freshSession = useChatStore.getState().sessions.find(s => s.id === sessionId);
      const assistantMessage = freshSession?.messages[freshSession.messages.length - 1];
      
      if (!assistantMessage) throw new Error("Failed to create assistant message");

      for await (const chunk of generator) {
        fullContent += chunk;
        updateMessage(sessionId!, assistantMessage.id, fullContent);
      }
    } catch (error) {
      console.error(error);
      const freshSession = useChatStore.getState().sessions.find(s => s.id === sessionId);
      const assistantMessage = freshSession?.messages[freshSession.messages.length - 1];
      if (assistantMessage) {
        updateMessage(sessionId!, assistantMessage.id, `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your API Key and Settings.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple text file reading
    if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const text = await file.text();
      setInput(prev => `${prev}\n\n[文件内容: ${file.name}]\n\`\`\`\n${text}\n\`\`\`\n`.trim());
    } else {
      alert("目前仅支持 .txt 和 .md 文件读取，更多格式支持开发中...");
    }
    
    // Reset input
    e.target.value = '';
  };

  return (
    <main className="flex-1 flex flex-col bg-white h-full relative">
      {isSettingsOpen && <SettingsDialog isOpen={true} onClose={() => setIsSettingsOpen(false)} />}
      
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-gray-100 shrink-0 justify-between md:justify-end">
        <div className="md:hidden flex items-center">
            <button onClick={onMenuClick} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <span className="sr-only">Open menu</span>
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            </button>
            <span className="ml-2 font-medium text-gray-800">LightFlow</span>
        </div>
        
        <div className="text-sm text-gray-500 hidden md:block">
            Model: {settings.model}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Bot className="w-12 h-12 mb-4 opacity-20" />
                <p>开始一个新的对话...</p>
            </div>
        ) : (
            messages.map((msg) => (
            <div 
                key={msg.id} 
                className={cn(
                "flex gap-4 max-w-4xl mx-auto group",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
            >
                <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={cn(
                "flex flex-col max-w-[85%] md:max-w-[75%]",
                msg.role === 'user' ? "items-end" : "items-start"
                )}>
                <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm",
                    msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-sm" 
                    : "bg-gray-50 text-gray-900 border border-gray-100 rounded-tl-sm"
                )}>
                    {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert break-words">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />
                        }}
                      >
                        {msg.content || (isGenerating ? "..." : "")}
                      </ReactMarkdown>
                    </div>
                    ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-xs text-gray-400">
                        {formatDistanceToNow(msg.timestamp, { addSuffix: true, locale: zhCN })}
                    </span>
                    <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                        <button 
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" 
                            title="复制"
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        {msg.role === 'assistant' && (
                            <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="重新生成">
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                </div>
            </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 p-4 md:p-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto relative">
            <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入你的问题，按回车发送..."
                    className="w-full min-h-[50px] max-h-[200px] py-3 pl-4 pr-12 resize-none outline-none text-sm md:text-base rounded-xl bg-transparent"
                    rows={1}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                />
                
                <div className="absolute right-2 bottom-2">
                    <button 
                        onClick={handleSend}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            input.trim() && !isGenerating
                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                        disabled={!input.trim() || isGenerating}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileChange}
                      accept=".txt,.md"
                    />
                    <button 
                      onClick={handleFileClick}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" 
                      title="上传文件"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="表情/快捷指令">
                        <Smile className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" 
                      title="设置"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-xs text-gray-400 hidden md:block">
                    按 Enter 发送，Shift + Enter 换行
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
