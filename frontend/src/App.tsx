import React, { useState, useEffect } from 'react';
import Chat from './components/Chat';
import ConnectModal from './components/ConnectModal';
import { apiService } from './services/api';
import { DataSource, Integration, ChatMessage } from './types';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [integrationsData, historyData] = await Promise.all([
          apiService.getIntegrations(),
          apiService.getChatHistory(),
        ]);
        setIntegrations(integrationsData);
        setChatHistory(historyData.messages || []);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const handleConnect = async (dataSource: DataSource) => {
    setIsConnecting(true);
    try {
      const newIntegration = await apiService.saveIntegration(dataSource);
      setIntegrations(prev => [...prev, newIntegration]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error connecting data source:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (dataSource: DataSource) => {
    setIsConnecting(true);
    try {
      await apiService.removeIntegration(dataSource);
      setIntegrations(prev => prev.filter(integration => integration.dataSource !== dataSource));
    } catch (error) {
      console.error('Error disconnecting data source:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNewMessage = (message: ChatMessage) => {
    setChatHistory(prev => [...prev, message]);
  };

  const handleClearChat = async () => {
    try {
      await apiService.clearChatHistory();
      setChatHistory([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">AI Assistant</h1>
          <div className="flex items-center space-x-4">
            {integrations.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{integrations.length} source{integrations.length !== 1 ? 's' : ''} connected</span>
              </div>
            )}
            <button
              onClick={handleClearChat}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Clear Chat
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full h-full overflow-hidden">
        <div className="h-[calc(100vh-80px)]">
          <Chat chatHistory={chatHistory} onNewMessage={handleNewMessage} />
        </div>
      </main>

      <ConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isLoading={isConnecting}
        connectedIntegrations={integrations}
      />
    </div>
  );
}

export default App;
