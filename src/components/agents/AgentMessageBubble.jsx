import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentMessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-2 text-right', isUser ? 'justify-start' : 'justify-start')} dir="rtl">
      <div className={cn(
        'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
      )}>
        {isUser ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn(
        'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm whitespace-pre-wrap break-words text-right',
        isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border border-border text-card-foreground rounded-tr-sm'
      )}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert text-right prose-p:my-1 prose-ul:my-1 prose-li:my-0">
            {message.content || 'חושב...'}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}