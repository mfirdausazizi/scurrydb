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
import { GuestQueryToolbar } from '@/components/editor/guest-query-toolbar';
import { QueryHistory } from '@/components/editor/query-history';
import { DangerousQueryDialog } from '@/components/editor/dangerous-query-dialog';
import { ResultsTable } from '@/components/results';
import { useMediaQuery } from '@/hooks';
import { useQueryStore } from '@/lib/store';
import { useGuestConnectionsStore } from '@/lib/store/guest-connections-store';
import { decryptFromStorage } from '@/lib/utils/client-encryption';
import { detectDangerousQuery, type DangerousQueryInfo } from '@/lib/sql/dangerous-query-detector';
import type { QueryResult, DatabaseConnection } from '@/types';

const SqlEditor = dynamic(
  () => import('@/components/editor/sql-editor').then((mod) => mod.SqlEditor),
  { ssr: false }
);

export default function GuestQueryPage() {
  const connections = useGuestConnectionsStore((state) => state.connections);
  const activeConnectionId = useGuestConnectionsStore((state) => state.activeConnectionId);
  const setActiveConnection = useGuestConnectionsStore((state) => state.setActiveConnection);
  
  // History store
  const { history, addToHistory, currentQuery, setCurrentQuery } = useQueryStore();

  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string | null>(activeConnectionId);
  const [result, setResult] = React.useState<QueryResult | null>(null);
  const [executing, setExecuting] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  
  // Dangerous query confirmation state
  const [dangerousQueryInfo, setDangerousQueryInfo] = React.useState<DangerousQueryInfo | null>(null);
  const [showDangerousQueryDialog, setShowDangerousQueryDialog] = React.useState(false);
  
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Sync connection selection with store
  React.useEffect(() => {
    if (selectedConnectionId) {
      setActiveConnection(selectedConnectionId);
    }
  }, [selectedConnectionId, setActiveConnection]);

  // Initialize with first connection if none selected
  React.useEffect(() => {
    if (!selectedConnectionId && connections.length > 0) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [selectedConnectionId, connections]);

  // Build connection object with decrypted password for API
  const buildConnectionForApi = async (connectionId: string): Promise<DatabaseConnection | null> => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return null;

    const password = await decryptFromStorage(conn.encryptedPassword);
    
    let sshConfig: DatabaseConnection['ssh'] | undefined;
    if (conn.ssh?.enabled) {
      sshConfig = {
        enabled: true,
        host: conn.ssh.host,
        port: conn.ssh.port,
        username: conn.ssh.username,
        authMethod: conn.ssh.authMethod,
        password: conn.ssh.encryptedPassword ? await decryptFromStorage(conn.ssh.encryptedPassword) : undefined,
        privateKey: conn.ssh.encryptedPrivateKey ? await decryptFromStorage(conn.ssh.encryptedPrivateKey) : undefined,
        passphrase: conn.ssh.encryptedPassphrase ? await decryptFromStorage(conn.ssh.encryptedPassphrase) : undefined,
      };
    }

    return {
      id: conn.id,
      name: conn.name,
      type: conn.type,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      password,
      ssl: conn.ssl,
      color: conn.color,
      timeout: conn.timeout,
      ssh: sshConfig,
      createdAt: new Date(conn.createdAt),
      updatedAt: new Date(conn.updatedAt),
    };
  };

  // Actual query execution logic
  const executeQueryInternal = async () => {
    if (!selectedConnectionId || !currentQuery.trim()) {
      toast.error('Please select a connection and enter a query');
      return;
    }

    setExecuting(true);
    const startTime = Date.now();

    try {
      const connection = await buildConnectionForApi(selectedConnectionId);
      if (!connection) {
        toast.error('Connection not found');
        setExecuting(false);
        return;
      }

      const response = await fetch('/api/query/execute/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection,
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

  // Entry point for query execution
  const handleExecute = async () => {
    if (!selectedConnectionId || !currentQuery.trim()) {
      toast.error('Please select a connection and enter a query');
      return;
    }

    const dangerInfo = detectDangerousQuery(currentQuery);
    
    if (dangerInfo.isDangerous && dangerInfo.requiresConfirmation) {
      setDangerousQueryInfo(dangerInfo);
      setShowDangerousQueryDialog(true);
      return;
    }

    await executeQueryInternal();
  };

  const handleDangerousQueryConfirm = async () => {
    setShowDangerousQueryDialog(false);
    setDangerousQueryInfo(null);
    await executeQueryInternal();
  };

  const handleDangerousQueryCancel = () => {
    setShowDangerousQueryDialog(false);
    setDangerousQueryInfo(null);
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

  // Transform connections for the toolbar
  const toolbarConnections = connections.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
  }));

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col min-w-0 overflow-hidden">
      <div className="mb-3 md:mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Query Editor</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Write and execute SQL queries. Press Ctrl+Enter (or Cmd+Enter) to run.
        </p>
      </div>

      {/* Dangerous Query Confirmation Dialog */}
      {dangerousQueryInfo && (
        <DangerousQueryDialog
          open={showDangerousQueryDialog}
          onOpenChange={setShowDangerousQueryDialog}
          queryInfo={dangerousQueryInfo}
          sql={currentQuery}
          onConfirm={handleDangerousQueryConfirm}
          onCancel={handleDangerousQueryCancel}
        />
      )}

      {/* Mobile Sheet for History */}
      <Sheet open={showHistory && isMobile} onOpenChange={setShowHistory}>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>Query History</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-60px)] overflow-auto">
            <QueryHistory
              history={history}
              connections={toolbarConnections.map(c => ({ ...c, host: '', port: 0, database: '', username: '', createdAt: new Date(), updatedAt: new Date() })) as any}
              onSelect={(sql) => {
                setCurrentQuery(sql);
                setShowHistory(false);
              }}
              onClose={() => setShowHistory(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex min-h-0 overflow-hidden rounded-lg border bg-card">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Query Toolbar */}
          <GuestQueryToolbar
            connections={toolbarConnections}
            selectedConnectionId={selectedConnectionId}
            currentQuery={currentQuery}
            onConnectionChange={setSelectedConnectionId}
            onExecute={handleExecute}
            onFormat={handleFormat}
            onToggleHistory={() => setShowHistory(!showHistory)}
            onExport={result && result.rows.length > 0 ? handleExport : undefined}
            executing={executing}
            hasResults={!!result && result.rows.length > 0}
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
                    {connections.length === 0
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
              connections={toolbarConnections.map(c => ({ ...c, host: '', port: 0, database: '', username: '', createdAt: new Date(), updatedAt: new Date() })) as any}
              onSelect={(sql) => {
                setCurrentQuery(sql);
                setShowHistory(false);
              }}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
