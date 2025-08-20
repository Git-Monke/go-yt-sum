import { useEffect, useRef, useState, useCallback } from 'react';
import type { SummaryJob, SSEMessage, SSEInitMessage, SSENewMessage, SSEUpdateMessage } from '@/types/job';

// Configuration constants
const SSE_ENDPOINT = '/summarize/jobs/subscribe';
const BASE_URL = `http://${window.location.hostname}:3211`;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 10;

export type SSEConnectionState = 'connecting' | 'connected' | 'error' | 'disconnected';

interface UseSSEReturn {
  jobs: Record<string, SummaryJob>;
  connectionState: SSEConnectionState;
  error: Error | null;
  reconnect: () => void;
}

export function useSSE(): UseSSEReturn {
  const [jobs, setJobs] = useState<Record<string, SummaryJob>>({});
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  
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
  const parseSSEMessage = useCallback((event: MessageEvent): SSEMessage | null => {
    try {
      console.log('Raw SSE data:', event.data);
      console.log('Event type:', event.type);
      const data = JSON.parse(event.data);
      
      // Validate message structure based on event type
      switch (event.type) {
        case 'init':
          return { event: 'init', data } as SSEInitMessage;
        case 'new':
          return { event: 'new', data } as SSENewMessage;
        case 'update':
          return { event: 'update', data } as SSEUpdateMessage;
        default:
          console.warn(`Unknown SSE event type: ${event.type}`);
          return null;
      }
    } catch (parseError) {
      console.error('Failed to parse SSE message:', parseError);
      console.error('Raw data that failed to parse:', event.data);
      console.error('Event type that failed:', event.type);
      return null;
    }
  }, []);

  // Handle SSE messages
  const handleSSEMessage = useCallback((message: SSEMessage) => {
    switch (message.event) {
      case 'init':
        // Replace all jobs with initial state
        setJobs(message.data);
        break;
        
      case 'new':
        // Add new job
        setJobs(prev => ({
          ...prev,
          [message.data.video_id]: message.data
        }));
        break;
        
      case 'update':
        // Update existing job
        setJobs(prev => ({
          ...prev,
          [message.data.video_id]: message.data
        }));
        break;
    }
  }, []);

  // Establish SSE connection
  const connect = useCallback(() => {
    if (isManuallyDisconnectedRef.current) {
      return; // Don't auto-reconnect if manually disconnected
    }

    closeConnection();
    setConnectionState('connecting');
    setError(null);

    try {
      const url = `${BASE_URL}${SSE_ENDPOINT}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection established');
        setConnectionState('connected');
        setError(null);
        // Reset retry state on successful connection
        retryAttemptRef.current = 0;
        retryDelayRef.current = INITIAL_RETRY_DELAY;
      };

      eventSource.onerror = () => {
        console.error('SSE connection error');
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

      eventSource.addEventListener('new', (event) => {
        const message = parseSSEMessage(event);
        if (message) handleSSEMessage(message);
      });

      eventSource.addEventListener('update', (event) => {
        const message = parseSSEMessage(event);
        if (message) handleSSEMessage(message);
      });

    } catch (connectionError) {
      console.error('Failed to create SSE connection:', connectionError);
      const errorObj = connectionError instanceof Error ? connectionError : new Error('Connection failed');
      setError(errorObj);
      setConnectionState('error');
      
      if (!isManuallyDisconnectedRef.current) {
        handleReconnection();
      }
    }
  }, [closeConnection, parseSSEMessage, handleSSEMessage]);

  // Handle reconnection with exponential backoff
  const handleReconnection = useCallback(() => {
    if (retryAttemptRef.current >= MAX_RETRY_ATTEMPTS) {
      console.error('Max retry attempts reached, giving up');
      setError(new Error('Connection failed after maximum retry attempts'));
      setConnectionState('disconnected');
      return;
    }

    const delay = Math.min(retryDelayRef.current, MAX_RETRY_DELAY);
    console.log(`Attempting reconnection in ${delay}ms (attempt ${retryAttemptRef.current + 1})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      retryAttemptRef.current++;
      retryDelayRef.current *= 2; // Exponential backoff
      connect();
    }, delay);
  }, [connect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = false;
    retryAttemptRef.current = 0;
    retryDelayRef.current = INITIAL_RETRY_DELAY;
    connect();
  }, [connect]);

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

  // Initialize connection on mount
  useEffect(() => {
    isManuallyDisconnectedRef.current = false;
    connect();

    // Cleanup on unmount
    return () => {
      isManuallyDisconnectedRef.current = true;
      closeConnection();
      setConnectionState('disconnected');
    };
  }, [connect, closeConnection]);

  return {
    jobs,
    connectionState,
    error,
    reconnect,
  };
}