import React, { useState, useEffect } from 'react';
import Chat from './components/Chat';
import ConnectModal from './components/ConnectModal';
import { apiService } from './services/api';
import { DataSource, Integration, ChatMessage } from './types';

const packageJson = require('../package.json');
const VERSION = packageJson.version;

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [integrationsData, historyData] = await Promise.all([
          apiService.getIntegrations(),
          apiService.getChatHistory(),
        ]);
        setIntegrations(integrationsData);
        setChatHistory(historyData.messages || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-blue-800 bg-clip-text text-transparent">
                    Marketing AI
                  </h1>
                  <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 font-semibold rounded border border-blue-200/50">
                    v{VERSION}
                  </span>
                </div>
                <p className="text-xs text-gray-500 hidden sm:block">Adaptive Campaign Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {integrations.length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-green-700">
                    <span className="hidden sm:inline">{integrations.length} source{integrations.length !== 1 ? 's' : ''} connected</span>
                    <span className="sm:hidden">{integrations.length}</span>
                  </span>
                </div>
              )}
              <button
                onClick={handleClearChat}
                className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
              >
                <span className="hidden sm:inline">Clear Chat</span>
                <span className="sm:hidden">Clear</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Connect</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center animate-pulse">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl animate-ping opacity-20"></div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                  Loading Marketing AI
                </h2>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Chat chatHistory={chatHistory} onNewMessage={handleNewMessage} />
        )}
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
