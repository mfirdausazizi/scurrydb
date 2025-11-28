'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { format } from 'sql-formatter';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { QueryToolbar } from '@/components/editor/query-toolbar';
import { QueryHistory } from '@/components/editor/query-history';
import { ChatPanel } from '@/components/ai/chat-panel';
import { ResultsTable } from '@/components/results';
import { useConnections, useMediaQuery } from '@/hooks';
import { useQueryStore } from '@/lib/store';
import type { QueryResult } from '@/types';

const SqlEditor = dynamic(
  () => import('@/components/editor/sql-editor').then((mod) => mod.SqlEditor),
  { ssr: false }
);

export default function QueryPage() {
  const { connections, loading: connectionsLoading } = useConnections();
  const {
    history,
    currentQuery,
    selectedConnectionId,
    setCurrentQuery,
    setSelectedConnectionId,
    addToHistory,
  } = useQueryStore();

  const [executing, setExecuting] = React.useState(false);
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showAI, setShowAI] = React.useState(false);
  
  const isMobile = useMediaQuery('(max-width: 767px)');

  React.useEffect(() => {
    if (!selectedConnectionId && connections.length > 0) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId, setSelectedConnectionId]);

  // Load query from sessionStorage (when coming from saved queries page)
  React.useEffect(() => {
    const savedQuery = sessionStorage.getItem('runQuery');
    if (savedQuery) {
      setCurrentQuery(savedQuery);
      sessionStorage.removeItem('runQuery');
    }
  }, [setCurrentQuery]);

  const handleExecute = async () => {
    if (!selectedConnectionId || !currentQuery.trim()) {
      toast.error('Please select a connection and enter a query');
      return;
    }

    setExecuting(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnectionId,
          sql: currentQuery,
        }),
      });

      const data: QueryResult = await response.json();
      setResult(data);

      addToHistory({
        connectionId: selectedConnectionId,
        sql: currentQuery,
        executedAt: new Date(),
        executionTime: data.executionTime,
        rowCount: data.error ? undefined : data.rowCount,
        error: data.error,
      });

      if (data.error) {
        toast.error('Query failed', { description: data.error });
      } else {
        toast.success(`Query completed in ${data.executionTime}ms`, {
          description: `${data.rowCount} rows returned`,
        });
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute query';
      
      addToHistory({
        connectionId: selectedConnectionId,
        sql: currentQuery,
        executedAt: new Date(),
        executionTime,
        error: errorMessage,
      });

      toast.error('Query failed', { description: errorMessage });
    } finally {
      setExecuting(false);
    }
  };

  const handleFormat = () => {
    try {
      const formatted = format(currentQuery, { language: 'mysql' });
      setCurrentQuery(formatted);
      toast.success('Query formatted');
    } catch {
      toast.error('Failed to format query');
    }
  };

  const handleExport = () => {
    if (!result || result.rows.length === 0) return;

    const headers = result.columns.map((c) => c.name).join(',');
    const rows = result.rows.map((row) =>
      result.columns.map((c) => {
        const val = row[c.name];
        if (val === null) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Results exported to CSV');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col min-w-0 overflow-hidden">
      <div className="mb-3 md:mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Query Editor</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Write and execute SQL queries. Press Ctrl+Enter (or Cmd+Enter) to run.
        </p>
      </div>

      {/* Mobile Sheets for History and AI */}
      <Sheet open={showHistory && isMobile} onOpenChange={setShowHistory}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>Query History</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-60px)] overflow-auto">
            <QueryHistory
              history={history}
              onSelect={(sql) => {
                setCurrentQuery(sql);
                setShowHistory(false);
              }}
              onClose={() => setShowHistory(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={showAI && isMobile} onOpenChange={setShowAI}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>AI Assistant</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-60px)] overflow-hidden">
            <ChatPanel
              connectionId={selectedConnectionId || undefined}
              onInsertSQL={(sql) => {
                setCurrentQuery(sql);
                setShowAI(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex min-h-0 overflow-hidden rounded-lg border bg-card">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <QueryToolbar
            connections={connections}
            selectedConnectionId={selectedConnectionId}
            currentQuery={currentQuery}
            onConnectionChange={setSelectedConnectionId}
            onExecute={handleExecute}
            onFormat={handleFormat}
            onToggleHistory={() => setShowHistory(!showHistory)}
            onToggleAI={() => setShowAI(!showAI)}
            onExport={result && result.rows.length > 0 ? handleExport : undefined}
            executing={executing}
            hasResults={!!result && result.rows.length > 0}
            showAI={showAI}
            showHistory={showHistory}
          />

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="h-[180px] md:h-[300px] flex-shrink-0">
              <SqlEditor
                value={currentQuery}
                onChange={setCurrentQuery}
                onExecute={handleExecute}
              />
            </div>

            <div className="flex-1 overflow-auto p-3 md:p-4 border-t min-h-0">
              {result ? (
                result.error ? (
                  <Card className="border-destructive">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Query Error
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm font-mono whitespace-pre-wrap text-destructive">
                        {result.error}
                      </pre>
                    </CardContent>
                  </Card>
                ) : (
                  <ResultsTable result={result} />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <span className="text-2xl">🐿️</span>
                  <span className="text-center text-sm md:text-base">
                    {connectionsLoading
                      ? 'Loading connections...'
                      : connections.length === 0
                      ? 'No connections available. Add a connection first.'
                      : 'Run a query to see results'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop History Panel */}
        {showHistory && !isMobile && (
          <div className="w-[300px] border-l flex-shrink-0 overflow-hidden">
            <QueryHistory
              history={history}
              onSelect={(sql) => {
                setCurrentQuery(sql);
                setShowHistory(false);
              }}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}

        {/* Desktop AI Panel */}
        {showAI && !isMobile && (
          <div className="w-[350px] border-l flex-shrink-0 flex flex-col overflow-hidden">
            <ChatPanel
              connectionId={selectedConnectionId || undefined}
              onInsertSQL={(sql) => {
                setCurrentQuery(sql);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
