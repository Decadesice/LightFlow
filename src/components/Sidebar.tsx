import { Plus, MessageSquare, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/useChatStore';
import type { Session } from '@/store/types';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { sessions, currentSessionId, createSession, selectSession, deleteSession, updateSessionTitle } = useChatStore();
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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

  const handleContextMenu = (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const session = sessions.find((s: Session) => s.id === sessionId);
    setContextMenu({ sessionId, x: e.clientX, y: e.clientY });
    if (session) {
      setEditTitle(session.title);
    }
  };

  const handleRename = () => {
    if (contextMenu && editTitle.trim()) {
      updateSessionTitle(contextMenu.sessionId, editTitle.trim());
    }
    setContextMenu(null);
    setEditingId(null);
  };

  const handleDelete = (sessionId: string) => {
    deleteSession(sessionId);
    setContextMenu(null);
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

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px] animate-in fade-in zoom-in-95"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              setEditingId(contextMenu.sessionId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>重命名</span>
          </button>
          <button
            onClick={() => handleDelete(contextMenu.sessionId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除</span>
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setContextMenu(null)}
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
          {sessions.map((session: Session) => (
            <div 
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              onContextMenu={(e) => handleContextMenu(e, session.id)}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors",
                session.id === currentSessionId ? "bg-gray-200" : ""
              )}
            >
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                {editingId === session.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setContextMenu(null);
                      }
                    }}
                    className="w-full text-sm font-medium text-gray-900 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="text-sm font-medium text-gray-900 truncate">{session.title || '新对话'}</div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(session.updatedAt, { addSuffix: true, locale: zhCN })}
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded text-gray-500 transition-opacity"
                title="删除会话"
              >
                <Trash2 className="w-4 h-4" />
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
