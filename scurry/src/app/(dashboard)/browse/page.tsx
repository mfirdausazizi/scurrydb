'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Database, Loader2, AlertTriangle, Table2, Users, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { SchemaTree, TableStructure } from '@/components/schema';
import { useConnections, useWorkspaceContext } from '@/hooks';
import { usePendingChangesStore } from '@/lib/store/pending-changes-store';
import type { TableInfo, ColumnDefinition, IndexInfo, QueryResult } from '@/types';

function BrowsePageContent() {
  const searchParams = useSearchParams();
  const { teamId, isTeamWorkspace } = useWorkspaceContext();
  const { connections, loading: connectionsLoading } = useConnections({ teamId });
  
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string | null>(
    searchParams.get('connection')
  );
  const [tables, setTables] = React.useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState<string | null>(null);
  const [columns, setColumns] = React.useState<ColumnDefinition[]>([]);
  const [indexes, setIndexes] = React.useState<IndexInfo[]>([]);
  const [structureLoading, setStructureLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<QueryResult | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState<number | null>(null); // null during SSR to avoid hydration mismatch
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Sidebar resize handlers
  const MIN_SIDEBAR_WIDTH = 160;
  const MAX_SIDEBAR_WIDTH = 400;
  const DEFAULT_SIDEBAR_WIDTH = 256;

  // Initialize sidebar width on client only to avoid hydration mismatch
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

  // Select all pending changes and compute total
  const allPendingChanges = usePendingChangesStore((state) => state.pendingChanges);
  const totalPendingChanges = React.useMemo(() => {
    return Object.values(allPendingChanges).reduce((total, tableChanges) => {
      return (
        total +
        tableChanges.changes.updates.length +
        tableChanges.changes.inserts.length +
        tableChanges.changes.deletes.length
      );
    }, 0);
  }, [allPendingChanges]);

  // Check if selected connection is a team/shared connection
  const selectedConnection = React.useMemo(() => {
    return connections.find(c => c.id === selectedConnectionId);
  }, [connections, selectedConnectionId]);
  
  const isSelectedConnectionShared = selectedConnection?.isShared === true;

  // Only pass teamId to API calls if the connection is actually a team connection
  const effectiveTeamId = isSelectedConnectionShared ? teamId : null;

  const fetchTables = React.useCallback(async () => {
    if (!selectedConnectionId) return;
    
    setTablesLoading(true);
    try {
      const params = new URLSearchParams({ connectionId: selectedConnectionId });
      if (effectiveTeamId) params.set('teamId', effectiveTeamId);
      
      const response = await fetch(`/api/schema/tables?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (error) {
      toast.error('Failed to load tables');
      console.error(error);
    } finally {
      setTablesLoading(false);
    }
  }, [selectedConnectionId, effectiveTeamId]);

  const fetchTableStructure = React.useCallback(async (tableName: string) => {
    if (!selectedConnectionId) return;
    
    setStructureLoading(true);
    setPreview(null);
    try {
      const params = new URLSearchParams({ connectionId: selectedConnectionId });
      if (effectiveTeamId) params.set('teamId', effectiveTeamId);
      
      const response = await fetch(
        `/api/schema/tables/${encodeURIComponent(tableName)}?${params.toString()}`
      );
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
  }, [selectedConnectionId, effectiveTeamId]);

  const fetchPreview = React.useCallback(async () => {
    if (!selectedConnectionId || !selectedTable) return;
    
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({ connectionId: selectedConnectionId, limit: '100' });
      if (effectiveTeamId) params.set('teamId', effectiveTeamId);
      
      const response = await fetch(
        `/api/schema/tables/${encodeURIComponent(selectedTable)}/preview?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch preview');
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      toast.error('Failed to load data preview');
      console.error(error);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedConnectionId, selectedTable, effectiveTeamId]);

  // Reset connection selection when workspace changes
  React.useEffect(() => {
    // Clear selected connection if it's not in the current workspace's connection list
    if (selectedConnectionId && connections.length > 0) {
      const connectionExists = connections.some(c => c.id === selectedConnectionId);
      if (!connectionExists) {
        setSelectedConnectionId(null);
        setSelectedTable(null);
        setTables([]);
        setColumns([]);
        setIndexes([]);
        setPreview(null);
      }
    } else if (selectedConnectionId && !connectionsLoading && connections.length === 0) {
      // No connections in this workspace, reset
      setSelectedConnectionId(null);
      setSelectedTable(null);
      setTables([]);
      setColumns([]);
      setIndexes([]);
      setPreview(null);
    }
  }, [connections, selectedConnectionId, connectionsLoading]);

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

  // Sync connection selection with URL parameter (set by header ConnectionSwitcher)
  React.useEffect(() => {
    const connectionFromUrl = searchParams.get('connection');
    if (connectionFromUrl && connections.some(c => c.id === connectionFromUrl)) {
      // URL has a valid connection, sync state with it
      if (selectedConnectionId !== connectionFromUrl) {
        setSelectedConnectionId(connectionFromUrl);
      }
    } else if (!connectionFromUrl && connections.length > 0 && !selectedConnectionId) {
      // No connection in URL and no selection, auto-select first one
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, searchParams, selectedConnectionId]);

  const handleSelectTable = React.useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setSidebarOpen(false);
  }, []);

  if (connectionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              {isTeamWorkspace ? (
                <Users className="h-6 w-6 text-primary" />
              ) : (
                <Database className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle>
              {isTeamWorkspace ? 'No shared connections' : 'No connections available'}
            </CardTitle>
            <CardDescription>
              {isTeamWorkspace 
                ? 'Team admins can share connections in team settings.'
                : 'Add a database connection to start browsing your schema.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4 gap-3 md:gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Schema Browser</h1>
            {totalPendingChanges > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {totalPendingChanges} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Explore your database schema and data.
          </p>
        </div>
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
              onSelectTable={handleSelectTable}
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
            onSelectTable={setSelectedTable}
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
                teamId={effectiveTeamId}
                onLoadPreview={fetchPreview}
                onRefreshPreview={fetchPreview}
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] md:min-h-[400px]">
                <Card className="border-dashed max-w-md w-full mx-4">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-2 text-3xl">🐿️</div>
                    <CardTitle className="text-lg">Select a table</CardTitle>
                    <CardDescription>
                      {/* Mobile hint */}
                      <span className="md:hidden">
                        Tap the button below to browse tables.
                      </span>
                      {/* Desktop hint */}
                      <span className="hidden md:inline">
                        Choose a table from the schema tree to view its structure and data.
                      </span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
          {/* Pagination will appear here from TableStructure */}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <BrowsePageContent />
    </React.Suspense>
  );
}
