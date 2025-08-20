import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessageProps } from '@/types/chat';

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={cn(
      "flex w-full mb-4 gap-3",
      isUser && "flex-row-reverse",
      isAssistant && "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser && "bg-primary text-primary-foreground",
        isAssistant && "bg-muted border"
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message bubble */}
      <div className={cn(
        "max-w-[70%] rounded-lg px-4 py-3 text-sm",
        isUser && "bg-primary text-primary-foreground",
        isAssistant && "bg-muted"
      )}>
        {isUser ? (
          // User messages - plain text
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          // Assistant messages - markdown
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer>
              {message.content}
            </MarkdownRenderer>
          </div>
        )}
      </div>
    </div>
  );
}
