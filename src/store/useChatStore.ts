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
  updateMessage: (sessionId: string, messageId: string, content: string, thinkingContent?: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteMessagePair: (sessionId: string, messageId: string) => void;
  deleteLastMessage: (sessionId: string) => void;
  getLastUserMessage: (sessionId: string) => Message | null;
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

      updateMessage: (sessionId, messageId, content, thinkingContent) => {
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const session = state.sessions[sessionIndex];
          const msgIndex = session.messages.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return state;

          const updatedMessages = [...session.messages];
          const updatedMessage = { 
            ...updatedMessages[msgIndex], 
            content,
            ...(thinkingContent !== undefined && { thinkingContent })
          };
          updatedMessages[msgIndex] = updatedMessage;

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
      },

      deleteMessagePair: (sessionId, messageId) => {
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const session = state.sessions[sessionIndex];
          const msgIndex = session.messages.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return state;

          const message = session.messages[msgIndex];
          let messagesToDelete = [messageId];

          // 找到配对的消息
          if (message.role === 'user') {
            // 如果是用户消息，删除它和下一条 AI 消息
            const nextMessage = session.messages[msgIndex + 1];
            if (nextMessage && nextMessage.role === 'assistant') {
              messagesToDelete.push(nextMessage.id);
            }
          } else if (message.role === 'assistant') {
            // 如果是 AI 消息，删除它和上一条用户消息
            const prevMessage = session.messages[msgIndex - 1];
            if (prevMessage && prevMessage.role === 'user') {
              messagesToDelete = [prevMessage.id, messageId];
            }
          }

          // 删除配对的消息
          const updatedMessages = session.messages.filter(
            (m) => !messagesToDelete.includes(m.id)
          );

          const updatedSession = {
            ...session,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };

          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = updatedSession;

          return { sessions: newSessions };
        });
      },

      deleteLastMessage: (sessionId) => {
        set((state) => {
          const sessionIndex = state.sessions.findIndex((s) => s.id === sessionId);
          if (sessionIndex === -1) return state;

          const session = state.sessions[sessionIndex];
          if (session.messages.length === 0) return state;

          // 删除最后一条消息
          const updatedMessages = session.messages.slice(0, -1);

          const updatedSession = {
            ...session,
            messages: updatedMessages,
            updatedAt: Date.now(),
          };

          const newSessions = [...state.sessions];
          newSessions[sessionIndex] = updatedSession;

          return { sessions: newSessions };
        });
      },

      getLastUserMessage: (sessionId: string): Message | null => {
        const state = useChatStore.getState();
        const session = state.sessions.find((s: Session) => s.id === sessionId);
        if (!session) return null;

        // 从后往前找第一条用户消息
        for (let i = session.messages.length - 1; i >= 0; i--) {
          if (session.messages[i].role === 'user') {
            return session.messages[i];
          }
        }
        return null;
      },
    }),
    {
      name: 'lightflow-chat-storage',
    }
  )
);
