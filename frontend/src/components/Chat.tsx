import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';
import { ResponseType, StreamResponse, ChatMessage } from '../types';

interface ChatProps {
  chatHistory: ChatMessage[];
  onNewMessage: (message: ChatMessage) => void;
}

const promptSuggestions = [
  "Create a campaign for customers who added an item to their cart but didn't buy in the last 7 days",
  "Make a 7-day re-engagement campaign for abandoned carts",
  "Generate a welcome email series for new subscribers",
  "Create a personalized product recommendation campaign",
  "Design a win-back campaign for inactive customers",
  "Build a seasonal promotion campaign for high-value customers"
];

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

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

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
        {chatHistory.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-gray-800">Welcome to Adaptive Marketing AI</h2>
              <p className="text-gray-600 max-w-2xl">
                I'm your adaptive marketing engine that connects to multiple platforms to generate campaign queries and answer natural language questions across channels.
              </p>
            </div>
            <div className="w-full max-w-4xl">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Try these campaign suggestions:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {promptSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 shadow-sm"
                  >
                    <span className="text-gray-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
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
