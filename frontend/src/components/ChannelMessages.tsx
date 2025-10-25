import React from 'react';
import { ChannelMessage } from '../types';

interface ChannelMessagesProps {
  channelMessages?: ChannelMessage[];
  isGenerating?: boolean;
  chatId?: string;
  onDownload?: (channel: string) => void;
}

const channelConfig = {
  email: {
    name: 'Email',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    gradient: 'from-blue-500 to-blue-600',
    hoverGradient: 'hover:from-blue-600 hover:to-blue-700',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600'
  },
  sms: {
    name: 'SMS',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    gradient: 'from-green-500 to-green-600',
    hoverGradient: 'hover:from-green-600 hover:to-green-700',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-600'
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    ),
    gradient: 'from-emerald-500 to-emerald-600',
    hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-600'
  },
  ads: {
    name: 'Ads',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    gradient: 'from-purple-500 to-purple-600',
    hoverGradient: 'hover:from-purple-600 hover:to-purple-700',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600'
  }
};

const ChannelMessages: React.FC<ChannelMessagesProps> = ({
  channelMessages,
  isGenerating,
  chatId,
  onDownload
}) => {
  if (isGenerating) {
    return (
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          <p className="text-sm text-gray-600 font-medium">Generating messages for marketing channels...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-lg p-4 animate-pulse"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gray-300 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
              <div className="h-9 bg-gray-300 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!channelMessages || channelMessages.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center space-x-2 mb-3">
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-sm text-gray-700 font-semibold">Marketing Campaign Messages</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {channelMessages.map((channelMsg) => {
          const config = channelConfig[channelMsg.channel as keyof typeof channelConfig];
          if (!config) return null;

          return (
            <button
              key={channelMsg.channel}
              onClick={() => onDownload && chatId && onDownload(channelMsg.channel)}
              className={`group relative bg-gradient-to-br ${config.gradient} rounded-lg p-4 text-white transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${config.hoverGradient}`}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  {config.icon}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-base">{config.name}</h4>
                  <p className="text-xs text-white/80">
                    {channelMsg.total > 0 ? `${channelMsg.total} ${channelMsg.total === 1 ? 'message' : 'messages'}` : 'Available'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white/20 rounded-lg px-3 py-2 group-hover:bg-white/30 transition-colors duration-300">
                <span className="text-sm font-medium">Download JSON</span>
                <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelMessages;
