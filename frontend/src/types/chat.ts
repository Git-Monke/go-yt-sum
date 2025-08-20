export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface ChatMessageProps {
  message: ChatMessage;
}

export interface ChatInterfaceProps {
  videoId: string;
  className?: string;
}

// Chat SSE Event Types
export interface ChatSSEData {
  video_id: string;
  is_busy: boolean;
  request: string;
  response: string;
}

export interface ChatSSEInitEvent {
  event: 'init';
  data: ChatSSEData;
}

export interface ChatSSEUpdateEvent {
  event: 'update';
  data: ChatSSEData;
}

export interface ChatSSECompleteEvent {
  event: 'complete';
  data: {};
}

export type ChatSSEMessage = ChatSSEInitEvent | ChatSSEUpdateEvent | ChatSSECompleteEvent;

// Chat Hook State
export interface ChatHistoryState {
  messages: ChatMessage[];
  currentResponse: {
    isStreaming: boolean;
    content: string;
    request: string;
  } | null;
  isLoading: boolean;
  error: string | null;
}

// Chat SSE Hook State
export interface ChatSSEState {
  connectionState: 'connecting' | 'connected' | 'error' | 'disconnected';
  error: Error | null;
  currentData: ChatSSEData | null;
}