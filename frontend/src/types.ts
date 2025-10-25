export enum DataSource {
  WEBSITE = 'WEBSITE',
  SHOPIFY = 'SHOPIFY', 
  CRMS = 'CRMS'
}

export enum ResponseType {
  LLM_RESPONSE = 'LLM_RESPONSE',
  SERVER_ERROR = 'SERVER_ERROR',
  END_OF_STREAM = 'END_OF_STREAM',
  AGENT_STATUS = 'AGENT_STATUS',
  AGENT_THINKING = 'AGENT_THINKING',
  RETRIEVED_DATA = 'RETRIEVED_DATA',
  GENERATING_CHANNEL_MESSAGE = 'GENERATING_CHANNEL_MESSAGE',
  CHANNEL_MESSAGE = 'CHANNEL_MESSAGE'
}

export interface SourceData {
  email: string;
  data_source: string;
  first_name: string;
  last_name: string;
  id?: string;
  source_customer_id?: string;
  phone?: string;
  total_value?: number;
  engagement_score?: number;
  lifecycle_stage?: string;
  last_interaction?: string;
  created_at?: string;
  updated_at?: string;
  tags?: any;
  segment?: string;
  purchase_intent?: string;
  accepts_marketing?: boolean;
  timezone?: string;
  optimal_send_times?: any;
  last_engagement_time?: string;
  engagement_frequency?: string;
  seasonal_activity?: any;
  preferred_channels?: any;
  channel_performance?: any;
  device_preference?: string;
  social_platforms?: any;
  communication_limits?: any;
  source_data?: any;
  cart_abandoned_at?: string;
  cart_value?: number;
  last_order_date?: string | null;
  [key: string]: any;
}

export interface StreamResponse {
  responseType: ResponseType;
  content: string;
  data?: any;
  timestamp: string;
  messageId?: string;
}

export interface Integration {
  id: string;
  dataSource: DataSource;
  createdAt: string;
}

export interface ChannelMessageMetadata {
  user_id: string;
  first_name: string;
  last_name: string;
  data_source: string;
  message: string;
  subject?: string;
  email?: string;
  phone?: string;
  social_platforms?: string[];
  [key: string]: any;
}

export interface ChannelMessage {
  channel: string;
  metadata: ChannelMessageMetadata[];
  total: number;
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  sources?: SourceData[];
  createdAt: string;
  channelMessages?: ChannelMessage[];
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

export interface StatusMessage {
  id: string;
  type: ResponseType.AGENT_STATUS | ResponseType.AGENT_THINKING | ResponseType.SERVER_ERROR;
  content: string;
  timestamp: number;
  timeTaken?: number;
}
