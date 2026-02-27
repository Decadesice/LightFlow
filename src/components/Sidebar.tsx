import { Plus, MessageSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/useChatStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { sessions, currentSessionId, createSession, selectSession, deleteSession } = useChatStore();

  const handleCreateSession = () => {
    createSession();
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleSelectSession = (id: string) => {
    selectSession(id);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-[280px] bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 md:translate-x-0 md:static md:w-1/4 lg:w-1/5",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
          <span className="font-semibold text-lg text-gray-800">LightFlow</span>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors",
                session.id === currentSessionId ? "bg-gray-200" : ""
              )}
            >
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{session.title || '新对话'}</div>
                <div className="text-xs text-gray-500">
                  {formatDistanceToNow(session.updatedAt, { addSuffix: true, locale: zhCN })}
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded text-gray-500 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无对话
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <button 
            onClick={handleCreateSession}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>新对话</span>
          </button>
        </div>
      </aside>
    </>
  );
}
