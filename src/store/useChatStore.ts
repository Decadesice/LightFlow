import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session, Message } from './types';
import { v4 as uuidv4 } from 'uuid';

interface ChatStore {
  sessions: Session[];
  currentSessionId: string | null;
  createSession: () => string;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      sessions: [],
      currentSessionId: null,

      createSession: () => {
        const newSession: Session = {
          id: uuidv4(),
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        }));
        return newSession.id;
      },

      deleteSession: (id) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          let newCurrentId = state.currentSessionId;
          if (state.currentSessionId === id) {
            newCurrentId = newSessions.length > 0 ? newSessions[0].id : null;
          }
          return { sessions: newSessions, currentSessionId: newCurrentId };
        });
      },

      selectSession: (id) => {
        set({ currentSessionId: id });
      },

      addMessage: (sessionId, message) => {
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const newMessage: Message = {
            id: uuidv4(),
            timestamp: Date.now(),
            ...message,
          };

          const updatedSession = {
            ...state.sessions[sessionIndex],
            messages: [...state.sessions[sessionIndex].messages, newMessage],
            updatedAt: Date.now(),
          };
          
          // Auto-update title for first user message
          if (updatedSession.messages.length === 1 && message.role === 'user') {
             updatedSession.title = message.content.slice(0, 20);
          }

          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = updatedSession;
          
          // Move to top
          newSessions.splice(sessionIndex, 1);
          newSessions.unshift(updatedSession);

          return { sessions: newSessions };
        });
      },

      updateMessage: (sessionId, messageId, content) => {
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const session = state.sessions[sessionIndex];
          const msgIndex = session.messages.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return state;

          const updatedMessages = [...session.messages];
          updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], content };

          const updatedSession = { ...session, messages: updatedMessages, updatedAt: Date.now() };
          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = updatedSession;

          return { sessions: newSessions };
        });
      },

      updateSessionTitle: (sessionId, title) => {
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;
          
          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = { ...newSessions[sessionIndex], title };
          return { sessions: newSessions };
        });
      }
    }),
    {
      name: 'lightflow-chat-storage',
    }
  )
);
