import { X, FileText, FileImage, FileSpreadsheet, FileVideo, FileCode, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileAttachment } from '@/store/types';

interface FilePreviewProps {
  attachment: FileAttachment;
  onRemove?: (attachment: FileAttachment) => void;
}

export function FilePreview({ attachment, onRemove }: FilePreviewProps) {
  // 获取文件图标
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'word':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
      case 'powerpoint':
        return <FileVideo className="w-5 h-5 text-orange-500" />;
      case 'text':
        return <FileCode className="w-5 h-5 text-gray-600" />;
      case 'file':
        return <Download className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Download className="w-5 h-5 text-gray-500" />;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 渲染文件预览
  const renderPreview = () => {
    if (attachment.type === 'image') {
      return (
        <div className="relative group">
          <img 
            src={attachment.content} 
            alt={attachment.name} 
            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white rounded-full p-1.5 shadow-lg">
              {getFileIcon(attachment.type)}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
          {getFileIcon(attachment.type)}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{attachment.name}</div>
            <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={cn(
      "relative group flex items-center gap-3 p-2 rounded-lg border bg-white shadow-sm transition-shadow",
      attachment.type === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200'
    )}>
      {renderPreview()}
      
      {onRemove && (
        <button
          onClick={() => onRemove(attachment)}
          className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {attachment.type === 'error' && (
        <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center rounded-lg">
          <X className="w-4 h-4 text-red-500" />
        </div>
      )}
    </div>
  );
}

interface FilePreviewListProps {
  attachments: FileAttachment[];
  onRemove?: (attachment: FileAttachment) => void;
}

export function FilePreviewList({ attachments, onRemove }: FilePreviewListProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((attachment, index) => (
        <div key={`${attachment.name}-${index}`} className="flex-shrink-0">
          <FilePreview attachment={attachment} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}