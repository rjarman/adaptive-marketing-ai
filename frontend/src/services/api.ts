import axios from 'axios';
import { config } from '../config';
import { DataSource, Integration, ChatHistoryResponse } from '../types';

const api = axios.create({
  baseURL: config.backendHost,
});

export const apiService = {
  saveIntegration: async (dataSource: DataSource): Promise<Integration> => {
    const response = await api.post('/api/integrations', { dataSource });
    return response.data;
  },

  getIntegrations: async (): Promise<Integration[]> => {
    const response = await api.get('/api/integrations');
    return response.data;
  },

  removeIntegration: async (dataSource: DataSource): Promise<void> => {
    await api.delete(`/api/integrations/${dataSource}`);
  },

  getChatHistory: async (): Promise<ChatHistoryResponse> => {
    const response = await api.get('/api/chat/history');
    return response.data;
  },

  clearChatHistory: async (): Promise<void> => {
    await api.delete('/api/chat/history');
  },

  createChatStream: (message: string): EventSource => {
    const encodedMessage = encodeURIComponent(message);
    return new EventSource(`${config.backendHost}/api/chat/stream?message=${encodedMessage}`);
  },

  downloadChannelMessages: async (chatId: string, channel: string): Promise<void> => {
    const response = await api.get(`/api/chat/channel-messages/${chatId}/${channel}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${channel}_messages_${chatId}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
