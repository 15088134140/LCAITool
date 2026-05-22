/**
 * 对话模式 API
 */

import { api } from '../client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  session_id: string;
  messages: ChatMessage[];
}

export const chatApi = {
  /**
   * 创建新的对话会话
   */
  createSession: async (toolId: string): Promise<ChatSession> => {
    return api.post<ChatSession>('/chat/sessions', { tool_id: toolId });
  },

  /**
   * 发送消息
   */
  sendMessage: async (sessionId: string, content: string): Promise<{ messages: ChatMessage[] }> => {
    return api.post<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`, { content });
  },

  /**
   * 获取消息历史
   */
  getMessages: async (sessionId: string): Promise<{ messages: ChatMessage[] }> => {
    return api.get<{ messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
  },
};

export default chatApi;
