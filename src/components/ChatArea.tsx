import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Settings, User, Bot, Copy, RotateCcw, Trash2, CheckCircle2, AlertCircle, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/store/useChatStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { streamCompletion } from '@/lib/llm';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { SettingsDialog } from './SettingsDialog';
import type { Session, Message, ModelConfig, FileAttachment } from '@/store/types';
import { processFiles, isSupportedFileType, isImageFile } from '@/lib/fileProcessor';
import { FilePreviewList } from './FilePreview';

function ThinkingContent({ content, isComplete = false }: { content: string, isComplete?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [userInteracted, setUserInteracted] = useState(false);

  // 当 content 变化时，如果有内容就自动展开，完成后自动折叠（除非用户已交互）
  useEffect(() => {
    if (content && content.length > 0) {
      // 有思考内容时展开，但如果用户已交互则保持其选择
      if (!userInteracted) {
        setIsExpanded(true);
      }
    } else if (isComplete && !userInteracted) {
      // 思考完成且没有内容时折叠，但仅当用户未交互时
      setIsExpanded(false);
    }
  }, [content, isComplete, userInteracted]);

  // 没有内容时不渲染
  if (!content || content.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setUserInteracted(true); // 标记用户已交互
  };

  return (
    <div className="mb-3 border border-purple-200 rounded-lg overflow-hidden bg-purple-50/50">
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-3 py-2 bg-purple-100 text-purple-800 text-xs font-medium hover:bg-purple-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className={cn("w-3.5 h-3.5", !isComplete && "animate-pulse")} />
          <span>深度思考过程</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-3 py-2.5 text-xs text-gray-700 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

export function ChatArea({ onMenuClick }: { onMenuClick: () => void }) {
  const { 
    sessions, 
    currentSessionId, 
    addMessage, 
    updateMessage,
    createSession,
    deleteMessagePair,
    deleteLastMessage,
    getLastUserMessage 
  } = useChatStore();
  
  const { settings } = useSettingsStore();
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableDeepThinking, setEnableDeepThinking] = useState(false);
  const [, setError] = useState<string | null>(null); // 仅用于 handleSend 和 handleRegenerate
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ sessionId: string; messageId: string } | null>(null);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true); // 是否启用自动滚动
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const currentSession = sessions.find((s: Session) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];
  
  // 获取当前模型信息
  const { getCurrentModel, setCurrentModel } = useSettingsStore();
  const currentModel = getCurrentModel();
  const models = useSettingsStore.getState().settings.models || [];

  // 滚动到底部
  const scrollToBottom = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // 监听用户滚动
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // 如果用户向上滚动超过 50px，禁用自动滚动
      if (distanceFromBottom > 50) {
        setAutoScrollEnabled(false);
      } else {
        // 如果用户滚动到底部（距离底部小于 50px），启用自动滚动
        setAutoScrollEnabled(true);
      }
    };
    
    // 使用防抖来优化滚动事件处理
    const debouncedHandleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        handleScroll();
        scrollTimeoutRef.current = null;
      }, 50);
    };
    
    container.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, autoScrollEnabled]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  // 处理文件上传
  const handleFiles = async (files: FileList) => {
    const currentModel = getCurrentModel();
    
    // 检查当前模型是否支持多模态
    if (!currentModel?.isMultimodal) {
      // 检查是否只有图片
      const hasNonImageFiles = Array.from(files).some(file => !isImageFile(file));
      if (hasNonImageFiles) {
        showToast('当前模型不支持多模态，只能上传图片', 'error');
        return;
      }
      
      // 对于非多模态模型，只允许上传图片
      const hasImages = Array.from(files).some(file => isImageFile(file));
      if (hasImages) {
        showToast('当前模型不支持图片上传', 'error');
        return;
      }
    }
    
    // 检查文件类型
    const supportedFiles = Array.from(files).filter(file => isSupportedFileType(file));
    if (supportedFiles.length === 0) {
      showToast('不支持的文件类型', 'error');
      return;
    }

    try {
      const processedFiles = await processFiles(files);
      setAttachments(prev => [...prev, ...processedFiles as FileAttachment[]]);
      showToast(`已添加 ${processedFiles.length} 个文件`, 'success');
    } catch (error) {
      console.error('File processing error:', error);
      showToast('文件处理失败', 'error');
    }
  };

  // 移除附件
  const removeAttachment = (attachment: FileAttachment) => {
    setAttachments(prev => prev.filter(a => a !== attachment));
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // 粘贴处理
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleFiles(e.clipboardData.files);
    }
  };

  const handleRegenerate = async () => {
    if (!currentSessionId || isGenerating) return;
    
    // 获取当前模型
    const currentModel = getCurrentModel();
    if (!currentModel) {
      showToast('请先配置模型', 'error');
      setIsSettingsOpen(true);
      return;
    }
    
    if (!currentModel.apiKey) {
      showToast('当前模型未配置 API Key', 'error');
      setIsSettingsOpen(true);
      return;
    }

    // 获取最后一条用户消息
    const lastUserMessage = getLastUserMessage(currentSessionId);
    if (!lastUserMessage) {
      showToast('没有找到可重新生成的对话', 'error');
      return;
    }

    // 删除最后一条 AI 回复
    deleteLastMessage(currentSessionId);
    
    // 等待删除完成
    await new Promise(resolve => setTimeout(resolve, 10));

    // 使用相同的用户消息重新发送
    setError(null);
    addMessage(currentSessionId, { role: 'assistant', content: '' });
    
    setIsGenerating(true);

    try {
      const sessionId = currentSessionId;
      const freshSession = useChatStore.getState().sessions.find((s: Session) => s.id === sessionId);
      const messages = freshSession?.messages || [];
      const history = messages.map((m: Message) => ({ role: m.role, content: m.content }));

      // 获取解密后的 API Key（从当前模型）
      const { getDecryptedApiKey } = useSettingsStore.getState();
      const decryptedApiKey = await getDecryptedApiKey();

      // 使用当前模型的配置
      const modelSettings = {
        ...settings,
        apiKey: currentModel.apiKey,
        baseUrl: currentModel.baseUrl,
        model: currentModel.name,
        isMultimodal: currentModel.isMultimodal,
      };

      const generator = streamCompletion(history, modelSettings, enableDeepThinking, decryptedApiKey);
      
      let fullContent = '';
      let thinkingContent = '';
      
      const updatedSession = useChatStore.getState().sessions.find((s: Session) => s.id === sessionId);
      const assistantMessage = updatedSession?.messages[updatedSession.messages.length - 1];
      
      if (!assistantMessage) throw new Error("Failed to create assistant message");

      // 流式处理
      let hasReceivedContent = false;
      
      for await (const result of generator) {
        // 更新 thinking 内容
        if (result.thinkingContent !== undefined) {
          thinkingContent = result.thinkingContent;
        }
        
        // 更新 content 内容
        if (result.content !== undefined) {
          fullContent = result.content;
          hasReceivedContent = true;
        }
        
        // 只要有更新就刷新 UI
        updateMessage(sessionId!, assistantMessage.id, fullContent, thinkingContent);
        
        if (result.content) {
          scrollToBottom();
        }
      }
      
      if (!hasReceivedContent || !fullContent.trim()) {
        updateMessage(sessionId!, assistantMessage.id, 'AI 没有返回内容，请检查模型配置或重试。', thinkingContent);
      }
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        const freshSession = useChatStore.getState().sessions.find((s: Session) => s.id === currentSessionId);
        const assistantMessage = freshSession?.messages[freshSession.messages.length - 1];
        if (assistantMessage) {
          updateMessage(currentSessionId!, assistantMessage.id, `❌ 请求失败：${errorMessage}\n\n请检查：\n1. API Key 是否正确\n2. Base URL 是否正确\n3. 网络连接是否正常`, '');
        }
        showToast('重新生成失败，请重试', 'error');
      } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isGenerating) return;
    
    // 获取当前模型
    const currentModel = getCurrentModel();
    if (!currentModel) {
      showToast('请先配置模型', 'error');
      setIsSettingsOpen(true);
      return;
    }
    
    if (!currentModel.apiKey) {
      showToast('当前模型未配置 API Key', 'error');
      setIsSettingsOpen(true);
      return;
    }

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = createSession();
    }

    const userContent = input;
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    
    addMessage(sessionId!, { 
      role: 'user', 
      content: userContent,
      attachments: currentAttachments 
    });
    addMessage(sessionId!, { role: 'assistant', content: '' });
    
    setIsGenerating(true);

    try {
      // 构建消息历史，包含附件
      const history: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = messages.map((m: Message) => {
        if (m.role === 'user' && m.attachments && m.attachments.length > 0) {
          // 如果有附件，构建包含附件内容的消息文本
          let contentText = m.content || '';
          
          // 添加文本附件
          m.attachments.filter(a => ['text', 'pdf', 'word', 'excel', 'powerpoint'].includes(a.type)).forEach(att => {
            contentText += `\n\n[File: ${att.name}]\n${att.content}`;
          });
          
          return {
            role: m.role,
            content: contentText
          };
        }
        
        return { role: m.role, content: m.content };
      });
      
      // 添加当前消息的附件
      if (currentAttachments.length > 0) {
        let contentText = userContent || '';
        
        // 添加图片附件（如果模型支持多模态）
        const currentModel = getCurrentModel();
        if (currentModel?.modalities?.input?.includes('image')) {
          // 构建多模态消息格式
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          
          // 添加图片
          currentAttachments.filter(a => a.type === 'image').forEach(att => {
            console.log('Adding image:', att.name, 'Type:', att.type, 'Content length:', att.content.length);
            contentParts.push({
              type: 'image_url',
              image_url: { url: att.content } // Base64 data URL
            });
          });
          
          // 添加文本
          if (userContent) {
            contentParts.push({ type: 'text', text: userContent });
          }
          
          // 添加文本附件
          currentAttachments.filter(a => ['text', 'pdf', 'word', 'excel', 'powerpoint'].includes(a.type)).forEach(att => {
            contentParts.push({
              type: 'text',
              text: `[File: ${att.name}]\n${att.content}`
            });
          });
          
          console.log('Final content parts:', contentParts);
          history.push({ role: 'user', content: contentParts });
        } else {
          // 不支持多模态的模型，使用文本格式
          currentAttachments.filter(a => a.type === 'image').forEach(att => {
            contentText += `\n[Image: ${att.name}]`;
          });
          
          currentAttachments.filter(a => ['text', 'pdf', 'word', 'excel', 'powerpoint'].includes(a.type)).forEach(att => {
            contentText += `\n\n[File: ${att.name}]\n${att.content}`;
          });
          
          history.push({ role: 'user', content: contentText });
        }
      } else {
        history.push({ role: 'user', content: userContent });
      }

      // 获取解密后的 API Key（从当前模型）
      const { getDecryptedApiKey } = useSettingsStore.getState();
      const decryptedApiKey = await getDecryptedApiKey();

      // 使用当前模型的配置
      const modelSettings = {
        ...settings,
        apiKey: currentModel.apiKey, // 使用当前模型的 API Key
        baseUrl: currentModel.baseUrl,
        model: currentModel.name,
        isMultimodal: currentModel.isMultimodal,
      };

      const generator = streamCompletion(history, modelSettings, enableDeepThinking, decryptedApiKey);
      
      let fullContent = '';
      let thinkingContent = '';
      
      const freshSession = useChatStore.getState().sessions.find((s: Session) => s.id === sessionId);
      const assistantMessage = freshSession?.messages[freshSession.messages.length - 1];
      
      if (!assistantMessage) throw new Error("Failed to create assistant message");

      // 真正的流式处理 - 每次有数据就立即更新 UI
      let hasReceivedContent = false;
      
      for await (const result of generator) {
        // 更新 thinking 内容
        if (result.thinkingContent !== undefined) {
          thinkingContent = result.thinkingContent;
        }
        
        // 更新 content 内容
        if (result.content !== undefined) {
          fullContent = result.content;
          hasReceivedContent = true;
        }
        
        // 只要有更新就刷新 UI
        updateMessage(sessionId!, assistantMessage.id, fullContent, thinkingContent);
        
        if (result.content) {
          scrollToBottom();
        }
      }
      
      if (!hasReceivedContent || !fullContent.trim()) {
        updateMessage(sessionId!, assistantMessage.id, 'AI 没有返回内容，请检查模型配置或重试。', thinkingContent);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const freshSession = useChatStore.getState().sessions.find((s: Session) => s.id === sessionId);
      const assistantMessage = freshSession?.messages[freshSession.messages.length - 1];
      if (assistantMessage) {
        updateMessage(sessionId!, assistantMessage.id, `❌ 请求失败：${errorMessage}\n\n请检查：\n1. API Key 是否正确\n2. Base URL 是否正确\n3. 网络连接是否正常`, '');
      }
      showToast('发送失败，请重试', 'error');
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

  return (
    <main className="flex-1 flex flex-col bg-white h-full relative">
      {isSettingsOpen && <SettingsDialog onClose={() => setIsSettingsOpen(false)} />}
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl w-[400px] max-w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除这组对话吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirm) {
                    deleteMessagePair(deleteConfirm.sessionId, deleteConfirm.messageId);
                    setDeleteConfirm(null);
                    showToast('已删除对话', 'success');
                  }
                }}
                className="px-4 py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right",
          toast.type === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
      
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
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth relative"
      >
        {/* Scroll to Bottom Button */}
        {!autoScrollEnabled && messages.length > 0 && (
          <button
            onClick={() => {
              setAutoScrollEnabled(true);
              scrollToBottom();
            }}
            className="absolute bottom-4 right-4 md:right-8 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all z-10"
            title="滚动到底部"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
        {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Bot className="w-12 h-12 mb-4 opacity-20" />
                <p>开始一个新的对话...</p>
            </div>
        ) : (
            messages.map((msg: Message) => (
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
                    "px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm w-full",
                    msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-sm" 
                    : "bg-gray-50 text-gray-900 border border-gray-200 rounded-tl-sm"
                )}>
                    {/* Thinking Content Section */}
                    {msg.role === 'assistant' && msg.thinkingContent && (
                      <ThinkingContent 
                        content={msg.thinkingContent} 
                        isComplete={!isGenerating} 
                      />
                    )}
                    
                    {/* Attachments Section */}
                    {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-3">
                        <FilePreviewList attachments={msg.attachments} />
                      </div>
                    )}
                    
                    {/* Main Content */}
                    {msg.role === 'assistant' && isGenerating && msg.content === '' ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI 正在思考...</span>
                      </div>
                    ) : msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none break-words text-gray-900">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            code: ({...props}) => <code className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />,
                            pre: ({...props}) => <pre className="bg-gray-50 text-gray-900 border border-gray-200 p-4 rounded-lg my-2 overflow-x-auto" {...props} />
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                </div>
                
                <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-xs text-gray-500">
                        {formatDistanceToNow(msg.timestamp, { addSuffix: true, locale: zhCN })}
                    </span>
                    <div className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                        <button 
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded" 
                            title="复制"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              showToast('已复制', 'success');
                            }}
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        {msg.role === 'assistant' && (
                            <>
                              <button 
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" 
                                title="重新生成"
                                onClick={() => {
                                  handleRegenerate();
                                }}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" 
                                title="删除此对话"
                                onClick={() => {
                                  setDeleteConfirm({ sessionId: currentSessionId!, messageId: msg.id });
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
      <div 
        className={cn(
          "shrink-0 p-4 md:p-6 bg-white border-t border-gray-100 relative",
          isDragging && "bg-blue-50 border-blue-300"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {attachments.length > 0 && (
          <div className="max-w-4xl mx-auto mb-3">
            <FilePreviewList 
              attachments={attachments} 
              onRemove={removeAttachment} 
            />
          </div>
        )}
        
        <div className="max-w-4xl mx-auto relative">
            <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all flex">
                <button 
                    onClick={handleFileClick}
                    className="p-3 text-gray-500 hover:bg-gray-100 rounded-l-xl transition-colors" 
                    title="上传文件"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="输入你的问题，按回车发送..."
                    className="flex-1 min-h-[50px] max-h-[200px] py-3 pl-2 pr-2 resize-none outline-none text-sm md:text-base rounded-r-xl bg-transparent border-0 focus:ring-0"
                    rows={1}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                />
                
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFiles(e.target.files);
                      }
                      e.target.value = ''; // Reset input
                    }}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.gif,.txt,.md,.csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
                
                <div className="absolute right-2 bottom-2">
                    <button 
                        onClick={handleSend}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            (input.trim() || attachments.length > 0) && !isGenerating
                                ? "bg-blue-600 text-white hover:bg-blue-700" 
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        )}
                        disabled={(!input.trim() && attachments.length === 0) || isGenerating}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEnableDeepThinking(!enableDeepThinking)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        enableDeepThinking
                          ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                      title="深度思考模式"
                    >
                      <Sparkles className={cn("w-3.5 h-3.5", enableDeepThinking && "animate-pulse")} />
                      <span>深度思考</span>
                    </button>
                    
                    <div className="h-5 w-px bg-gray-200 mx-1" />
                    
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" 
                      title="设置"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                    <div className="h-5 w-px bg-gray-200 mx-1" />
                    
                    {/* 模型选择器 */}
                    <div className="relative">
                      <button
                        onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm text-gray-700 hover:bg-gray-100"
                        title="切换模型"
                      >
                        <span className="font-medium">{currentModel?.name || settings.model}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isModelSelectorOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setIsModelSelectorOpen(false)}
                          />
                          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                            <div className="max-h-64 overflow-y-auto">
                              {models?.map((model: ModelConfig) => (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    setCurrentModel(model.id);
                                    setIsModelSelectorOpen(false);
                                    showToast(`已切换到 ${model.name}`, 'success');
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between border-b border-gray-100 last:border-b-0",
                                    currentModel?.id === model.id && "bg-blue-50 text-blue-700"
                                  )}
                                >
                                  <div>
                                    <div className="font-medium">{model.name}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{model.platform}</div>
                                    {model.isMultimodal && (
                                      <div className="text-xs text-purple-600 mt-0.5">支持多模态</div>
                                    )}
                                  </div>
                                  {currentModel?.id === model.id && (
                                    <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                                  )}
                                </button>
                              ))}
                            </div>
                            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
                              <button
                                onClick={() => {
                                  setIsModelSelectorOpen(false);
                                  setIsSettingsOpen(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              >
                                管理模型 →
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  按 Enter 发送，Shift+Enter 换行
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}
