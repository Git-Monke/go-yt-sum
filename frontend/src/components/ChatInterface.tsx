import React, { useRef, useEffect } from 'react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { cn } from '@/lib/utils';
import { useChatHistory } from '@/hooks/useChatHistory';
import type { ChatInterfaceProps, ChatMessage as ChatMessageType } from '@/types/chat';

export function ChatInterface({ videoId, className }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use the new chat history hook
  const { messages, currentResponse, isLoading, error, sendMessage } = useChatHistory(videoId);

  // Auto-scroll to bottom when new messages are added or response updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentResponse]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Error is already handled by the hook and displayed in the UI
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {messages.length === 0 && !currentResponse && !isLoading ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ask questions about the video content, request clarifications, or discuss key themes and insights.
            </p>
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="mb-1">Example questions:</p>
              <ul className="text-left space-y-1">
                <li>• "What are the main points?"</li>
                <li>• "Can you explain [specific topic]?"</li>
                <li>• "What did they say about...?"</li>
              </ul>
            </div>
          </div>
        ) : (
          // Messages list
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {/* Streaming response indicator */}
            {currentResponse && currentResponse.isStreaming && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg px-4 py-3 text-sm mr-4 max-w-[80%]">
                  <div className="whitespace-pre-wrap">
                    {currentResponse.content}
                    <span className="animate-pulse">|</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator when no response yet */}
            {isLoading && !currentResponse && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted rounded-lg px-4 py-3 text-sm mr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-muted-foreground/80 text-xs">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading || (currentResponse?.isStreaming ?? false)}
        placeholder="Ask about the video..."
      />
    </div>
  );
}