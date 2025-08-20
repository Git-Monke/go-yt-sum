import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatSSEMessage, ChatSSEData, ChatSSEState } from '@/types/chat';

// Configuration constants
const BASE_URL = `http://${window.location.hostname}:3211`;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 10;

interface UseChatSSEReturn extends ChatSSEState {
  reconnect: () => void;
  disconnect: () => void;
}

export function useChatSSE(videoId: string): UseChatSSEReturn {
  const [connectionState, setConnectionState] = useState<ChatSSEState['connectionState']>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [currentData, setCurrentData] = useState<ChatSSEData | null>(null);
  
  // Refs for managing connection state
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptRef = useRef(0);
  const retryDelayRef = useRef(INITIAL_RETRY_DELAY);
  const isManuallyDisconnectedRef = useRef(false);

  // Clear any existing retry timeout
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Close existing EventSource connection
  const closeConnection = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    clearRetryTimeout();
  }, [clearRetryTimeout]);

  // Parse SSE message data
  const parseSSEMessage = useCallback((event: MessageEvent): ChatSSEMessage | null => {
    try {
      console.log('Raw Chat SSE data:', event.data);
      console.log('Event type:', event.type);
      const data = JSON.parse(event.data);
      
      // Validate message structure based on event type
      switch (event.type) {
        case 'init':
          return { event: 'init', data } as ChatSSEMessage;
        case 'update':
          return { event: 'update', data } as ChatSSEMessage;
        case 'complete':
          return { event: 'complete', data: {} } as ChatSSEMessage;
        default:
          console.warn(`Unknown Chat SSE event type: ${event.type}`);
          return null;
      }
    } catch (parseError) {
      console.error('Failed to parse Chat SSE message:', parseError);
      console.error('Raw data that failed to parse:', event.data);
      console.error('Event type that failed:', event.type);
      return null;
    }
  }, []);

  // Handle SSE messages
  const handleSSEMessage = useCallback((message: ChatSSEMessage) => {
    switch (message.event) {
      case 'init':
        // Set initial chat state
        setCurrentData(message.data);
        break;
        
      case 'update':
        // Update streaming response
        setCurrentData(message.data);
        break;
        
      case 'complete':
        // Response generation completed - keep current data but mark as not busy
        setCurrentData(prev => prev ? { ...prev, is_busy: false } : null);
        break;
    }
  }, []);

  // Handle reconnection with exponential backoff
  const handleReconnection = useCallback(() => {
    if (retryAttemptRef.current >= MAX_RETRY_ATTEMPTS) {
      console.error('Max retry attempts reached for chat SSE, giving up');
      setError(new Error('Chat connection failed after maximum retry attempts'));
      setConnectionState('disconnected');
      return;
    }

    const delay = Math.min(retryDelayRef.current, MAX_RETRY_DELAY);
    console.log(`Attempting chat SSE reconnection in ${delay}ms (attempt ${retryAttemptRef.current + 1})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      retryAttemptRef.current++;
      retryDelayRef.current *= 2; // Exponential backoff
      connect();
    }, delay);
  }, []);

  // Establish SSE connection
  const connect = useCallback(() => {
    if (isManuallyDisconnectedRef.current) {
      return; // Don't auto-reconnect if manually disconnected
    }

    if (!videoId) {
      console.warn('Cannot connect to chat SSE without videoId');
      return;
    }

    closeConnection();
    setConnectionState('connecting');
    setError(null);

    try {
      const url = `${BASE_URL}/chat/${videoId}/subscribe`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Chat SSE connection established for video:', videoId);
        setConnectionState('connected');
        setError(null);
        // Reset retry state on successful connection
        retryAttemptRef.current = 0;
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      };

      eventSource.onerror = () => {
        console.error('Chat SSE connection error for video:', videoId);
        setConnectionState('error');
        
        // Only attempt reconnection if not manually disconnected
        if (!isManuallyDisconnectedRef.current) {
          handleReconnection();
        }
      };

      // Handle different event types
      eventSource.addEventListener('init', (event) => {
        const message = parseSSEMessage(event);
        if (message) handleSSEMessage(message);
      });

      eventSource.addEventListener('update', (event) => {
        const message = parseSSEMessage(event);
        if (message) handleSSEMessage(message);
      });

      eventSource.addEventListener('complete', (event) => {
        const message = parseSSEMessage(event);
        if (message) handleSSEMessage(message);
      });

    } catch (connectionError) {
      console.error('Failed to create Chat SSE connection:', connectionError);
      const errorObj = connectionError instanceof Error ? connectionError : new Error('Connection failed');
      setError(errorObj);
      setConnectionState('error');
      
      if (!isManuallyDisconnectedRef.current) {
        handleReconnection();
      }
    }
  }, [videoId, closeConnection, parseSSEMessage, handleSSEMessage, handleReconnection]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = false;
    retryAttemptRef.current = 0;
    retryDelayRef.current = INITIAL_RETRY_DELAY;
    connect();
  }, [connect]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = true;
    closeConnection();
    setConnectionState('disconnected');
  }, [closeConnection]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause reconnection attempts
        clearRetryTimeout();
      } else if (!isManuallyDisconnectedRef.current && connectionState === 'error') {
        // Page is visible again and we're in error state, try to reconnect
        handleReconnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectionState, handleReconnection, clearRetryTimeout]);

  // Initialize connection on mount or when videoId changes
  useEffect(() => {
    if (!videoId) {
      disconnect();
      return;
    }

    isManuallyDisconnectedRef.current = false;
    connect();

    // Cleanup on unmount or videoId change
    return () => {
      isManuallyDisconnectedRef.current = true;
      closeConnection();
      setConnectionState('disconnected');
    };
  }, [videoId, connect, closeConnection, disconnect]);

  return {
    connectionState,
    error,
    currentData,
    reconnect,
    disconnect,
  };
}