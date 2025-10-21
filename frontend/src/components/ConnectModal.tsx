import React from 'react';
import { DataSource, Integration } from '../types';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (dataSource: DataSource) => void;
  onDisconnect: (dataSource: DataSource) => void;
  isLoading: boolean;
  connectedIntegrations: Integration[];
}

const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose, onConnect, onDisconnect, isLoading, connectedIntegrations }) => {
  if (!isOpen) return null;

  const dataSourceOptions = [
    { value: DataSource.WEBSITE, label: 'Website', icon: '🌐' },
    { value: DataSource.SHOPIFY, label: 'Shopify', icon: '🛍️' },
    { value: DataSource.CRMS, label: 'CRMs', icon: '📊' },
  ];

  const isDataSourceConnected = (dataSource: DataSource) => {
    return connectedIntegrations.some(integration => integration.dataSource === dataSource);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Connect Data Source</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          {dataSourceOptions.map((option) => {
            const isConnected = isDataSourceConnected(option.value);
            const isDisabled = isLoading;
            
            const handleClick = () => {
              if (isConnected) {
                onDisconnect(option.value);
              } else {
                onConnect(option.value);
              }
            };
            
            return (
              <button
                key={option.value}
                onClick={handleClick}
                disabled={isDisabled}
                className={`w-full p-4 border rounded-lg transition-colors disabled:cursor-not-allowed ${
                  isConnected 
                    ? 'border-green-200 bg-green-50 hover:border-red-300 hover:bg-red-50' 
                    : isLoading 
                      ? 'border-gray-200 bg-gray-50 opacity-50'
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex flex-col items-start">
                      <span className={`font-medium ${isConnected ? 'text-green-800' : 'text-gray-800'}`}>
                        {option.label}
                      </span>
                      {isConnected && (
                        <span className="text-xs text-gray-500 mt-0.5">Click to disconnect</span>
                      )}
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium hidden sm:inline">Connected</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 hidden sm:inline flex-shrink-0">Click to connect</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Connecting...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectModal;
