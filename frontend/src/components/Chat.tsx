import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { apiService } from '../services/api';
import { ResponseType, StreamResponse, ChatMessage, StatusMessage } from '../types';

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
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [hasServerError, setHasServerError] = useState<boolean>(false);
  const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentResponseRef = useRef<string>('');
  const sentMessageRef = useRef<string>('');
  const messageSentTimeRef = useRef<number>(0);
  const previousStatusLengthRef = useRef<number>(0);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, currentResponse, statusMessages]);

  const parseISO = (s: string) => new Date(s.replace(/(\.\d{3})\d+/, '$1'));

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  const StatusDisplay: React.FC<{ statusMessage: StatusMessage; isNew: boolean }> = ({ statusMessage, isNew }) => {
    const shouldAnimate = isNew && !animatedMessageIds.has(statusMessage.id);
    if (shouldAnimate) {
      setTimeout(() => {
        setAnimatedMessageIds(prev => new Set(prev).add(statusMessage.id));
      }, 0);
    }

    return (
      <div 
        className={`text-gray-600 text-sm ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
      >
        <div className="flex items-center space-x-1">
          <span>{statusMessage.content}</span>
          {statusMessage.timeTaken !== undefined && (
            <span className="text-gray-400">
              {(statusMessage.timeTaken / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>
    );
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
    setStatusMessages([]);
    messageSentTimeRef.current = Date.now();
    setHasServerError(false);
    setAnimatedMessageIds(new Set());
    previousStatusLengthRef.current = 0;

    try {
      const eventSource = apiService.createChatStream(messageToSend);
      
      eventSource.onmessage = (event) => {
        try {
          const data: StreamResponse = JSON.parse(event.data);
          switch (data.responseType) {
            case ResponseType.LLM_RESPONSE:
              if (!hasServerError) {
                currentResponseRef.current += data.content || '';
                setCurrentResponse(currentResponseRef.current);
                scrollToBottom();
              }
              break;
              
            case ResponseType.AGENT_STATUS:
            case ResponseType.AGENT_THINKING:
              if (!hasServerError) {
                const content = data.content || '';
                const serverTimestamp = parseISO(data.timestamp).getTime();
                let timeTaken: number;
                if (statusMessages.length === 0) {
                  timeTaken = serverTimestamp - messageSentTimeRef.current;
                } else {
                  const lastMessage = statusMessages[statusMessages.length - 1];
                  timeTaken = serverTimestamp - lastMessage.timestamp;
                }
                
                const statusMessage: StatusMessage = {
                  id: `${messageId}-${statusMessages.length}`,
                  type: data.responseType as ResponseType.AGENT_STATUS | ResponseType.AGENT_THINKING,
                  content,
                  timestamp: serverTimestamp,
                  timeTaken
                };
                
                setStatusMessages(prev => [...prev, statusMessage]);
                scrollToBottom();
              }
              break;
              
            case ResponseType.SERVER_ERROR:
              const errorContent = data.content || 'Server Error';
              const errorTimestamp = parseISO(data.timestamp).getTime();
              let errorTimeTaken: number;
              if (statusMessages.length === 0) {
                errorTimeTaken = errorTimestamp - messageSentTimeRef.current;
              } else {
                const lastMessage = statusMessages[statusMessages.length - 1];
                errorTimeTaken = errorTimestamp - lastMessage.timestamp;
              }
              
              const errorMessage: StatusMessage = {
                id: `${messageId}-error`,
                type: ResponseType.SERVER_ERROR,
                content: errorContent,
                timestamp: errorTimestamp,
                timeTaken: errorTimeTaken
              };
              
              setStatusMessages(prev => [...prev, errorMessage]);
              setHasServerError(true);
              scrollToBottom();
              break;
              
            case ResponseType.END_OF_STREAM:
              eventSource.close();
              const finalResponse = currentResponseRef.current;
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
              setStatusMessages([]);
              setHasServerError(false);
              setAnimatedMessageIds(new Set());
              previousStatusLengthRef.current = 0;
              currentResponseRef.current = '';
              sentMessageRef.current = '';
              break;
            default:
              break;
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
        setStatusMessages([]);
        setHasServerError(false);
        setAnimatedMessageIds(new Set());
        previousStatusLengthRef.current = 0;
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
      setStatusMessages([]);
      setHasServerError(false);
      setAnimatedMessageIds(new Set());
      previousStatusLengthRef.current = 0;
      currentResponseRef.current = '';
      sentMessageRef.current = '';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {chatHistory.length === 0 && !isStreaming ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
          <div className="text-center space-y-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Welcome to Adaptive Marketing AI</h2>
            <p className="text-gray-600 max-w-2xl text-sm sm:text-base">
              I'm your adaptive marketing engine that connects to multiple platforms to generate campaign queries and answer natural language questions across channels.
            </p>
          </div>
          <div className="w-full max-w-4xl flex-1 min-h-0 overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 text-center">Try these campaign suggestions:</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4">
              {promptSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 shadow-sm"
                >
                  <span className="text-gray-700 text-sm sm:text-base">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-4 sm:space-y-6">
        
        {chatHistory.map((chat) => (
          <div key={chat.id} className="space-y-3 sm:space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-3xl bg-blue-500 text-white p-2 sm:p-3 rounded-lg break-words overflow-hidden text-sm sm:text-base">
                {chat.message}
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="max-w-[90%] sm:max-w-3xl bg-gray-100 p-2 sm:p-3 rounded-lg prose prose-sm break-words overflow-hidden">
                <ReactMarkdown 
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isInline = !className || !className.includes('language-');
                      if (isInline) {
                        return <code className="bg-gray-200 px-1 py-0.5 rounded text-xs sm:text-sm break-all" {...props}>{children}</code>
                      }
                      return <code className="break-all whitespace-pre-wrap text-xs sm:text-sm" {...props}>{children}</code>
                    },
                    pre: ({ children }) => <div className="bg-gray-800 text-white p-2 sm:p-3 rounded overflow-x-auto text-xs sm:text-sm">{children}</div>
                  }}
                >
                  {chat.response}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {isStreaming && currentMessageId && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-3xl bg-blue-500 text-white p-2 sm:p-3 rounded-lg break-words overflow-hidden text-sm sm:text-base">
                {sentMessage}
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="max-w-[90%] sm:max-w-3xl">
                {statusMessages.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {statusMessages.map((statusMessage, index) => {
                      const isNew = index >= previousStatusLengthRef.current;
                      if (index === statusMessages.length - 1) {
                        previousStatusLengthRef.current = statusMessages.length;
                      }
                      return (
                        <StatusDisplay key={statusMessage.id} statusMessage={statusMessage} isNew={isNew} />
                      );
                    })}
                  </div>
                )}

                {currentResponse && (
                  <div className="prose prose-sm max-w-none break-words overflow-hidden">
                    <ReactMarkdown
                      components={{
                        code: ({ className, children, ...props }) => {
                          const isInline = !className || !className.includes('language-');
                          if (isInline) {
                            return <code className="bg-gray-200 px-1 py-0.5 rounded text-xs sm:text-sm break-all" {...props}>{children}</code>
                          }
                          return <code className="break-all whitespace-pre-wrap text-xs sm:text-sm" {...props}>{children}</code>
                        },
                        pre: ({ children }) => <div className="bg-gray-800 text-white p-2 sm:p-3 rounded overflow-x-auto text-xs sm:text-sm">{children}</div>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gray-50">{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-gray-50">{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100">
                            {children}
                          </td>
                        )
                      }}
                    >
                      {currentResponse}
                    </ReactMarkdown>
                    <span className="animate-pulse">▊</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="flex-shrink-0 border-t bg-white p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask me anything..."
            disabled={isStreaming}
            className="flex-1 p-2 sm:p-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || isStreaming}
            className="px-3 py-2 sm:px-6 sm:py-3 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isStreaming ? (
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Streaming...</span>
                <span className="sm:hidden">...</span>
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
