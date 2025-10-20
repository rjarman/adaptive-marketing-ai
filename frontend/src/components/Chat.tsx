import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';
import { ResponseType, StreamResponse, ChatMessage } from '../types';

interface ChatProps {
  chatHistory: ChatMessage[];
  onNewMessage: (message: ChatMessage) => void;
}

const Chat: React.FC<ChatProps> = ({ chatHistory, onNewMessage }) => {
  const [message, setMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentResponseRef = useRef<string>('');
  const sentMessageRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, currentResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isStreaming) return;

    const messageId = Date.now().toString();
    const messageToSend = message;
    setCurrentMessageId(messageId);
    setSentMessage(messageToSend);
    sentMessageRef.current = messageToSend;
    setIsStreaming(true);
    setCurrentResponse('');
    currentResponseRef.current = '';

    try {
      const eventSource = apiService.createChatStream(messageToSend);
      
      eventSource.onmessage = (event) => {
        try {
          const data: StreamResponse = JSON.parse(event.data);
          
          if (data.responseType === ResponseType.LLM_RESPONSE) {
            currentResponseRef.current += data.data;
            setCurrentResponse(currentResponseRef.current);
          } else if (data.responseType === ResponseType.END_OF_STREAM) {
            eventSource.close();
            
            const finalResponse = currentResponseRef.current + (data.data || '');
            const completeMessage: ChatMessage = {
              id: messageId,
              message: sentMessageRef.current,
              response: finalResponse,
              createdAt: new Date().toISOString(),
            };
            
            onNewMessage(completeMessage);
            
            setIsStreaming(false);
            setCurrentResponse('');
            setCurrentMessageId(null);
            setSentMessage('');
            currentResponseRef.current = '';
            sentMessageRef.current = '';
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        setIsStreaming(false);
        setCurrentResponse('');
        setCurrentMessageId(null);
        setSentMessage('');
        currentResponseRef.current = '';
        sentMessageRef.current = '';
      };

      setMessage('');
    } catch (error) {
      console.error('Error starting chat stream:', error);
      setIsStreaming(false);
      setCurrentResponse('');
      setCurrentMessageId(null);
      setSentMessage('');
      currentResponseRef.current = '';
      sentMessageRef.current = '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
        {chatHistory.map((chat) => (
          <div key={chat.id} className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-3xl bg-blue-500 text-white p-3 rounded-lg break-words overflow-hidden">
                {chat.message}
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="max-w-3xl bg-gray-100 p-3 rounded-lg prose prose-sm break-words overflow-hidden">
                <ReactMarkdown 
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isInline = !className || !className.includes('language-');
                      if (isInline) {
                        return <code className="bg-gray-200 px-1 py-0.5 rounded text-sm break-all" {...props}>{children}</code>
                      }
                      return <code className="break-all whitespace-pre-wrap" {...props}>{children}</code>
                    },
                    pre: ({ children }) => <div className="bg-gray-800 text-white p-3 rounded overflow-x-auto">{children}</div>
                  }}
                >
                  {chat.response}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isStreaming && currentMessageId && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <div className="max-w-3xl bg-blue-500 text-white p-3 rounded-lg break-words overflow-hidden">
                {sentMessage}
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="max-w-3xl bg-gray-100 p-3 rounded-lg prose prose-sm break-words overflow-hidden">
                <ReactMarkdown
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isInline = !className || !className.includes('language-');
                      if (isInline) {
                        return <code className="bg-gray-200 px-1 py-0.5 rounded text-sm break-all" {...props}>{children}</code>
                      }
                      return <code className="break-all whitespace-pre-wrap" {...props}>{children}</code>
                    },
                    pre: ({ children }) => <div className="bg-gray-800 text-white p-3 rounded overflow-x-auto">{children}</div>
                  }}
                >
                  {currentResponse}
                </ReactMarkdown>
                {currentResponse && <span className="animate-pulse">▊</span>}
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isStreaming}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || isStreaming}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Streaming...</span>
              </div>
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
