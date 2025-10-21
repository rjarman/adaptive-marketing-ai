export enum DataSource {
  WEBSITE = 'WEBSITE',
  SHOPIFY = 'SHOPIFY', 
  CRMS = 'CRMS'
}

export enum ResponseType {
  LLM_RESPONSE = 'LLM_RESPONSE',
  END_OF_STREAM = 'END_OF_STREAM'
}

export interface StreamResponse {
  responseType: ResponseType;
  data: string;
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
