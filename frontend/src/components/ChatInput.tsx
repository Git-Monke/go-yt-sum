import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatInputProps } from '@/types/chat';

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Ask about the video..." 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    
    try {
      await onSendMessage(trimmedMessage);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
      // Refocus textarea after sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const canSend = message.trim().length > 0 && !disabled && !isLoading;

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border bg-background px-4 py-3 pr-12",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[48px] max-h-[120px] overflow-y-auto",
              "transition-all duration-200"
            )}
          />
          
          {/* Send button */}
          <Button
            type="submit"
            size="sm"
            disabled={!canSend}
            className={cn(
              "absolute right-2 bottom-2",
              "h-8 w-8 p-0",
              "transition-all duration-200",
              canSend && "shadow-sm hover:shadow"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Help text */}
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
}