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
  AGENT_THINKING = 'AGENT_THINKING'
}

export interface StreamResponse {
  responseType: ResponseType;
  content: string;
  data: any;
  timestamp: string;
}

export interface Integration {
  id: string;
  dataSource: DataSource;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  createdAt: string;
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
