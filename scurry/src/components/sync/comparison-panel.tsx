'use client';

import * as React from 'react';
import { Loader2, Table2, RefreshCw, CheckSquare, Square, MinusSquare, PanelLeft, Key, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchemaTree, TablesSummary } from '@/components/schema';
import { PanelHeader } from './panel-header';
import { cn } from '@/lib/utils';
import { serializePrimaryKey } from '@/lib/store/sync-store';
import type { TableInfo, ColumnDefinition, IndexInfo, QueryResult, DatabaseType } from '@/types';
import type { ComparisonPanel as ComparisonPanelType, RowDiffStatus } from '@/types/sync';

// Sidebar resize constants
const MIN_SIDEBAR_WIDTH = 140;
const MAX_SIDEBAR_WIDTH = 280;
const DEFAULT_SIDEBAR_WIDTH = 192;

interface Connection {
  id: string;
  name: string;
  type: DatabaseType;
  database: string;
  isShared?: boolean;
}

interface ComparisonPanelProps {
  panel: ComparisonPanelType;
  panelIndex: number;
  connections: Connection[];
  usedConnectionIds: string[]; // Connections already selected in other panels
  canRemove: boolean;
  scrollLockMode: 'off' | 'table' | 'row';
  onPanelUpdate: (updates: Partial<Omit<ComparisonPanelType, 'id'>>) => void;
  onRemove: () => void;
  onToggleRowSelection: (rowKey: string) => void;
  onSelectAllRows: (rowKeys: string[]) => void;
  onClearSelection: () => void;
  onTableSelect?: (tableName: string) => void; // For table lock mode
  teamId?: string | null;
  // Diff highlighting data (from comparison with other panels)
  rowDiffStatus?: Map<string, RowDiffStatus>;
  cellDiffs?: Map<string, Set<string>>; // rowKey -> Set of column names with diffs
}

export function ComparisonPanel({
  panel,
  panelIndex,
  connections,
  usedConnectionIds,
  canRemove,
  scrollLockMode,
  onPanelUpdate,
  onRemove,
  onToggleRowSelection,
  onSelectAllRows,
  onClearSelection,
  onTableSelect,
  teamId,
  rowDiffStatus,
  cellDiffs,
}: ComparisonPanelProps) {
  const [tables, setTables] = React.useState<TableInfo[]>([]);
  const [tablesLoading, setTablesLoading] = React.useState(false);
  const [columns, setColumns] = React.useState<ColumnDefinition[]>([]);
  const [indexes, setIndexes] = React.useState<IndexInfo[]>([]);
  const [preview, setPreview] = React.useState<QueryResult | null>(null);
  const [dataLoading, setDataLoading] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // View state
  const [viewTab, setViewTab] = React.useState<'data' | 'columns' | 'indexes'>('data');
  const [showTablesOverview, setShowTablesOverview] = React.useState(false);
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = React.useState<number | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Initialize sidebar width on client to avoid hydration mismatch
  React.useEffect(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  // Handle resize start
  const handleResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle resize mouse move and mouse up
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      
      const containerRect = sidebarRef.current.parentElement?.getBoundingClientRect();
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

  // Find selected connection
  const selectedConnection = React.useMemo(
    () => connections.find((c) => c.id === panel.connectionId),
    [connections, panel.connectionId]
  );

  // Get primary key columns
  const primaryKeyColumns = React.useMemo(
    () => columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
    [columns]
  );

  // Generate row keys for all rows
  const rowKeys = React.useMemo(() => {
    if (!preview || primaryKeyColumns.length === 0) return [];
    return preview.rows.map((row) => {
      const pk: Record<string, unknown> = {};
      primaryKeyColumns.forEach((col) => {
        pk[col] = row[col];
      });
      return serializePrimaryKey(pk);
    });
  }, [preview, primaryKeyColumns]);

  // Ensure selectedRowKeys is always a Set (handles hydration edge cases)
  const selectedRowKeys = React.useMemo(
    () => panel.selectedRowKeys instanceof Set ? panel.selectedRowKeys : new Set<string>(),
    [panel.selectedRowKeys]
  );

  // Selection state
  const allSelected = rowKeys.length > 0 && rowKeys.every((key) => selectedRowKeys.has(key));
  const someSelected = rowKeys.some((key) => selectedRowKeys.has(key));
  const noneSelected = !someSelected;

  // Fetch tables when connection changes
  const fetchTables = React.useCallback(async () => {
    if (!panel.connectionId) {
      setTables([]);
      return;
    }

    setTablesLoading(true);
    try {
      const params = new URLSearchParams({ connectionId: panel.connectionId });
      if (teamId) params.set('teamId', teamId);

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
  }, [panel.connectionId, teamId]);

  // Fetch table data when table changes
  const fetchTableData = React.useCallback(async () => {
    if (!panel.connectionId || !panel.tableName) {
      setColumns([]);
      setIndexes([]);
      setPreview(null);
      return;
    }

    setDataLoading(true);
    try {
      const params = new URLSearchParams({ connectionId: panel.connectionId });
      if (teamId) params.set('teamId', teamId);

      // Fetch structure (columns and indexes)
      const structureResponse = await fetch(
        `/api/schema/tables/${encodeURIComponent(panel.tableName)}?${params.toString()}`
      );
      if (!structureResponse.ok) {
        const errorData = await structureResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch table structure (${structureResponse.status})`);
      }
      const structureData = await structureResponse.json();
      setColumns(structureData.columns || []);
      setIndexes(structureData.indexes || []);

      // Fetch preview data
      params.set('limit', '500'); // Fetch more rows for comparison
      const previewResponse = await fetch(
        `/api/schema/tables/${encodeURIComponent(panel.tableName)}/preview?${params.toString()}`
      );
      if (!previewResponse.ok) {
        const errorData = await previewResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch table data (${previewResponse.status})`);
      }
      const previewData = await previewResponse.json();
      setPreview(previewData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load table data';
      toast.error(message);
      console.error('fetchTableData error:', error);
    } finally {
      setDataLoading(false);
    }
  }, [panel.connectionId, panel.tableName, teamId]);

  React.useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  React.useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  // Handle connection change
  const handleConnectionChange = (connectionId: string) => {
    const conn = connections.find((c) => c.id === connectionId);
    onPanelUpdate({
      connectionId,
      connectionName: conn?.name || '',
      connectionType: conn?.type || null,
      tableName: null, // Reset table when connection changes
      selectedRowKeys: new Set(),
    });
  };

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setShowTablesOverview(false);
    setViewTab('data');
    onPanelUpdate({
      tableName,
      selectedRowKeys: new Set(),
    });
    // If table lock is enabled, notify parent
    if (scrollLockMode === 'table' && onTableSelect) {
      onTableSelect(tableName);
    }
  };

  // Handle tables overview selection
  const handleSelectTablesOverview = () => {
    setShowTablesOverview(true);
    onPanelUpdate({
      tableName: null,
      selectedRowKeys: new Set(),
    });
  };

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (allSelected) {
      onClearSelection();
    } else {
      onSelectAllRows(rowKeys);
    }
  };

  // Get diff status color/style for a row
  const getRowDiffStyle = (rowKey: string): string => {
    if (!rowDiffStatus) return '';
    const status = rowDiffStatus.get(rowKey);
    switch (status) {
      case 'match':
        return 'bg-green-50 dark:bg-green-950/20';
      case 'different':
        return 'bg-amber-50 dark:bg-amber-950/20';
      case 'source-only':
        return 'bg-blue-50 dark:bg-blue-950/20';
      case 'target-only':
        return 'bg-red-50 dark:bg-red-950/20';
      default:
        return '';
    }
  };

  // Check if a cell has a diff
  const hasCellDiff = (rowKey: string, column: string): boolean => {
    if (!cellDiffs) return false;
    return cellDiffs.get(rowKey)?.has(column) || false;
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
      <PanelHeader
        panelId={panel.id}
        panelIndex={panelIndex}
        connectionId={panel.connectionId}
        connectionName={panel.connectionName}
        connectionType={panel.connectionType}
        tableName={panel.tableName}
        connections={connections}
        usedConnectionIds={usedConnectionIds}
        canRemove={canRemove}
        selectedRowCount={selectedRowKeys.size}
        onConnectionChange={handleConnectionChange}
        onRemove={onRemove}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Collapsed Sidebar Expand Button */}
        {isSidebarCollapsed && (
          <div className="flex flex-col items-center border-r py-2 px-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsSidebarCollapsed(false)}
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Schema Tree Sidebar */}
        <div 
          ref={sidebarRef}
          className="flex flex-col border-r flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out"
          style={{ width: isSidebarCollapsed ? 0 : (sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH) }}
        >
          <SchemaTree
            tables={tables}
            loading={tablesLoading}
            selectedTable={panel.tableName}
            showTablesOverview={showTablesOverview}
            onSelectTable={handleTableSelect}
            onSelectTablesOverview={handleSelectTablesOverview}
            onRefresh={fetchTables}
            onCollapse={() => setIsSidebarCollapsed(true)}
          />
        </div>

        {/* Resize Handle */}
        {!isSidebarCollapsed && (
          <div
            className="flex items-center justify-center w-1 hover:w-1.5 bg-transparent hover:bg-primary/20 cursor-col-resize transition-all flex-shrink-0 group"
            onMouseDown={handleResizeStart}
          >
            <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
          </div>
        )}

        {/* Data Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!panel.connectionId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a connection to browse</p>
            </div>
          ) : showTablesOverview ? (
            /* Tables Summary View */
            <div className="flex-1 p-3 overflow-hidden">
              <TablesSummary
                tables={tables}
                onSelectTable={handleTableSelect}
              />
            </div>
          ) : !panel.tableName ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Table2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>Select a table from the schema tree</p>
              </div>
            </div>
          ) : dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : preview ? (
            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Toolbar with Tabs */}
              <div className="flex items-center justify-between p-2 border-b bg-muted/20 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <TabsList className="h-7">
                    <TabsTrigger value="data" className="text-xs h-6 px-2">Data</TabsTrigger>
                    <TabsTrigger value="columns" className="text-xs h-6 px-2">Columns</TabsTrigger>
                    <TabsTrigger value="indexes" className="text-xs h-6 px-2">Indexes</TabsTrigger>
                  </TabsList>
                  
                  {viewTab === 'data' && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={handleSelectAllToggle}
                              disabled={rowKeys.length === 0}
                            >
                              {allSelected ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : someSelected ? (
                                <MinusSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {allSelected ? 'Deselect all' : 'Select all'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <span className="text-xs text-muted-foreground">
                        {preview.rows.length} rows
                      </span>
                      
                      {primaryKeyColumns.length === 0 && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          No PK - Read only
                        </Badge>
                      )}
                    </>
                  )}
                  
                  {viewTab === 'columns' && (
                    <span className="text-xs text-muted-foreground">{columns.length} columns</span>
                  )}
                  
                  {viewTab === 'indexes' && (
                    <span className="text-xs text-muted-foreground">{indexes.length} indexes</span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={fetchTableData}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Data Tab */}
              <TabsContent value="data" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollContainerRef}>
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {primaryKeyColumns.length > 0 && (
                          <TableHead className="w-10 px-2">
                            <span className="sr-only">Select</span>
                          </TableHead>
                        )}
                        {columns.map((col) => (
                          <TableHead key={col.name} className="text-xs whitespace-nowrap">
                            {col.name}
                            {col.isPrimaryKey && (
                              <span className="ml-1 text-amber-500">PK</span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, rowIndex) => {
                        const rowKey = rowKeys[rowIndex];
                        const isSelected = selectedRowKeys.has(rowKey);
                        const diffStyle = getRowDiffStyle(rowKey);

                        return (
                          <TableRow
                            key={rowKey || rowIndex}
                            className={cn(
                              isSelected && 'bg-primary/10',
                              diffStyle
                            )}
                          >
                            {primaryKeyColumns.length > 0 && (
                              <TableCell className="w-10 px-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => onToggleRowSelection(rowKey)}
                                />
                              </TableCell>
                            )}
                            {columns.map((col) => {
                              const value = row[col.name];
                              const hasDiff = hasCellDiff(rowKey, col.name);
                              const displayValue =
                                value === null ? (
                                  <span className="italic text-muted-foreground">NULL</span>
                                ) : typeof value === 'object' ? (
                                  JSON.stringify(value)
                                ) : (
                                  String(value)
                                );

                              return (
                                <TableCell
                                  key={col.name}
                                  className={cn(
                                    'text-xs font-mono max-w-[200px] truncate',
                                    hasDiff && 'bg-amber-200 dark:bg-amber-800/50'
                                  )}
                                >
                                  {displayValue}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                      {preview.rows.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length + (primaryKeyColumns.length > 0 ? 1 : 0)}
                            className="text-center text-muted-foreground py-8"
                          >
                            No data in this table
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Columns Tab */}
              <TabsContent value="columns" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs w-[80px]">Nullable</TableHead>
                        <TableHead className="text-xs">Default</TableHead>
                        <TableHead className="text-xs w-[80px]">Key</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {columns.map((col) => (
                        <TableRow key={col.name}>
                          <TableCell className="text-xs font-mono">{col.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{col.type}</TableCell>
                          <TableCell className="text-xs">
                            {col.nullable ? (
                              <span className="text-muted-foreground">Yes</span>
                            ) : (
                              <span>No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono max-w-[150px] truncate">
                            {col.defaultValue || (
                              <span className="text-muted-foreground italic">NULL</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {col.isPrimaryKey && (
                              <Badge variant="default" className="gap-1 text-[10px] h-5">
                                <Key className="h-3 w-3" />
                                PK
                              </Badge>
                            )}
                            {col.isForeignKey && (
                              <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                                <Hash className="h-3 w-3" />
                                FK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {columns.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No columns found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Indexes Tab */}
              <TabsContent value="indexes" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {indexes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground py-8">
                      No indexes found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Columns</TableHead>
                          <TableHead className="text-xs w-[80px]">Unique</TableHead>
                          <TableHead className="text-xs w-[80px]">Primary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indexes.map((idx) => (
                          <TableRow key={idx.name}>
                            <TableCell className="text-xs font-mono">{idx.name}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {idx.columns.join(', ')}
                            </TableCell>
                            <TableCell className="text-xs">
                              {idx.unique ? (
                                <Badge variant="default" className="text-[10px] h-5">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {idx.primary ? (
                                <Badge variant="default" className="text-[10px] h-5">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Failed to load table data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
