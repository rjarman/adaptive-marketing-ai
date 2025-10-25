import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { apiService } from '../services/api';
import { ResponseType, StreamResponse, ChatMessage, StatusMessage, SourceData, ChannelMessage } from '../types';
import SourceCards from './SourceCards';
import ChannelMessages from './ChannelMessages';

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
  const [currentSources, setCurrentSources] = useState<SourceData[]>([]);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [serverMessageId, setServerMessageId] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState('');
  const [statusMessages, setStatusMessages] = useState<StatusMessage[]>([]);
  const [hasServerError, setHasServerError] = useState<boolean>(false);
  const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
  const [expandedSourceIndices, setExpandedSourceIndices] = useState<Set<number>>(new Set());
  const [historyExpandedIndices, setHistoryExpandedIndices] = useState<Map<string, Set<number>>>(new Map());
  const [isGeneratingChannels, setIsGeneratingChannels] = useState(false);
  const [currentChannelMessages, setCurrentChannelMessages] = useState<ChannelMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sourceCardsRef = useRef<HTMLDivElement>(null);
  const currentResponseRef = useRef<string>('');
  const currentSourcesRef = useRef<SourceData[]>([]);
  const sentMessageRef = useRef<string>('');
  const messageSentTimeRef = useRef<number>(0);
  const previousStatusLengthRef = useRef<number>(0);
  const hasServerErrorRef = useRef<boolean>(false);
  const currentChannelMessagesRef = useRef<ChannelMessage[]>([]);
  const serverMessageIdRef = useRef<string | null>(null);

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

  const handleDownloadChannelMessages = async (channel: string) => {
    const messageIdToUse = serverMessageIdRef.current || serverMessageId || currentMessageId;
    if (!messageIdToUse) return;
    try {
      await apiService.downloadChannelMessages(messageIdToUse, channel);
    } catch (error) {
      console.error('Error downloading channel messages:', error);
    }
  };

  const handleHistoryDownloadChannelMessages = async (chatId: string, channel: string) => {
    try {
      await apiService.downloadChannelMessages(chatId, channel);
    } catch (error) {
      console.error('Error downloading channel messages:', error);
    }
  };

  const handleReferenceClick = (index: number, messageId?: string) => {
    if (messageId) {
      console.log('Current history expanded indices:', historyExpandedIndices.get(messageId));
      setHistoryExpandedIndices(prev => {
        const newMap = new Map(prev);
        const messageIndices = newMap.get(messageId) || new Set<number>();
        const newSet = new Set(messageIndices);
        
        if (newSet.has(index)) {
          console.log('Removing index from set');
          newSet.delete(index);
        } else {
          console.log('Adding index to set');
          newSet.add(index);
        }
        console.log('New expanded indices for message:', newSet);
        newMap.set(messageId, newSet);
        return newMap;
      });
    } else {
      console.log('Current expanded indices:', expandedSourceIndices);
      setExpandedSourceIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          console.log('Removing index from set');
          newSet.delete(index);
        } else {
          console.log('Adding index to set');
          newSet.add(index);
        }
        console.log('New expanded indices:', newSet);
        return newSet;
      });
    }
    setTimeout(() => {
      if (sourceCardsRef.current) {
        sourceCardsRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 150);
  };
  const renderTextWithReferences = (text: string, sources: SourceData[], isInteractive: boolean = true, messageId?: string) => {
    if (!text || typeof text !== 'string') return text;
    
    const parts = text.split(/(\[\d+\])/g);
    return (
      <>
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const refNumber = match[1];
            const refIndex = parseInt(refNumber, 10) - 1;
            const hasSource = sources && sources.length > refIndex && refIndex >= 0;
            
            if (hasSource && isInteractive) {
              return (
                <button
                  key={`ref-${i}-${refNumber}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Reference button clicked:', refNumber, 'messageId:', messageId);
                    handleReferenceClick(refIndex, messageId);
                  }}
                  style={{ 
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 100
                  }}
                  className="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                  title={`Click to expand source ${refNumber}`}
                  type="button"
                >
                  {refNumber}
                </button>
              );
            } else if (hasSource) {
              return (
                <span
                  key={`ref-${i}-${refNumber}`}
                  className="inline-flex items-center px-2 py-0.5 mx-0.5 text-xs font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded shadow-sm"
                  title={`Source ${refNumber}`}
                >
                  {refNumber}
                </span>
              );
            }
          }
          return part ? <React.Fragment key={`text-${i}`}>{part}</React.Fragment> : null;
        })}
      </>
    );
  };

  const StatusDisplay: React.FC<{ statusMessage: StatusMessage; isNew: boolean }> = ({ statusMessage, isNew }) => {
    const shouldAnimate = isNew && !animatedMessageIds.has(statusMessage.id);
    if (shouldAnimate) {
      setTimeout(() => {
        setAnimatedMessageIds(prev => new Set(prev).add(statusMessage.id));
      }, 0);
    }

    const highlightText = (text: string) => {
      const keywords = [
        { pattern: /\b(SQL Agent|Query Generator|Validator|Manager|LLM)\b/gi, color: 'text-blue-600 font-semibold' },
        { pattern: /\b(analyzing|generating|retrieved|validated|completed)\b/gi, color: 'text-purple-600 font-medium' },
        { pattern: /\bconfidence:\s*0\.\d+\b/gi, color: 'text-green-600 font-semibold' },
        { pattern: /\b\d+\s*(records?|customers?|items?)\b/gi, color: 'text-orange-600 font-medium' },
        { pattern: /'[^']+'/g, color: 'text-gray-800 font-medium italic' },
      ];

      let parts: { text: string; className?: string }[] = [{ text }];

      keywords.forEach(({ pattern, color }) => {
        const newParts: { text: string; className?: string }[] = [];
        parts.forEach(part => {
          if (part.className) {
            newParts.push(part);
            return;
          }
          
          const matches = Array.from(part.text.matchAll(pattern));
          if (matches.length === 0) {
            newParts.push(part);
            return;
          }

          let lastIndex = 0;
          matches.forEach(match => {
            if (match.index !== undefined) {
              if (match.index > lastIndex) {
                newParts.push({ text: part.text.slice(lastIndex, match.index) });
              }
              newParts.push({ text: match[0], className: color });
              lastIndex = match.index + match[0].length;
            }
          });
          if (lastIndex < part.text.length) {
            newParts.push({ text: part.text.slice(lastIndex) });
          }
        });
        parts = newParts;
      });

      return parts;
    };

    const isError = statusMessage.type === ResponseType.SERVER_ERROR;
    const parts = isError ? [] : highlightText(statusMessage.content);

    if (isError) {
      return (
        <div 
          className={`flex items-start space-x-3 text-sm py-2 px-4 bg-red-50 border border-red-200 rounded-lg ${shouldAnimate ? 'animate-slide-up-fade' : ''}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-800 font-medium leading-relaxed">
              I apologize, but I encountered an issue while processing your request.
            </p>
            <p className="text-red-600 text-xs mt-1 leading-relaxed">
              {statusMessage.content || 'An unexpected error occurred. Please try again or rephrase your question.'}
            </p>
            {statusMessage.timeTaken !== undefined && (
              <span className="text-red-400 text-xs font-medium mt-1 inline-block">
                {(statusMessage.timeTaken / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`flex items-center space-x-2 text-sm py-1 ${shouldAnimate ? 'animate-slide-up-fade' : ''}`}
      >
        <div className="flex-shrink-0">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        <div className="flex-1 flex items-baseline space-x-2">
          <span className="text-gray-700 leading-relaxed">
            {parts.map((part, index) => (
              part.className ? (
                <span key={index} className={part.className}>{part.text}</span>
              ) : (
                <span key={index}>{part.text}</span>
              )
            ))}
          </span>
          {statusMessage.timeTaken !== undefined && (
            <span className="text-gray-400 text-xs font-medium whitespace-nowrap">
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
    setCurrentSources([]);
    currentSourcesRef.current = [];
    setStatusMessages([]);
    messageSentTimeRef.current = Date.now();
    setHasServerError(false);
    hasServerErrorRef.current = false;
    setAnimatedMessageIds(new Set());
    setExpandedSourceIndices(new Set());
    previousStatusLengthRef.current = 0;
    setIsGeneratingChannels(false);
    setCurrentChannelMessages([]);
    currentChannelMessagesRef.current = [];
    setServerMessageId(null);
    serverMessageIdRef.current = null;

    try {
      const eventSource = apiService.createChatStream(messageToSend);
      
      eventSource.onmessage = (event) => {
        try {
          const data: StreamResponse = JSON.parse(event.data);
          
          if (data.messageId && !serverMessageIdRef.current) {
            console.log('Captured server message ID:', data.messageId);
            console.log('Setting serverMessageIdRef.current to:', data.messageId);
            serverMessageIdRef.current = data.messageId;
            setServerMessageId(data.messageId);
          } else if (data.messageId) {
            console.log('SSE message with ID (already captured):', data.messageId);
          }
          
          switch (data.responseType) {
            case ResponseType.RETRIEVED_DATA:
              if (!hasServerError && data.data?.sources) {
                const sources: SourceData[] = data.data.sources;
                currentSourcesRef.current = sources;
                setCurrentSources(sources);
                scrollToBottom();
              }
              break;
              
            case ResponseType.LLM_RESPONSE:
              if (!hasServerError) {
                currentResponseRef.current += data.content || '';
                setCurrentResponse(currentResponseRef.current);
                if (currentResponseRef.current && statusMessages.length > 0) {
                  setStatusMessages([]);
                }
                scrollToBottom();
              }
              break;
              
            case ResponseType.GENERATING_CHANNEL_MESSAGE:
              if (!hasServerError) {
                setIsGeneratingChannels(true);
                scrollToBottom();
              }
              break;
              
            case ResponseType.CHANNEL_MESSAGE:
              if (!hasServerError && data.data) {
                console.log('CHANNEL_MESSAGE received:', data.data);
                setIsGeneratingChannels(false);
                
                if (data.data.channelMessages && Array.isArray(data.data.channelMessages)) {
                  console.log('Full channel messages data available:', data.data.channelMessages);
                  currentChannelMessagesRef.current = data.data.channelMessages;
                  setCurrentChannelMessages(data.data.channelMessages);
                } else if (data.data.channels && Array.isArray(data.data.channels)) {
                  console.log('Only channel names available, creating placeholders:', data.data.channels);
                  const placeholderChannelMessages: ChannelMessage[] = data.data.channels.map((channel: string) => ({
                    channel,
                    metadata: [],
                    total: 0
                  }));
                  
                  currentChannelMessagesRef.current = placeholderChannelMessages;
                  setCurrentChannelMessages(placeholderChannelMessages);
                  
                  const fetchRealChannelData = async () => {
                    const maxRetries = 5;
                    const retryDelay = 800;
                    
                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                      try {
                        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                        
                        const historyResponse = await apiService.getChatHistory();
                        if (historyResponse.messages && historyResponse.messages.length > 0) {
                          const latestMessage = historyResponse.messages[0];
                          if (latestMessage.channelMessages && 
                              latestMessage.channelMessages.length > 0 &&
                              latestMessage.channelMessages.some(cm => cm.total > 0)) {
                            console.log('Found real channel data:', latestMessage.channelMessages);
                            currentChannelMessagesRef.current = latestMessage.channelMessages;
                            setCurrentChannelMessages(latestMessage.channelMessages);
                            scrollToBottom();
                            return;
                          } else {
                            console.log(`Attempt ${attempt}: Data not ready yet, will retry...`);
                          }
                        }
                      } catch (error) {
                        console.error(`Attempt ${attempt} error:`, error);
                      }
                    }
                    
                    console.warn('Failed to fetch real channel data after all retries');
                  };
                  
                  fetchRealChannelData();
                }
                
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
              hasServerErrorRef.current = true;
              scrollToBottom();
              break;
              
            case ResponseType.END_OF_STREAM:
              eventSource.close();
              const finalResponse = currentResponseRef.current;
              const finalSources = currentSourcesRef.current;
              const finalChannelMessages = currentChannelMessagesRef.current;
              
              console.log('END_OF_STREAM - finalChannelMessages:', finalChannelMessages);
              
              const channelMessagesForUI = finalChannelMessages.length > 0 ? finalChannelMessages : undefined;
              console.log('Channel messages for UI:', channelMessagesForUI);
              
              if (finalResponse) {
                const completeMessage: ChatMessage = {
                  id: serverMessageIdRef.current || serverMessageId || messageId,
                  message: sentMessageRef.current,
                  response: finalResponse,
                  sources: finalSources.length > 0 ? finalSources : undefined,
                  channelMessages: channelMessagesForUI,
                  createdAt: new Date().toISOString(),
                };
                console.log('Saving complete message with ID:', completeMessage.id);
                onNewMessage(completeMessage);
              }
              
              setIsStreaming(false);
              setCurrentResponse('');
              setCurrentSources([]);
              setCurrentMessageId(null);
              setIsGeneratingChannels(false);
              setCurrentChannelMessages([]);
              setServerMessageId(null);
              if (finalResponse) {
                setSentMessage('');
                setStatusMessages([]);
                setHasServerError(false);
                sentMessageRef.current = '';
              }
              else if (!hasServerErrorRef.current) {
                setSentMessage('');
                setStatusMessages([]);
                setHasServerError(false);
                sentMessageRef.current = '';
              }
              
              setAnimatedMessageIds(new Set());
              previousStatusLengthRef.current = 0;
              currentResponseRef.current = '';
              currentSourcesRef.current = [];
              sentMessageRef.current = '';
              currentChannelMessagesRef.current = [];
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
        setCurrentSources([]);
        setCurrentMessageId(null);
        setSentMessage('');
        setStatusMessages([]);
        setHasServerError(false);
        hasServerErrorRef.current = false;
        setAnimatedMessageIds(new Set());
        previousStatusLengthRef.current = 0;
        currentResponseRef.current = '';
        currentSourcesRef.current = [];
        sentMessageRef.current = '';
        setIsGeneratingChannels(false);
        setCurrentChannelMessages([]);
        currentChannelMessagesRef.current = [];
        setServerMessageId(null);
      };

      setMessage('');
    } catch (error) {
      console.error('Error starting chat stream:', error);
      setIsStreaming(false);
      setCurrentResponse('');
      setCurrentSources([]);
      setCurrentMessageId(null);
      setSentMessage('');
      setStatusMessages([]);
      setHasServerError(false);
      hasServerErrorRef.current = false;
      setAnimatedMessageIds(new Set());
      previousStatusLengthRef.current = 0;
      currentResponseRef.current = '';
      currentSourcesRef.current = [];
      sentMessageRef.current = '';
      setIsGeneratingChannels(false);
      setCurrentChannelMessages([]);
      currentChannelMessagesRef.current = [];
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {chatHistory.length === 0 && !isStreaming ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
          <div className="text-center space-y-6 mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Welcome to Adaptive Marketing AI
            </h2>
            <p className="text-gray-600 max-w-2xl text-base sm:text-lg leading-relaxed">
              Your intelligent marketing companion that connects to multiple platforms, generates campaign queries, and answers questions across channels with AI-powered insights.
            </p>
          </div>
          <div className="w-full max-w-5xl flex-1 min-h-0 overflow-y-auto px-4">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-600 uppercase tracking-wider">
                Campaign Suggestions
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
              {promptSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="group text-left p-4 sm:p-5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 text-sm sm:text-base leading-relaxed flex-1">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-6 sm:space-y-8">
        
        {chatHistory.map((chat) => (
          <div key={chat.id} className="space-y-4 animate-fade-in">
            <div className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-tr-md shadow-lg hover:shadow-xl transition-shadow duration-300">
                <p className="text-sm sm:text-base leading-relaxed">{chat.message}</p>
              </div>
            </div>
            
            <div className="flex justify-start">
              <div className="max-w-[90%] sm:max-w-3xl bg-white/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl rounded-tl-md shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                {chat.sources && chat.sources.length > 0 && (
                  <SourceCards 
                    sources={chat.sources}
                    expandedIndices={historyExpandedIndices.get(chat.id) || new Set<number>()}
                    onToggleExpansion={(index) => handleReferenceClick(index, chat.id)}
                  />
                )}
                <div className="prose prose-sm sm:prose-base max-w-none prose-p:relative">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      p: ({ children, node }) => {
                        const processChildren = (child: any): any => {
                          if (typeof child === 'string') {
                            return renderTextWithReferences(child, chat.sources || [], true, chat.id);
                          }
                          if (React.isValidElement(child)) {
                            const childProps = child.props as any;
                            if (childProps && childProps.children) {
                              const processedGrandchildren = React.Children.map(childProps.children, processChildren);
                              return React.cloneElement(child, {}, processedGrandchildren);
                            }
                          }
                          if (Array.isArray(child)) {
                            return child.map((c, i) => <React.Fragment key={i}>{processChildren(c)}</React.Fragment>);
                          }
                          return child;
                        };
                        
                        return (
                          <p className="text-gray-700 leading-relaxed mb-3 [&_button]:pointer-events-auto [&_button]:relative [&_button]:z-10">
                            {React.Children.map(children, processChildren)}
                          </p>
                        );
                      },
                      code: ({ className, children, ...props }) => {
                        const isInline = !className || !className.includes('language-');
                        if (isInline) {
                          return <code className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs sm:text-sm font-mono" {...props}>{children}</code>
                        }
                        return <code className="break-all whitespace-pre-wrap text-xs sm:text-sm" {...props}>{children}</code>
                      },
                      pre: ({ children }) => <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-4 rounded-xl overflow-x-auto text-xs sm:text-sm shadow-inner my-4">{children}</div>,
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="bg-white divide-y divide-gray-100">{children}</tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-blue-50/50 transition-colors duration-150">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {children}
                        </td>
                      ),
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-bold text-gray-800 mt-5 mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-gray-700 mb-3">{children}</ol>,
                      li: ({ children }) => <li className="text-gray-700">{children}</li>,
                      a: ({ children, href }) => <a href={href} className="text-blue-600 hover:text-blue-700 underline">{children}</a>,
                    }}
                  >
                    {chat.response}
                  </ReactMarkdown>
                </div>
                <ChannelMessages
                  channelMessages={chat.channelMessages}
                  chatId={chat.id}
                  onDownload={(channel) => handleHistoryDownloadChannelMessages(chat.id, channel)}
                />
              </div>
            </div>
          </div>
        ))}
        {!isStreaming && hasServerError && statusMessages.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-tr-md shadow-lg">
                <p className="text-sm sm:text-base leading-relaxed">{sentMessage}</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[90%] sm:max-w-3xl">
                <div className="space-y-1 px-1">
                  {statusMessages.map((statusMessage) => (
                    <StatusDisplay key={statusMessage.id} statusMessage={statusMessage} isNew={false} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {isStreaming && currentMessageId && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-3xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl rounded-tr-md shadow-lg">
                <p className="text-sm sm:text-base leading-relaxed">{sentMessage}</p>
              </div>
            </div>
            
            {(statusMessages.length > 0 || currentResponse) && (
              <div className="flex justify-start">
                <div className="max-w-[90%] sm:max-w-3xl bg-white/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl rounded-tl-md shadow-md border border-gray-100">
                  {statusMessages.length > 0 && (
                    <div className="mb-4 space-y-1 px-1">
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

                  {currentSources.length > 0 && (
                    <div ref={sourceCardsRef}>
                      <SourceCards 
                        sources={currentSources} 
                        expandedIndices={expandedSourceIndices}
                        onToggleExpansion={handleReferenceClick}
                      />
                    </div>
                  )}

                  {currentResponse && (
                  <div className="prose prose-sm sm:prose-base max-w-none prose-p:relative">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({ children, node }) => {
                          const processChildren = (child: any): any => {
                            if (typeof child === 'string') {
                              return renderTextWithReferences(child, currentSources, true, undefined);
                            }
                            if (React.isValidElement(child)) {
                              const childProps = child.props as any;
                              if (childProps && childProps.children) {
                                const processedGrandchildren = React.Children.map(childProps.children, processChildren);
                                return React.cloneElement(child, {}, processedGrandchildren);
                              }
                            }
                            if (Array.isArray(child)) {
                              return child.map((c, i) => <React.Fragment key={i}>{processChildren(c)}</React.Fragment>);
                            }
                            return child;
                          };
                          
                          return (
                            <p className="text-gray-700 leading-relaxed mb-3 [&_button]:pointer-events-auto [&_button]:relative [&_button]:z-10">
                              {React.Children.map(children, processChildren)}
                            </p>
                          );
                        },
                        code: ({ className, children, ...props }) => {
                          const isInline = !className || !className.includes('language-');
                          if (isInline) {
                            return <code className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-xs sm:text-sm font-mono" {...props}>{children}</code>
                          }
                          return <code className="break-all whitespace-pre-wrap text-xs sm:text-sm" {...props}>{children}</code>
                        },
                        pre: ({ children }) => <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-4 rounded-xl overflow-x-auto text-xs sm:text-sm shadow-inner my-4">{children}</div>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4 rounded-lg shadow-sm border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-gradient-to-r from-gray-50 to-blue-50">{children}</thead>
                        ),
                        tbody: ({ children }) => (
                          <tbody className="bg-white divide-y divide-gray-100">{children}</tbody>
                        ),
                        tr: ({ children }) => (
                          <tr className="hover:bg-blue-50/50 transition-colors duration-150">{children}</tr>
                        ),
                        th: ({ children }) => (
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-6 py-4 text-sm text-gray-800">
                            {children}
                          </td>
                        ),
                        h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-800 mt-6 mb-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-bold text-gray-800 mt-5 mb-3">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h3>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-gray-700 mb-3">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-700">{children}</li>,
                        a: ({ children, href }) => <a href={href} className="text-blue-600 hover:text-blue-700 underline">{children}</a>,
                      }}
                    >
                      {currentResponse}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-5 bg-blue-600 animate-pulse ml-1"></span>
                  </div>
                )}

                <ChannelMessages
                  isGenerating={isGeneratingChannels}
                  channelMessages={currentChannelMessages}
                  chatId={serverMessageIdRef.current || serverMessageId || currentMessageId || undefined}
                  onDownload={handleDownloadChannelMessages}
                />
                </div>
              </div>
            )}
          </div>
        )}
        
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="flex-shrink-0 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative flex items-center bg-white rounded-2xl shadow-lg hover:shadow-xl focus-within:shadow-xl focus-within:ring-2 focus-within:ring-blue-400/50 transition-all duration-300 border border-gray-200">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isStreaming}
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base bg-transparent focus:outline-none disabled:opacity-50 placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!message.trim() || isStreaming}
                className="m-1 sm:m-1.5 px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 flex items-center justify-center min-w-[80px] sm:min-w-[100px]"
              >
                {isStreaming ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline text-sm font-medium">Sending</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Send</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
