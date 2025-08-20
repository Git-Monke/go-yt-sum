import { useState, useEffect, useCallback, useRef } from 'react';
import { getChatHistory, sendChatMessage } from '@/utils/api';
import { useChatSSE } from './useChatSSE';
import type { ChatMessage, ChatHistoryState, ChatSSEData } from '@/types/chat';

interface UseChatHistoryReturn extends ChatHistoryState {
  sendMessage: (content: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useChatHistory(videoId: string): UseChatHistoryReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get SSE connection for real-time updates
  const { currentData } = useChatSSE(videoId);
  
  // Track previous state to detect transitions
  const previousDataRef = useRef<ChatSSEData | null>(null);

  // Derive current response state from SSE data
  const currentResponse = currentData && currentData.is_busy && currentData.request ? {
    isStreaming: true,
    content: currentData.response,
    request: currentData.request,
  } : null;

  // Load chat history from API
  const loadChatHistory = useCallback(async () => {
    if (!videoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await getChatHistory(videoId);
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
      setError('Failed to load chat history');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  // Send a new message
  const sendMessage = useCallback(async (content: string) => {
    if (!videoId || !content.trim()) {
      throw new Error('Invalid message or video ID');
    }

    // Create optimistic user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Add user message immediately (optimistic update)
    setMessages(prev => [...prev, userMessage]);
    setError(null);

    try {
      // Send message to backend
      await sendChatMessage(videoId, content.trim());
      // Note: The response will come through SSE, so we don't need to handle it here
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      throw err;
    }
  }, [videoId]);

  // Refresh chat history manually
  const refresh = useCallback(async () => {
    await loadChatHistory();
  }, [loadChatHistory]);

  // Handle completion of streaming response
  useEffect(() => {
    const previousData = previousDataRef.current;
    
    // Detect transition from busy to not busy
    if (previousData && currentData && 
        previousData.is_busy && !currentData.is_busy &&
        previousData.request && previousData.response) {
      
      const assistantMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        role: 'assistant',
        content: previousData.response, // Use previous state's response
        timestamp: new Date(),
      };

      setMessages(prev => {
        // Check if this response already exists to avoid duplicates
        const exists = prev.some(msg => 
          msg.role === 'assistant' && 
          msg.content === previousData.response &&
          // Check if there's a recent user message that matches the request
          prev.some(userMsg => 
            userMsg.role === 'user' && 
            userMsg.content === previousData.request &&
            Math.abs(userMsg.timestamp.getTime() - assistantMessage.timestamp.getTime()) < 60000 // Within 1 minute
          )
        );

        if (exists) {
          return prev;
        }

        return [...prev, assistantMessage];
      });
    }

    // Update previous data ref for next comparison
    previousDataRef.current = currentData;
  }, [currentData]);

  // Load chat history when component mounts or videoId changes
  useEffect(() => {
    if (videoId) {
      loadChatHistory();
    } else {
      setMessages([]);
      setError(null);
    }
  }, [videoId, loadChatHistory]);

  return {
    messages,
    currentResponse,
    isLoading,
    error,
    sendMessage,
    refresh,
  };
}
