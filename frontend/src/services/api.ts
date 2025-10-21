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
  }
};
