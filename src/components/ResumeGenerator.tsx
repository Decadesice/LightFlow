import { useState, useRef, useEffect } from 'react';
import { FileText, Edit, Eye, Download, Sparkles, Plus, FileUp, Printer } from 'lucide-react';
import { useResumeStore } from '@/store/useResumeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 生成简历导出的样式（一页纸优化版 - 超紧凑）
function getResumeStyle(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin-top: 0.6cm;
      margin-bottom: 0.6cm;
      margin-left: 0.8cm;
      margin-right: 0.8cm;
    }
    html, body {
      height: 100%;
      width: 100%;
    }
    body {
      font-family: "Microsoft YaHei", "微软雅黑", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 0.6cm 0.8cm;
      line-height: 1.4;
      color: #333;
      font-size: 10.5pt;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    h1, h2, h3, h4, h5, h6 {
      font-size: 12pt;
      color: #1a1a1a;
      margin-top: 8px;
      margin-bottom: 4px;
      font-weight: 600;
      line-height: 1.3;
    }
    h1 {
      font-size: 15pt;
      text-align: center;
      padding-bottom: 6px;
      margin-bottom: 8px;
      margin-top: 0;
      border-bottom: 1px solid #ddd;
    }
    h2 {
      border-left: 3px solid #3498db;
      padding-left: 8px;
      margin-top: 10px;
      margin-bottom: 6px;
    }
    p {
      margin: 4px 0;
      text-align: justify;
    }
    ul, ol {
      margin: 4px 0;
      padding-left: 20px;
    }
    li {
      margin: 2px 0;
      line-height: 1.4;
    }
    strong {
      font-weight: 600;
      color: #2c3e50;
    }
    em {
      font-style: italic;
      color: #555;
    }
    code {
      background-color: #f8f9fa;
      padding: 1px 4px;
      border-radius: 2px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace;
      font-size: 10pt;
      color: #e83e8c;
    }
    pre {
      background-color: #f8f9fa;
      padding: 8px;
      border-radius: 3px;
      overflow-x: auto;
      margin: 6px 0;
      border: 1px solid #e9ecef;
    }
    pre code {
      background: none;
      padding: 0;
      color: #333;
    }
    blockquote {
      border-left: 3px solid #3498db;
      padding-left: 12px;
      margin: 6px 0;
      color: #666;
      background-color: #f8f9fa;
      padding: 6px 10px;
      border-radius: 3px;
    }
    hr {
      border: none;
      border-top: 1px solid #e9ecef;
      margin: 8px 0;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    /* 打印优化 */
    @media print {
      body {
        margin: 0;
        padding: 0.6cm 0.8cm;
        width: 100%;
        min-height: auto;
      }
    }
  `;
}

// 简单的 Markdown 转 HTML 函数（避免 marked 的嵌套标签问题）
function simpleMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // 转义 HTML 特殊字符
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');

  // 标题
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');

  // 粗体和斜体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // 引用
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

  // 列表
  html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

  // 段落（简单处理：空行分隔的文本）
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // 清理多余的标签
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[1-4]>)/g, '$1');
  html = html.replace(/(<\/h[1-4]>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');

  return html;
}

// 生成 HTML 文档
function generateResumeHtml(content: string): string {
  const htmlContent = simpleMarkdownToHtml(content);
  const style = getResumeStyle();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>简历</title>
  <style>${style}</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}

export function ResumeGenerator() {
  const {
    templates,
    selectedTemplateId,
    draft,
    isGenerating,
    viewMode,
    selectTemplate,
    updateDraft,
    setGenerating,
    setViewMode,
    loadBuiltInTemplates,
  } = useResumeStore();

  const { settings, getCurrentModel } = useSettingsStore();
  const [instruction, setInstruction] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const printWindowRef = useRef<Window | null>(null);

  // 初始化加载内置模板
  useEffect(() => {
    loadBuiltInTemplates();
  }, []);

  // 处理生成/调整
  const handleGenerate = async () => {
    if (!draft || !instruction.trim()) return;

    const currentModel = getCurrentModel();
    if (!currentModel) {
      alert('请先配置模型');
      return;
    }

    if (!currentModel.apiKey) {
      alert('当前模型未配置 API Key');
      return;
    }

    setGenerating(true);

    try {
      // 构建 Prompt - 强烈强调一页纸限制
      const systemPrompt = '你是一个专业的简历优化助手。请根据用户的指令，帮助优化或生成简历内容。要求：1. 内容必须严格控制在一页A4纸内；2. 极度精炼，删除所有冗余描述；3. 每段话不超过2行；4. 用短句、关键词表达；5. 突出核心技能和量化成果；6. 避免使用长句和修饰性词语。';

      const userPrompt = `当前简历内容：
${draft.content}

调整指令：
${instruction}

请根据指令优化简历内容，务必极度精简，确保能严格控制在一页A4纸内。删除所有不必要的修饰词，用最简短的语言表达。直接返回优化后的完整简历内容（Markdown 格式）：`;

      // 调用流式 API
      const history = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const { streamCompletion } = await import('@/lib/llm');
      const { getDecryptedApiKey } = useSettingsStore.getState();
      const decryptedApiKey = await getDecryptedApiKey();

      const modelSettings = {
        ...settings,
        apiKey: currentModel.apiKey,
        baseUrl: currentModel.baseUrl,
        model: currentModel.name,
      };

      const generator = streamCompletion(history, modelSettings, false, decryptedApiKey);

      // 累积响应内容
      let accumulatedContent = '';

      for await (const chunk of generator) {
        if (chunk.content) {
          accumulatedContent = chunk.content;
          // 实时更新草稿内容
          updateDraft({ content: accumulatedContent });
        }
      }

      // 生成完成，清空指令
      setInstruction('');
    } catch (error) {
      console.error('生成失败:', error);
      alert('生成失败：' + (error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  // 处理打印
  const handlePrint = () => {
    if (!draft) return;

    const html = generateResumeHtml(draft.content);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindowRef.current = printWindow;
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      // 等待内容加载后打印
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // 处理导出
  const handleExport = async (format: 'txt' | 'md' | 'html' | 'docx') => {
    if (!draft) return;

    try {
      // 使用浏览器原生的文件保存对话框
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `resume.${format === 'md' ? 'md' : format === 'html' ? 'html' : format === 'docx' ? 'docx' : 'txt'}`,
        types: [{
          description: `${format.toUpperCase()} 文件`,
          accept: {
            [format === 'docx' ? 'application/msword' : 'text/plain']: [`.${format === 'md' ? 'md' : format === 'html' ? 'html' : format === 'docx' ? 'docx' : 'txt'}`]
          }
        }]
      });

      const writable = await handle.createWritable();

      let content = draft.content;

      // 如果是 HTML 或 Word，需要将 Markdown 转换为 HTML
      if (format === 'html' || format === 'docx') {
        content = generateResumeHtml(draft.content);
      }

      await writable.write(content);
      await writable.close();
    } catch (error) {
      // 如果浏览器不支持 File System Access API，降级到传统方式
      console.log('File System Access API not supported, using fallback');
      fallbackExport(draft.content, format);
    }
  };

  // 降级导出方法（浏览器环境）
  const fallbackExport = (content: string, format: 'txt' | 'md' | 'html' | 'docx') => {
    let blobContent = content;
    let mimeType = 'text/plain';

    if (format === 'html' || format === 'docx') {
      blobContent = generateResumeHtml(content);
      mimeType = format === 'docx' ? 'application/msword' : 'text/html';
    } else if (format === 'md') {
      mimeType = 'text/markdown';
    }

    const blob = new Blob([blobContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume.${format === 'md' ? 'md' : format === 'html' ? 'html' : format === 'docx' ? 'docx' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full bg-white">
      {/* 左侧：模板选择区 */}
      <div className="w-64 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">简历模板</h2>
          <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all hover:shadow-sm',
                selectedTemplateId === template.id
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-center gap-2">
                <FileText className={cn('w-4 h-4 flex-shrink-0', selectedTemplateId === template.id ? 'text-blue-600' : 'text-gray-400')} />
                <div className="flex-1 min-w-0">
                  <div className={cn('text-sm font-medium truncate', selectedTemplateId === template.id ? 'text-blue-700' : 'text-gray-900')}>
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{template.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 提示卡片 */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            <strong>提示：</strong>选择模板后可在右侧输入 AI 指令来优化内容，建议保持内容精炼以符合一页纸要求。
          </p>
        </div>
      </div>

      {/* 中间：内容编辑/预览区 */}
      <div className="flex-1 flex flex-col">
        {/* 工具栏 */}
        <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('edit')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'edit'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Edit className="w-4 h-4" />
              编辑
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'preview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Eye className="w-4 h-4" />
              预览
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={handlePrint}
              disabled={!draft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              打印
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('md')}
              disabled={!draft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Markdown
            </button>
            <button
              onClick={() => handleExport('html')}
              disabled={!draft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              HTML
            </button>
            <button
              onClick={() => handleExport('docx')}
              disabled={!draft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileUp className="w-4 h-4" />
              Word
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {viewMode === 'edit' ? (
            <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
              <textarea
                ref={contentRef}
                value={draft?.content || ''}
                onChange={(e) => updateDraft({ content: e.target.value })}
                placeholder="请先选择左侧的简历模板"
                className="w-full h-[70vh] resize-none outline-none font-mono text-sm p-4"
              />
            </div>
          ) : (
            <div className="max-w-[210mm] mx-auto bg-white shadow-lg" style={{ minHeight: '297mm', padding: '0.6cm 0.8cm' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({node, ...props}) => <h1 style={{ fontSize: '15pt', textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '8px', fontWeight: 600, lineHeight: '1.3' }} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{ fontSize: '12pt', borderLeft: '3px solid #3498db', paddingLeft: '8px', marginTop: '10px', marginBottom: '6px', fontWeight: 600, lineHeight: '1.3' }} {...props} />,
                  h3: ({node, ...props}) => <h3 style={{ fontSize: '12pt', marginTop: '8px', marginBottom: '4px', fontWeight: 600, lineHeight: '1.3' }} {...props} />,
                  h4: ({node, ...props}) => <h4 style={{ fontSize: '12pt', marginTop: '8px', marginBottom: '4px', fontWeight: 600, lineHeight: '1.3' }} {...props} />,
                  ul: ({node, ...props}) => <ul style={{ margin: '4px 0', paddingLeft: '20px' }} {...props} />,
                  ol: ({node, ...props}) => <ol style={{ margin: '4px 0', paddingLeft: '20px' }} {...props} />,
                  li: ({node, ...props}) => <li style={{ margin: '2px 0', lineHeight: '1.4' }} {...props} />,
                  p: ({node, ...props}) => <p style={{ margin: '4px 0', textAlign: 'justify', lineHeight: '1.4' }} {...props} />,
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 600, color: '#2c3e50' }} {...props} />,
                  em: ({node, ...props}) => <em style={{ fontStyle: 'italic', color: '#555' }} {...props} />,
                }}
              >
                {draft?.content || ''}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：指令输入区 */}
      <div className="w-80 border-l border-gray-200 p-4 flex flex-col bg-gray-50">
        <h2 className="text-lg font-bold text-gray-900 mb-2">AI 优化</h2>
        <p className="text-xs text-gray-500 mb-4">输入指令让 AI 帮你优化简历（自动控制在一页纸内）</p>

        <div className="flex-1 flex flex-col gap-3">
          <div className="flex-1">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="输入调整指令，例如：
- 添加 3 年前端开发经验
- 优化项目经验描述，突出成果
- 精简内容到一页纸
- 强调 React 和 TypeScript 技能"
              className="w-full h-full resize-none p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
            />
          </div>

          {/* 快捷指令 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setInstruction('精简内容，控制在一页纸内')}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
            >
              精简到一页
            </button>
            <button
              onClick={() => setInstruction('优化语言表达，更专业')}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
            >
              专业润色
            </button>
            <button
              onClick={() => setInstruction('突出工作成果，用数据说话')}
              className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700 transition-colors"
            >
              量化成果
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !draft || !instruction.trim()}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
              isGenerating || !draft || !instruction.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            )}
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                生成/调整
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
