'use client';

import * as React from 'react';
import { Clock, X, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QueryHistoryItem } from '@/types';

interface Connection {
  id: string;
  name: string;
}

interface QueryHistoryProps {
  history: QueryHistoryItem[];
  connections?: Connection[];
  onSelect: (query: string) => void;
  onClose: () => void;
}

// Helper to highlight matching text
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <>{text}</>;
  }
  
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-honey/30 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function QueryHistory({ history, connections = [], onSelect, onClose }: QueryHistoryProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [connectionFilter, setConnectionFilter] = React.useState<string>('all');

  // Get unique connection IDs from history
  const connectionIdsInHistory = React.useMemo(() => {
    return [...new Set(history.map(item => item.connectionId))];
  }, [history]);

  // Filter connections to only those that appear in history
  const availableConnections = React.useMemo(() => {
    return connections.filter(conn => connectionIdsInHistory.includes(conn.id));
  }, [connections, connectionIdsInHistory]);

  // Filter history based on search and connection filter
  const filteredHistory = React.useMemo(() => {
    return history.filter(item => {
      const matchesSearch = !searchQuery || 
        item.sql.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConnection = connectionFilter === 'all' || 
        item.connectionId === connectionFilter;
      return matchesSearch && matchesConnection;
    });
  }, [history, searchQuery, connectionFilter]);

  const hasFilters = searchQuery || connectionFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setConnectionFilter('all');
  };

  // Get connection name by ID
  const getConnectionName = (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    return conn?.name || connectionId.slice(0, 8);
  };

  const renderHeader = () => (
    <div className="p-4 border-b space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Query History
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search queries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      
      {/* Connection filter */}
      {availableConnections.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <Select value={connectionFilter} onValueChange={setConnectionFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="All connections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All connections</SelectItem>
              {availableConnections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Clear filters button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full"
          onClick={clearFilters}
        >
          Clear filters ({filteredHistory.length} of {history.length} shown)
        </Button>
      )}
    </div>
  );

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
    <div className="border-l w-80 bg-muted/30 flex flex-col h-full">
      {renderHeader()}
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No queries match your filters.
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <button
                key={item.id}
                className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                onClick={() => onSelect(item.sql)}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {item.error ? (
                    <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-forest flex-shrink-0" />
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
                {connectionFilter === 'all' && connections.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-1">
                    <span className="bg-muted px-1.5 py-0.5 rounded">
                      {getConnectionName(item.connectionId)}
                    </span>
                  </div>
                )}
                <pre className="text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                  <HighlightedText text={item.sql} highlight={searchQuery} />
                </pre>
                {item.error && (
                  <p className="text-xs text-destructive mt-1 truncate">{item.error}</p>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
