'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Database, Loader2, Table2, PanelLeft, SquareTerminal, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SchemaTree, TableStructure, TablesSummary } from '@/components/schema';
import { useGuestConnectionsStore } from '@/lib/store/guest-connections-store';
import { decryptFromStorage } from '@/lib/utils/client-encryption';
import type { TableInfo, ColumnDefinition, IndexInfo, QueryResult, DatabaseConnection } from '@/types';

function GuestBrowsePageContent() {
  const searchParams = useSearchParams();
  const connections = useGuestConnectionsStore((state) => state.connections);
  const setActiveConnection = useGuestConnectionsStore((state) => state.setActiveConnection);
  
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string | null>(
    searchParams.get('connection')
  );
  const [tables, setTables] = React.useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState<string | null>(null);
  const [showTablesOverview, setShowTablesOverview] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnDefinition[]>([]);
  const [indexes, setIndexes] = React.useState<IndexInfo[]>([]);
  const [structureLoading, setStructureLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<QueryResult | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const MIN_SIDEBAR_WIDTH = 160;
  const MAX_SIDEBAR_WIDTH = 400;
  const DEFAULT_SIDEBAR_WIDTH = 256;

  React.useEffect(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const containerRect = sidebarRef.current?.parentElement?.getBoundingClientRect();
      if (!containerRect) return;
      
      const newWidth = e.clientX - containerRect.left;
      const clampedWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, newWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Build connection object with decrypted password for API
  const buildConnectionForApi = React.useCallback(async (connectionId: string): Promise<DatabaseConnection | null> => {
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
  }, [connections]);

  const fetchTables = React.useCallback(async () => {
    if (!selectedConnectionId) return;
    
    setTablesLoading(true);
    try {
      const connection = await buildConnectionForApi(selectedConnectionId);
      if (!connection) {
        toast.error('Connection not found');
        return;
      }

      const response = await fetch('/api/schema/tables/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection }),
      });
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (error) {
      toast.error('Failed to load tables');
      console.error(error);
    } finally {
      setTablesLoading(false);
    }
  }, [selectedConnectionId, buildConnectionForApi]);

  const fetchTableStructure = React.useCallback(async (tableName: string) => {
    if (!selectedConnectionId) return;
    
    setStructureLoading(true);
    setPreview(null);
    try {
      const connection = await buildConnectionForApi(selectedConnectionId);
      if (!connection) {
        toast.error('Connection not found');
        return;
      }

      const response = await fetch(`/api/schema/tables/guest/${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection }),
      });
      if (!response.ok) throw new Error('Failed to fetch table structure');
      const data = await response.json();
      setColumns(data.columns);
      setIndexes(data.indexes);
    } catch (error) {
      toast.error('Failed to load table structure');
      console.error(error);
    } finally {
      setStructureLoading(false);
    }
  }, [selectedConnectionId, buildConnectionForApi]);

  const fetchPreview = React.useCallback(async () => {
    if (!selectedConnectionId || !selectedTable) return;
    
    setPreviewLoading(true);
    try {
      const connection = await buildConnectionForApi(selectedConnectionId);
      if (!connection) {
        toast.error('Connection not found');
        return;
      }

      const response = await fetch('/api/query/execute/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection,
          sql: `SELECT * FROM ${selectedTable} LIMIT 100`,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch preview');
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      toast.error('Failed to load data preview');
      console.error(error);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedConnectionId, selectedTable, buildConnectionForApi]);

  // Sync with URL and store
  React.useEffect(() => {
    const connectionFromUrl = searchParams.get('connection');
    if (connectionFromUrl && connections.some(c => c.id === connectionFromUrl)) {
      if (selectedConnectionId !== connectionFromUrl) {
        setSelectedConnectionId(connectionFromUrl);
        setActiveConnection(connectionFromUrl);
      }
    } else if (!connectionFromUrl && connections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
      setActiveConnection(connections[0].id);
    }
  }, [connections, searchParams, selectedConnectionId, setActiveConnection]);

  React.useEffect(() => {
    if (selectedConnectionId) {
      fetchTables();
      setSelectedTable(null);
      setColumns([]);
      setIndexes([]);
      setPreview(null);
    }
  }, [selectedConnectionId, fetchTables]);

  React.useEffect(() => {
    if (selectedTable) {
      fetchTableStructure(selectedTable);
    }
  }, [selectedTable, fetchTableStructure]);

  const handleSelectTable = React.useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setShowTablesOverview(false);
    setSidebarOpen(false);
  }, []);

  const handleSelectTablesOverview = React.useCallback(() => {
    setSelectedTable(null);
    setShowTablesOverview(true);
    setSidebarOpen(false);
  }, []);

  if (connections.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schema Browser</h1>
          <p className="text-muted-foreground">
            Explore your database schema and data.
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>No connections yet</CardTitle>
            <CardDescription>
              Add a database connection to start browsing your schema.
            </CardDescription>
            <Button asChild className="mt-4">
              <Link href="/guest/connections">
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4 gap-3 md:gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Schema Browser</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Explore your database schema and data.
          </p>
        </div>
        <Link href="/guest/query">
          <Button variant="outline" className="border-dashed gap-2">
            <SquareTerminal className="h-4 w-4" />
            Query Editor
          </Button>
        </Link>
      </div>

      {/* Mobile Schema Tree Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Schema Tree</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-60px)]">
            <SchemaTree
              tables={tables}
              loading={tablesLoading}
              selectedTable={selectedTable}
              showTablesOverview={showTablesOverview}
              onSelectTable={handleSelectTable}
              onSelectTablesOverview={handleSelectTablesOverview}
              onRefresh={fetchTables}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating Action Button for Mobile */}
      <Button
        className="fixed bottom-4 right-4 md:hidden z-50 rounded-full h-14 w-14 shadow-lg touch-target"
        onClick={() => setSidebarOpen(true)}
      >
        <Table2 className="h-6 w-6" />
        <span className="sr-only">Browse tables</span>
      </Button>

      <div className="flex-1 flex min-h-0 overflow-hidden rounded-lg border bg-card">
        {/* Collapsed Sidebar Expand Button */}
        {isSidebarCollapsed && (
          <div className="hidden md:flex flex-col items-center border-r py-2 px-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsSidebarCollapsed(false)}
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div 
          ref={sidebarRef}
          className="hidden md:flex flex-col border-r flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out"
          style={{ width: isSidebarCollapsed ? 0 : (sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH) }}
        >
          <SchemaTree
            tables={tables}
            loading={tablesLoading}
            selectedTable={selectedTable}
            showTablesOverview={showTablesOverview}
            onSelectTable={handleSelectTable}
            onSelectTablesOverview={handleSelectTablesOverview}
            onRefresh={fetchTables}
            onCollapse={() => setIsSidebarCollapsed(true)}
          />
        </div>

        {/* Resize Handle */}
        {!isSidebarCollapsed && (
          <div
            className="hidden md:flex items-center justify-center w-1 hover:w-1.5 bg-transparent hover:bg-primary/20 cursor-col-resize transition-all flex-shrink-0 group"
            onMouseDown={handleResizeStart}
          >
            <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col p-3 md:p-4 min-w-0 overflow-hidden">
            {selectedTable ? (
              <TableStructure
                tableName={selectedTable}
                columns={columns}
                indexes={indexes}
                preview={preview}
                loading={structureLoading}
                previewLoading={previewLoading}
                connectionId={selectedConnectionId}
                teamId={null}
                onLoadPreview={fetchPreview}
                onRefreshPreview={fetchPreview}
              />
            ) : showTablesOverview ? (
              <TablesSummary
                tables={tables}
                onSelectTable={handleSelectTable}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] md:min-h-[400px]">
                <Card className="border-dashed max-w-md w-full mx-4">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 text-3xl">🐿️</div>
                    <CardTitle className="text-lg">Select a table</CardTitle>
                    <CardDescription>
                      <span className="md:hidden">
                        Tap the button below to browse tables.
                      </span>
                      <span className="hidden md:inline">
                        Choose a table from the schema tree to view its structure and data.
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuestBrowsePage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <GuestBrowsePageContent />
    </React.Suspense>
  );
}
