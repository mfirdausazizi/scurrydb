'use client';

import * as React from 'react';
import { Key, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EditableResultsTable, PendingChangesPanel } from '@/components/results';
import { usePendingChangesStore, getStoreKey, emptyChanges } from '@/lib/store/pending-changes-store';
import type {
  ColumnDefinition,
  IndexInfo,
  QueryResult,
  DataChangeLog,
  PendingChanges,
} from '@/types';

interface TableStructureProps {
  tableName: string;
  columns: ColumnDefinition[];
  indexes: IndexInfo[];
  preview: QueryResult | null;
  loading: boolean;
  previewLoading: boolean;
  connectionId: string | null;
  onLoadPreview: () => void;
  onRefreshPreview: () => void;
}

export function TableStructure({
  tableName,
  columns,
  indexes,
  preview,
  loading,
  previewLoading,
  connectionId,
  onLoadPreview,
  onRefreshPreview,
}: TableStructureProps) {
  const [activeTab, setActiveTab] = React.useState('columns');
  const [isApplying, setIsApplying] = React.useState(false);
  const [changeHistory, setChangeHistory] = React.useState<DataChangeLog[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  // Get store key for current table
  const storeKey = connectionId ? getStoreKey(connectionId, tableName) : null;

  // Select pending changes for current table directly from store
  const tableChangesEntry = usePendingChangesStore((state) => 
    storeKey ? state.pendingChanges[storeKey] : undefined
  );
  
  // Get actions from store
  const setChangesForTable = usePendingChangesStore((state) => state.setChangesForTable);
  const clearChangesForTable = usePendingChangesStore((state) => state.clearChangesForTable);

  // Get primary key columns
  const primaryKeyColumns = React.useMemo(() => {
    return columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
  }, [columns]);

  // Get current pending changes (use stable empty reference if none)
  const pendingChanges: PendingChanges = tableChangesEntry?.changes ?? emptyChanges;

  React.useEffect(() => {
    if (activeTab === 'data' && !preview && !previewLoading) {
      onLoadPreview();
    }
  }, [activeTab, preview, previewLoading, onLoadPreview]);

  const handleChangesUpdate = React.useCallback(
    (changes: PendingChanges) => {
      if (!connectionId) return;
      setChangesForTable(connectionId, tableName, primaryKeyColumns, changes);
    },
    [connectionId, tableName, primaryKeyColumns, setChangesForTable]
  );

  const handleApplyChanges = async () => {
    if (!connectionId) {
      toast.error('No connection selected');
      return;
    }

    if (primaryKeyColumns.length === 0) {
      toast.error('Cannot edit table without primary key');
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch('/api/data/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          tableName,
          primaryKeyColumns,
          changes: pendingChanges,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply changes');
      }

      if (result.success) {
        const messages: string[] = [];
        if (result.insertedCount > 0) messages.push(`${result.insertedCount} inserted`);
        if (result.updatedCount > 0) messages.push(`${result.updatedCount} updated`);
        if (result.deletedCount > 0) messages.push(`${result.deletedCount} deleted`);
        
        toast.success('Changes applied successfully', {
          description: messages.join(', '),
        });
        
        clearChangesForTable(connectionId, tableName);
        onRefreshPreview();
      } else {
        toast.error('Some changes failed', {
          description: result.errors.join(', '),
        });
      }
    } catch (error) {
      toast.error('Failed to apply changes', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscardChanges = () => {
    if (connectionId) {
      clearChangesForTable(connectionId, tableName);
    }
  };

  const handleLoadHistory = async () => {
    if (!connectionId) return;

    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/data/changes/history?connectionId=${connectionId}&tableName=${encodeURIComponent(tableName)}&limit=50`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const logs = await response.json();
      const parsedLogs = logs.map((log: DataChangeLog) => ({
        ...log,
        appliedAt: new Date(log.appliedAt),
      }));
      setChangeHistory(parsedLogs);
    } catch (error) {
      toast.error('Failed to load change history');
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasChanges = pendingChanges.updates.length > 0 || 
    pendingChanges.inserts.length > 0 || 
    pendingChanges.deletes.length > 0;

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold truncate">{tableName}</h2>
        <Badge variant="outline" className="flex-shrink-0">{columns.length} columns</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
          <TabsTrigger value="data" className="relative">
            Data Preview
            {hasChanges && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="mt-4">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Nullable</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-[100px]">Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((column) => (
                  <TableRow key={column.name}>
                    <TableCell className="font-mono">{column.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {column.type}
                    </TableCell>
                    <TableCell>
                      {column.nullable ? (
                        <span className="text-muted-foreground">Yes</span>
                      ) : (
                        <span className="text-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-[200px] truncate">
                      {column.defaultValue || (
                        <span className="text-muted-foreground italic">NULL</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {column.isPrimaryKey && (
                        <Badge variant="default" className="gap-1">
                          <Key className="h-3 w-3" />
                          PK
                        </Badge>
                      )}
                      {column.isForeignKey && (
                        <Badge variant="secondary" className="gap-1">
                          <Hash className="h-3 w-3" />
                          FK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="indexes" className="mt-4">
          {indexes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No indexes found
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead className="w-[100px]">Unique</TableHead>
                    <TableHead className="w-[100px]">Primary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indexes.map((index) => (
                    <TableRow key={index.name}>
                      <TableCell className="font-mono">{index.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {index.columns.join(', ')}
                      </TableCell>
                      <TableCell>
                        {index.unique ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {index.primary ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-4 space-y-3">
          {previewLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            preview.error ? (
              <div className="text-center py-8 text-destructive">
                {preview.error}
              </div>
            ) : (
              <>
                <PendingChangesPanel
                  currentTableName={tableName}
                  currentConnectionId={connectionId}
                  onApply={handleApplyChanges}
                  onDiscard={handleDiscardChanges}
                  isApplying={isApplying}
                  changeHistory={changeHistory}
                  historyLoading={historyLoading}
                  onLoadHistory={handleLoadHistory}
                />
                {primaryKeyColumns.length > 0 ? (
                  <EditableResultsTable
                    result={preview}
                    primaryKeyColumns={primaryKeyColumns}
                    columnDefinitions={columns}
                    onChangesUpdate={handleChangesUpdate}
                    pendingChanges={pendingChanges}
                  />
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800 text-sm">
                    <strong>Read-only mode:</strong> This table has no primary key defined, so inline editing is disabled.
                    You can still filter and view the data.
                  </div>
                )}
              </>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Click to load data preview
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
