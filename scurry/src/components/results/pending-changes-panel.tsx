'use client';

import * as React from 'react';
import { Save, X, AlertTriangle, Loader2, History, ChevronDown, ChevronUp, Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { usePendingChangesStore, getStoreKey, emptyChanges } from '@/lib/store/pending-changes-store';
import type { PendingChanges, DataChangeLog, PendingCellChange, PendingRowInsert, PendingRowDelete } from '@/types';
import { escapeValueForDisplay } from '@/lib/db/sql-utils';

// SQL preview generation helpers (display only - NOT for execution)
// These generate SQL for preview purposes. Actual execution uses parameterized queries.

function generateUpdateSqlPreview(
  tableName: string,
  update: PendingCellChange,
  primaryKeyColumns: string[],
  rowData: Record<string, unknown>
): string {
  const setClause = `${update.column} = ${escapeValueForDisplay(update.newValue)}`;
  const whereClause = primaryKeyColumns
    .map((pk) => `${pk} = ${escapeValueForDisplay(rowData[pk])}`)
    .join(' AND ');
  return `-- Preview only (actual execution uses parameterized queries)\nUPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`;
}

function generateInsertSqlPreview(tableName: string, insert: PendingRowInsert): string {
  const columns = Object.keys(insert.values).join(', ');
  const values = Object.values(insert.values).map(escapeValueForDisplay).join(', ');
  return `-- Preview only (actual execution uses parameterized queries)\nINSERT INTO ${tableName} (${columns}) VALUES (${values});`;
}

function generateDeleteSqlPreview(
  tableName: string,
  del: PendingRowDelete,
  primaryKeyColumns: string[]
): string {
  const whereClause = primaryKeyColumns
    .map((pk) => `${pk} = ${escapeValueForDisplay(del.rowData[pk])}`)
    .join(' AND ');
  return `-- Preview only (actual execution uses parameterized queries)\nDELETE FROM ${tableName} WHERE ${whereClause};`;
}

interface PendingChangesPanelProps {
  currentTableName: string;
  currentConnectionId: string | null;
  onApply: () => Promise<void>;
  onDiscard: () => void;
  isApplying: boolean;
  changeHistory?: DataChangeLog[];
  historyLoading?: boolean;
  onLoadHistory?: () => void;
  primaryKeyColumns?: string[];
  previewData?: Record<string, unknown>[];
}

export function PendingChangesPanel({
  currentTableName,
  currentConnectionId,
  onApply,
  onDiscard,
  isApplying,
  changeHistory = [],
  historyLoading = false,
  onLoadHistory,
  primaryKeyColumns = [],
  previewData = [],
}: PendingChangesPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = React.useState(false);
  const [showAllTables, setShowAllTables] = React.useState(false);
  const [showChangesPreview, setShowChangesPreview] = React.useState(false);

  // Get store key for current table
  const currentStoreKey = currentConnectionId ? getStoreKey(currentConnectionId, currentTableName) : null;

  // Select all pending changes from store
  const allPendingChangesMap = usePendingChangesStore((state) => state.pendingChanges);

  // Compute derived values
  const allPendingChanges = React.useMemo(() => Object.values(allPendingChangesMap), [allPendingChangesMap]);
  
  const totalChangesCount = React.useMemo(() => {
    return allPendingChanges.reduce((total, tableChanges) => {
      return (
        total +
        tableChanges.changes.updates.length +
        tableChanges.changes.inserts.length +
        tableChanges.changes.deletes.length
      );
    }, 0);
  }, [allPendingChanges]);

  const currentChanges: PendingChanges = currentStoreKey 
    ? (allPendingChangesMap[currentStoreKey]?.changes ?? emptyChanges)
    : emptyChanges;

  const currentTableChangesCount = 
    currentChanges.updates.length + currentChanges.inserts.length + currentChanges.deletes.length;

  const otherTablesWithChanges = React.useMemo(() => {
    return allPendingChanges.filter(
      (tc) => !(tc.connectionId === currentConnectionId && tc.tableName === currentTableName)
    );
  }, [allPendingChanges, currentConnectionId, currentTableName]);

  const hasCurrentTableChanges = currentTableChangesCount > 0;
  const hasOtherChanges = otherTablesWithChanges.length > 0;

  const handleApply = async () => {
    setShowConfirmDialog(false);
    await onApply();
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    onDiscard();
  };

  if (!hasCurrentTableChanges && !hasOtherChanges) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">No pending changes</span>
        {onLoadHistory && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1" onClick={onLoadHistory}>
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Change History</SheetTitle>
                <SheetDescription>
                  Recent changes to {currentTableName}
                </SheetDescription>
              </SheetHeader>
              <ChangeHistoryList
                history={changeHistory}
                loading={historyLoading}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Current Table Changes */}
        {hasCurrentTableChanges && (
          <div className="flex items-center justify-between py-2 px-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 flex-wrap">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">Pending:</span>
                {currentChanges.inserts.length > 0 && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300">
                    {currentChanges.inserts.length} insert{currentChanges.inserts.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {currentChanges.updates.length > 0 && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300">
                    {currentChanges.updates.length} update{currentChanges.updates.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {currentChanges.deletes.length > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-300">
                    {currentChanges.deletes.length} delete{currentChanges.deletes.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onLoadHistory && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={onLoadHistory}>
                      <History className="h-3.5 w-3.5" />
                      History
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Change History</SheetTitle>
                      <SheetDescription>
                        Recent changes to {currentTableName}
                      </SheetDescription>
                    </SheetHeader>
                    <ChangeHistoryList
                      history={changeHistory}
                      loading={historyLoading}
                    />
                  </SheetContent>
                </Sheet>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiscardDialog(true)}
                disabled={isApplying}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={isApplying}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Apply
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Expandable Changes Preview */}
        {hasCurrentTableChanges && (
          <Collapsible open={showChangesPreview} onOpenChange={setShowChangesPreview}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  View Changes
                </span>
                {showChangesPreview ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <TooltipProvider>
                <div className="mt-2 p-3 rounded-md border bg-muted/50 space-y-3 max-h-[200px] overflow-auto">
                  {/* Updates */}
                  {currentChanges.updates.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-amber-700 dark:text-amber-400">Updates</h5>
                      {currentChanges.updates.map((update, i) => {
                        const rowData = previewData[update.rowIndex] || {};
                        const sql = generateUpdateSqlPreview(currentTableName, update, primaryKeyColumns, rowData);
                        return (
                          <div key={i} className="flex items-center justify-between text-xs gap-2">
                            <span className="truncate flex-1">
                              <span className="font-mono text-muted-foreground">{update.column}:</span>{' '}
                              <span className="text-red-600 line-through">{String(update.oldValue)}</span>{' → '}
                              <span className="text-green-600">{String(update.newValue)}</span>
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                  <Code className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-md">
                                <pre className="text-xs font-mono whitespace-pre-wrap">{sql}</pre>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inserts */}
                  {currentChanges.inserts.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-green-700 dark:text-green-400">Inserts</h5>
                      {currentChanges.inserts.map((insert) => {
                        const sql = generateInsertSqlPreview(currentTableName, insert);
                        return (
                          <div key={insert.tempId} className="flex items-center justify-between text-xs gap-2">
                            <span className="truncate flex-1 font-mono">
                              {JSON.stringify(insert.values)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                  <Code className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-md">
                                <pre className="text-xs font-mono whitespace-pre-wrap">{sql}</pre>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Deletes */}
                  {currentChanges.deletes.length > 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-red-700 dark:text-red-400">Deletes</h5>
                      {currentChanges.deletes.map((del) => {
                        const sql = generateDeleteSqlPreview(currentTableName, del, primaryKeyColumns);
                        return (
                          <div key={del.rowIndex} className="flex items-center justify-between text-xs gap-2">
                            <span className="truncate flex-1 font-mono">
                              Row {del.rowIndex}: {JSON.stringify(del.rowData)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                  <Code className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-md">
                                <pre className="text-xs font-mono whitespace-pre-wrap">{sql}</pre>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Other Tables with Changes */}
        {hasOtherChanges && (
          <Collapsible open={showAllTables} onOpenChange={setShowAllTables}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  {otherTablesWithChanges.length} other table{otherTablesWithChanges.length !== 1 ? 's' : ''} with pending changes
                </span>
                {showAllTables ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-1 pl-2">
                {otherTablesWithChanges.map((tc) => {
                  const count = tc.changes.updates.length + tc.changes.inserts.length + tc.changes.deletes.length;
                  return (
                    <div
                      key={`${tc.connectionId}:${tc.tableName}`}
                      className="text-xs text-muted-foreground flex items-center gap-2 py-1"
                    >
                      <span className="font-mono">{tc.tableName}</span>
                      <Badge variant="secondary" className="h-4 text-xs">
                        {count} change{count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Confirm Apply Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Changes</DialogTitle>
            <DialogDescription>
              You are about to apply the following changes to <strong>{currentTableName}</strong>:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {currentChanges.inserts.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
                  Inserts ({currentChanges.inserts.length})
                </h4>
                <div className="text-xs text-muted-foreground max-h-24 overflow-auto">
                  {currentChanges.inserts.map((insert) => (
                    <div key={insert.tempId} className="py-0.5">
                      New row with values: {JSON.stringify(insert.values)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentChanges.updates.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Updates ({currentChanges.updates.length})
                </h4>
                <div className="text-xs text-muted-foreground max-h-24 overflow-auto">
                  {currentChanges.updates.map((update) => (
                    <div key={`${update.rowIndex}-${update.column}`} className="py-0.5">
                      Row {update.rowIndex}: {update.column}: {String(update.oldValue)} → {String(update.newValue)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentChanges.deletes.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                  Deletes ({currentChanges.deletes.length})
                </h4>
                <div className="text-xs text-muted-foreground max-h-24 overflow-auto">
                  {currentChanges.deletes.map((del) => (
                    <div key={del.rowIndex} className="py-0.5">
                      Delete row {del.rowIndex}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="bg-amber-600 hover:bg-amber-700">
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Discard Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
            <DialogDescription>
              Are you sure you want to discard all {currentTableChangesCount} pending change{currentTableChangesCount !== 1 ? 's' : ''} for {currentTableName}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ChangeHistoryListProps {
  history: DataChangeLog[];
  loading: boolean;
}

function ChangeHistoryList({ history, loading }: ChangeHistoryListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No change history found
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] mt-4">
      <div className="space-y-3 pr-4">
        {history.map((log) => (
          <div
            key={log.id}
            className={cn(
              'p-3 rounded-md border text-sm',
              log.operation === 'INSERT' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
              log.operation === 'UPDATE' && 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
              log.operation === 'DELETE' && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <Badge
                variant="outline"
                className={cn(
                  log.operation === 'INSERT' && 'bg-green-100 text-green-800 border-green-300',
                  log.operation === 'UPDATE' && 'bg-amber-100 text-amber-800 border-amber-300',
                  log.operation === 'DELETE' && 'bg-red-100 text-red-800 border-red-300'
                )}
              >
                {log.operation}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {log.appliedAt.toLocaleString()}
              </span>
            </div>
            {log.user && (
              <div className="text-xs text-muted-foreground mb-1">
                By: {log.user.name || log.user.email}
              </div>
            )}
            {log.operation === 'UPDATE' && log.oldValues && log.newValues && (
              <div className="text-xs font-mono space-y-1">
                {Object.keys(log.newValues).map((key) => (
                  <div key={key}>
                    <span className="text-muted-foreground">{key}:</span>{' '}
                    <span className="text-red-600 line-through">{String(log.oldValues![key])}</span>{' → '}
                    <span className="text-green-600">{String(log.newValues![key])}</span>
                  </div>
                ))}
              </div>
            )}
            {log.operation === 'INSERT' && log.newValues && (
              <div className="text-xs font-mono truncate">
                {JSON.stringify(log.newValues)}
              </div>
            )}
            {log.operation === 'DELETE' && log.oldValues && (
              <div className="text-xs font-mono truncate">
                {JSON.stringify(log.oldValues)}
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
