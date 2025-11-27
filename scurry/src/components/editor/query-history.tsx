'use client';

import * as React from 'react';
import { Clock, X, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { QueryHistoryItem } from '@/types';

interface QueryHistoryProps {
  history: QueryHistoryItem[];
  onSelect: (query: string) => void;
  onClose: () => void;
}

export function QueryHistory({ history, onSelect, onClose }: QueryHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="p-4 border-l w-80 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Query History
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground text-center py-8">
          No queries yet. Run a query to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="border-l w-80 bg-muted/30 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Query History
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {history.map((item) => (
            <button
              key={item.id}
              className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              onClick={() => onSelect(item.sql)}
            >
              <div className="flex items-center gap-2 mb-1">
                {item.error ? (
                  <XCircle className="h-3 w-3 text-destructive" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-forest" />
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(item.executedAt).toLocaleTimeString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.executionTime}ms
                </span>
                {item.rowCount !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {item.rowCount} rows
                  </span>
                )}
              </div>
              <pre className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                {item.sql}
              </pre>
              {item.error && (
                <p className="text-xs text-destructive mt-1 truncate">{item.error}</p>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
