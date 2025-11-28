'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Database, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SchemaTree, TableStructure } from '@/components/schema';
import { useConnections } from '@/hooks';
import { usePendingChangesStore } from '@/lib/store/pending-changes-store';
import type { TableInfo, ColumnDefinition, IndexInfo, QueryResult } from '@/types';

function BrowsePageContent() {
  const searchParams = useSearchParams();
  const { connections, loading: connectionsLoading } = useConnections();
  
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

  const fetchTables = React.useCallback(async () => {
    if (!selectedConnectionId) return;
    
    setTablesLoading(true);
    try {
      const response = await fetch(`/api/schema/tables?connectionId=${selectedConnectionId}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (error) {
      toast.error('Failed to load tables');
      console.error(error);
    } finally {
      setTablesLoading(false);
    }
  }, [selectedConnectionId]);

  const fetchTableStructure = React.useCallback(async (tableName: string) => {
    if (!selectedConnectionId) return;
    
    setStructureLoading(true);
    setPreview(null);
    try {
      const response = await fetch(
        `/api/schema/tables/${encodeURIComponent(tableName)}?connectionId=${selectedConnectionId}`
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
  }, [selectedConnectionId]);

  const fetchPreview = React.useCallback(async () => {
    if (!selectedConnectionId || !selectedTable) return;
    
    setPreviewLoading(true);
    try {
      const response = await fetch(
        `/api/schema/tables/${encodeURIComponent(selectedTable)}/preview?connectionId=${selectedConnectionId}&limit=100`
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
  }, [selectedConnectionId, selectedTable]);

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

  React.useEffect(() => {
    if (!selectedConnectionId && connections.length > 0) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

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
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>No connections available</CardTitle>
            <CardDescription>
              Add a database connection to start browsing your schema.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Schema Browser</h1>
            {totalPendingChanges > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {totalPendingChanges} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Explore your database schema and data.
          </p>
        </div>
        <Select value={selectedConnectionId || ''} onValueChange={setSelectedConnectionId}>
          <SelectTrigger className="w-[250px] flex-shrink-0">
            <SelectValue placeholder="Select connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: conn.color || '#8B5A2B' }}
                  />
                  <span className="truncate">{conn.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden rounded-lg border bg-card">
        <div className="w-64 border-r flex-shrink-0 overflow-hidden">
          <SchemaTree
            tables={tables}
            loading={tablesLoading}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            onRefresh={fetchTables}
          />
        </div>

        <div className="flex-1 overflow-auto p-4 min-w-0">
          {selectedTable ? (
            <TableStructure
              tableName={selectedTable}
              columns={columns}
              indexes={indexes}
              preview={preview}
              loading={structureLoading}
              previewLoading={previewLoading}
              connectionId={selectedConnectionId}
              onLoadPreview={fetchPreview}
              onRefreshPreview={fetchPreview}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="border-dashed max-w-md">
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Select a table</CardTitle>
                  <CardDescription>
                    Choose a table from the schema tree to view its structure and data.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}
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
