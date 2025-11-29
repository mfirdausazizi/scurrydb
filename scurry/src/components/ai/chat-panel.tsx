'use client';

import * as React from 'react';
import { Bot, Send, User, Copy, Check, X, Loader2, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  connectionId?: string;
  onInsertSQL?: (sql: string) => void;
  className?: string;
}

export function ChatPanel({ connectionId, onInsertSQL, className }: ChatPanelProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const prevConnectionIdRef = React.useRef<string | undefined>(connectionId);

  // Load conversation history when component mounts or connection changes
  React.useEffect(() => {
    async function loadHistory() {
      // Only load if connection changed or on initial mount
      if (prevConnectionIdRef.current === connectionId && messages.length > 0) {
        return;
      }
      prevConnectionIdRef.current = connectionId;

      setIsLoadingHistory(true);
      try {
        const params = new URLSearchParams();
        if (connectionId) {
          params.set('connectionId', connectionId);
        }
        const response = await fetch(`/api/ai/conversation?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(
              data.messages.map((m: { id: string; role: string; content: string }) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
              }))
            );
          } else {
            setMessages([]);
          }
        }
      } catch (err) {
        console.error('Failed to load conversation history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [connectionId]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleInsertSQL = (sql: string) => {
    if (onInsertSQL) {
      onInsertSQL(sql);
      toast.success('SQL inserted into editor');
    }
  };

  const handleClearMemory = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/ai/conversation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connectionId || null }),
      });

      if (response.ok) {
        setMessages([]);
        toast.success('Conversation memory cleared');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to clear memory');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear memory');
    } finally {
      setIsClearing(false);
    }
  };

  const formatContent = (content: string) => {
    const parts = content.split(/(```sql[\s\S]*?```)/gi);
    return parts.map((part, index) => {
      if (part.toLowerCase().startsWith('```sql')) {
        const sql = part.replace(/```sql\n?/i, '').replace(/```$/, '').trim();
        const blockId = `sql-${index}`;
        return (
          <div key={index} className="my-2 rounded-md bg-muted/50 border">
            <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground">SQL</span>
              <div className="flex items-center gap-1">
                {onInsertSQL && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleInsertSQL(sql)}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Insert
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => handleCopyCode(sql, blockId)}
                >
                  {copiedId === blockId ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <pre className="p-3 text-sm overflow-x-auto">
              <code>{sql}</code>
            </pre>
          </div>
        );
      }
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          connectionId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get AI response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = (Date.now() + 1).toString();

      // Add empty assistant message
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantContent += chunk;

        // Update assistant message with streamed content
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      toast.error(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    disabled={isClearing}
                  >
                    {isClearing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">Clear Memory</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Conversation Memory?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all conversation history for this connection.
                      The AI will no longer remember previous messages.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearMemory}>
                      Clear Memory
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setMessages([])}
                title="Hide messages (keeps memory)"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">Ask me anything about your database</p>
            <p className="text-xs mt-1">I can help you write SQL queries, analyze your schema, and more.</p>
            <p className="text-xs mt-2 text-primary/70">I remember our conversation history!</p>
            <div className="mt-4 space-y-2">
              <p className="text-xs">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Show all users',
                  'Count orders by status',
                  'Find duplicate emails',
                ].map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 max-w-[85%] text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'assistant'
                    ? formatContent(message.content)
                    : message.content}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 mt-4 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4" />
            {error.message}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your database..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
