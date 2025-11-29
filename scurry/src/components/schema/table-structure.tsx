'use client';

import * as React from 'react';
import { Loader2, Key, Hash, Copy, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EditableResultsTable, PendingChangesPanel } from '@/components/results';
import { usePendingChangesStore, getStoreKey, emptyChanges } from '@/lib/store/pending-changes-store';
import type {
  ColumnDefinition,
  IndexInfo,
  QueryResult,
  DataChangeLog,
  PendingChanges,
} from '@/types';
import type { ServerSearchParams } from './schema-filter';

interface TableStructureProps {
  tableName: string;
  columns: ColumnDefinition[];
  indexes: IndexInfo[];
  preview: QueryResult | null;
  loading: boolean;
  previewLoading: boolean;
  connectionId: string | null;
  teamId?: string | null;
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
  teamId,
  onLoadPreview,
  onRefreshPreview,
}: TableStructureProps) {
  const [activeTab, setActiveTab] = React.useState('data');
  const [isApplying, setIsApplying] = React.useState(false);
  const [changeHistory, setChangeHistory] = React.useState<DataChangeLog[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  
  // Server-side search state
  const [searchResults, setSearchResults] = React.useState<QueryResult | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeSearchParams, setActiveSearchParams] = React.useState<ServerSearchParams | null>(null);

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

  // Determine which data to display (search results or preview)
  const displayData = searchResults ?? preview;
  const isServerSearchActive = searchResults !== null;
  
  // Pagination calculations
  const totalRows = displayData?.rows.length ?? 0;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  
  // Create paginated result for display
  const paginatedPreview = React.useMemo(() => {
    if (!displayData) return null;
    return {
      ...displayData,
      rows: displayData.rows.slice(startIndex, endIndex),
    };
  }, [displayData, startIndex, endIndex]);

  // Reset to page 1 when table changes or rows per page changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [tableName, rowsPerPage]);

  // Reset search state when table changes
  React.useEffect(() => {
    setSearchResults(null);
    setActiveSearchParams(null);
    setIsSearching(false);
  }, [tableName]);

  // Load preview immediately when component mounts or when switching to data tab
  React.useEffect(() => {
    if (!preview && !previewLoading) {
      onLoadPreview();
    }
  }, [preview, previewLoading, onLoadPreview]);

  // Handle server-side search
  const handleServerSearch = React.useCallback(async (params: ServerSearchParams | null) => {
    setActiveSearchParams(params);
    
    // If clearing search, reset to normal preview
    if (!params) {
      setSearchResults(null);
      setIsSearching(false);
      setCurrentPage(1);
      return;
    }

    if (!connectionId) return;

    setIsSearching(true);
    setCurrentPage(1);
    
    try {
      const searchUrl = new URL(`/api/schema/tables/${encodeURIComponent(tableName)}/search`, window.location.origin);
      searchUrl.searchParams.set('connectionId', connectionId);
      searchUrl.searchParams.set('search', params.searchTerm);
      searchUrl.searchParams.set('limit', '500'); // Get more results for search
      if (teamId) {
        searchUrl.searchParams.set('teamId', teamId);
      }
      // Add each column
      params.searchColumns.forEach(col => {
        searchUrl.searchParams.append('columns', col);
      });

      const response = await fetch(searchUrl.toString());
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      const result = await response.json();
      setSearchResults(result);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [connectionId, tableName, teamId]);

  // Copy handlers
  const handleCopyColumns = React.useCallback(async () => {
    const data = columns.map(c => ({
      name: c.name,
      type: c.type,
      nullable: c.nullable,
      defaultValue: c.defaultValue,
      isPrimaryKey: c.isPrimaryKey,
      isForeignKey: c.isForeignKey,
    }));
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Columns copied to clipboard');
  }, [columns]);

  const handleCopyIndexes = React.useCallback(async () => {
    const data = indexes.map(i => ({
      name: i.name,
      columns: i.columns,
      unique: i.unique,
      primary: i.primary,
    }));
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Indexes copied to clipboard');
  }, [indexes]);

  const handleCopyPreview = React.useCallback(async () => {
    if (!displayData || displayData.rows.length === 0) return;
    await navigator.clipboard.writeText(JSON.stringify(displayData.rows, null, 2));
    toast.success(`${displayData.rows.length} ${isServerSearchActive ? 'search results' : 'rows'} copied to clipboard`);
  }, [displayData, isServerSearchActive]);

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
    <>
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold truncate">{tableName}</h2>
          <Badge variant="outline" className="flex-shrink-0">{columns.length} columns</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="flex-shrink-0">
          <TabsTrigger value="data" className="relative">
            Data Preview
            {hasChanges && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="indexes">Indexes</TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="mt-4 flex-1 overflow-auto min-h-0">
          <TooltipProvider>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{columns.length} columns</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleCopyColumns} className="h-8 gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy as JSON</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
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

        <TabsContent value="indexes" className="mt-4 flex-1 overflow-auto min-h-0">
          <TooltipProvider>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{indexes.length} indexes</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleCopyIndexes} className="h-8 gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy as JSON</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
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

        <TabsContent value="data" className="mt-4 flex-1 flex flex-col overflow-hidden min-h-0">
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
                {/* Search indicator */}
                {isServerSearchActive && activeSearchParams && (
                  <div className="flex-shrink-0 mb-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800 text-sm flex items-center justify-between">
                    <span>
                      Showing search results for &quot;{activeSearchParams.searchTerm}&quot; 
                      {' '}in {activeSearchParams.searchColumns.length === columns.length 
                        ? 'all columns' 
                        : activeSearchParams.searchColumns.join(', ')}
                      {' '}({totalRows} results)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => handleServerSearch(null)}
                    >
                      Clear search
                    </Button>
                  </div>
                )}

                {/* Controls at top - fixed, doesn't scroll */}
                <div className="flex-shrink-0 mb-3">
                  <PendingChangesPanel
                    currentTableName={tableName}
                    currentConnectionId={connectionId}
                    onApply={handleApplyChanges}
                    onDiscard={handleDiscardChanges}
                    isApplying={isApplying}
                    changeHistory={changeHistory}
                    historyLoading={historyLoading}
                    onLoadHistory={handleLoadHistory}
                    primaryKeyColumns={primaryKeyColumns}
                    previewData={displayData?.rows as Record<string, unknown>[] ?? []}
                  />
                </div>

                {/* Table content - let EditableResultsTable manage its own scrolling */}
                <div className="flex-1 flex flex-col min-h-0">
                  {primaryKeyColumns.length > 0 ? (
                    <EditableResultsTable
                      result={paginatedPreview!}
                      primaryKeyColumns={primaryKeyColumns}
                      columnDefinitions={columns}
                      onChangesUpdate={handleChangesUpdate}
                      pendingChanges={pendingChanges}
                      pageOffset={startIndex}
                      onServerSearch={handleServerSearch}
                      isSearching={isSearching}
                      isServerSearchActive={isServerSearchActive}
                    />
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800 text-sm">
                      <strong>Read-only mode:</strong> This table has no primary key defined, so inline editing is disabled.
                      You can still filter and view the data.
                    </div>
                  )}
                </div>
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

      {/* Pagination Footer - Fixed at bottom, outside scroll area */}
      {activeTab === 'data' && displayData && !displayData.error && totalRows > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t mt-3 flex-shrink-0">
          {/* Row count on left */}
          <span className="text-sm text-muted-foreground order-2 sm:order-1">
            Showing {startIndex + 1}-{endIndex} of {totalRows} {isServerSearchActive ? 'search results' : 'rows'}
          </span>

          {/* Pagination controls in center */}
          <div className="flex items-center gap-1 order-1 sm:order-2">
            {/* First page button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[100px] text-center">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {/* Last page button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="h-8 w-8 p-0"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Rows per page and copy on right */}
          <div className="flex items-center gap-3 order-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => setRowsPerPage(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCopyPreview} 
                    className="h-8 gap-1.5"
                    disabled={!displayData || displayData.rows.length === 0}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy all {isServerSearchActive ? 'search results' : 'rows'} as JSON</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </>
  );
}
