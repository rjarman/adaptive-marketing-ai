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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md mx-4 transform transition-all">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-blue-800 bg-clip-text text-transparent">
              Connect Data Source
            </h2>
            <p className="text-sm text-gray-500 mt-1">Integrate your marketing platforms</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                className={`group w-full p-4 sm:p-5 border-2 rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isConnected 
                    ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-red-300 hover:from-red-50 hover:to-pink-50 shadow-md' 
                    : isLoading 
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:shadow-lg hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-transform duration-200 ${
                      isConnected 
                        ? 'bg-green-100 group-hover:bg-red-100' 
                        : 'bg-gray-100 group-hover:scale-110'
                    }`}>
                      {option.icon}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`font-semibold text-base ${isConnected ? 'text-green-800' : 'text-gray-800'}`}>
                        {option.label}
                      </span>
                      {isConnected && (
                        <span className="text-xs text-gray-500 mt-0.5">Click to disconnect</span>
                      )}
                    </div>
                  </div>
                  {isConnected ? (
                    <div className="flex items-center space-x-2 flex-shrink-0 bg-green-100 px-3 py-1.5 rounded-lg">
                      <div className="relative">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <span className="text-xs text-green-700 font-semibold hidden sm:inline">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-gray-400 group-hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="mt-6 flex items-center justify-center space-x-3 bg-blue-50 py-3 rounded-lg border border-blue-100">
            <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-blue-700">Processing connection...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectModal;
