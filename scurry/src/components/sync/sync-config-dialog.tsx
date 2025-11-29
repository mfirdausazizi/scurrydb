'use client';

import * as React from 'react';
import { ArrowRight, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SyncScope, SyncContent, ComparisonPanel } from '@/types/sync';

interface SyncConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePanel: ComparisonPanel | null;
  targetPanel: ComparisonPanel | null;
  selectedRowCount: number;
  canSync: boolean;
  blockedReason?: string;
  onExecute: (config: {
    scope: SyncScope;
    content: SyncContent;
  }) => void;
  isExecuting?: boolean;
}

export function SyncConfigDialog({
  open,
  onOpenChange,
  sourcePanel,
  targetPanel,
  selectedRowCount,
  canSync,
  blockedReason,
  onExecute,
  isExecuting = false,
}: SyncConfigDialogProps) {
  const [scope, setScope] = React.useState<SyncScope>('selected');
  const [includeStructure, setIncludeStructure] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setScope(selectedRowCount > 0 ? 'selected' : 'table');
      // Auto-enable structure sync if creating new table
      const isCreatingNewTable = !targetPanel?.tableName;
      setIncludeStructure(isCreatingNewTable);
      setShowPreview(false);
    }
  }, [open, selectedRowCount, targetPanel?.tableName]);

  const content: SyncContent = includeStructure ? 'both' : 'data';

  const handleExecute = () => {
    onExecute({ scope, content });
  };

  if (!sourcePanel || !targetPanel) {
    return null;
  }

  const isSameConnection = sourcePanel.connectionId === targetPanel.connectionId;
  const isSameTable = sourcePanel.tableName && targetPanel.tableName && sourcePanel.tableName === targetPanel.tableName;
  const isDifferentTable = sourcePanel.tableName && targetPanel.tableName && sourcePanel.tableName !== targetPanel.tableName;
  const isInvalidConfig = (isSameConnection && isSameTable) || isDifferentTable;
  const isCreatingTable = !targetPanel.tableName; // Will create table in target

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sync Configuration</DialogTitle>
          <DialogDescription>
            Configure how data should be synchronized between panels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Direction Display */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <p className="font-medium truncate max-w-[120px]">{sourcePanel.connectionName}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[120px]">
                {sourcePanel.tableName}
              </p>
              {sourcePanel.connectionType && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {sourcePanel.connectionType}
                </Badge>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="text-center">
              <p className="font-medium truncate max-w-[120px]">{targetPanel.connectionName}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[120px]">
                {targetPanel.tableName || (
                  <span className="text-green-600 dark:text-green-400">
                    {sourcePanel.tableName} (new)
                  </span>
                )}
              </p>
              {targetPanel.connectionType && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {targetPanel.connectionType}
                </Badge>
              )}
            </div>
          </div>

          {/* Info: Creating new table */}
          {isCreatingTable && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300">Creating New Table</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Table &quot;{sourcePanel.tableName}&quot; will be created in the target database with the same structure.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {!canSync && blockedReason && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">Sync Not Available</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{blockedReason}</p>
                </div>
              </div>
            </div>
          )}

          {isDifferentTable && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">Different Tables Selected</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Syncing is only allowed between the same table name across different connections.
                    Select &quot;{sourcePanel.tableName}&quot; in the target panel or deselect the table to create a new one.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSameConnection && isSameTable && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">Invalid Configuration</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Cannot sync a table to itself on the same connection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canSync && !isInvalidConfig && (
            <>
              {/* Scope Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Scope</Label>
                <div className="space-y-2">
                  <label
                    className={cn(
                      'flex items-center space-x-3 cursor-pointer',
                      selectedRowCount === 0 && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value="selected"
                      checked={scope === 'selected'}
                      onChange={() => setScope('selected')}
                      disabled={selectedRowCount === 0}
                      className="h-4 w-4 text-primary border-border"
                    />
                    <span className="flex items-center gap-2">
                      Selected rows only
                      <Badge variant="secondary" className="text-xs">
                        {selectedRowCount} rows
                      </Badge>
                    </span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      value="table"
                      checked={scope === 'table'}
                      onChange={() => setScope('table')}
                      className="h-4 w-4 text-primary border-border"
                    />
                    <span>Entire table</span>
                  </label>
                </div>
              </div>

              {/* Content Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Content</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="content-data"
                      checked={true}
                      disabled
                    />
                    <Label htmlFor="content-data" className="cursor-pointer">
                      Data rows
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="content-structure"
                      checked={includeStructure}
                      onCheckedChange={(checked) => setIncludeStructure(checked === true)}
                      disabled={isCreatingTable} // Required when creating new table
                    />
                    <Label htmlFor="content-structure" className="cursor-pointer">
                      Table structure (columns, indexes)
                      {isCreatingTable && (
                        <span className="ml-1 text-xs text-muted-foreground">(required for new table)</span>
                      )}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Warning for structure sync */}
              {includeStructure && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-300">Structure Sync Warning</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Structure synchronization may alter table columns and indexes.
                        This is a destructive operation that cannot be undone easily.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-sm">
                  This will sync{' '}
                  <strong>
                    {scope === 'selected' ? `${selectedRowCount} selected rows` : 'all rows'}
                  </strong>
                  {includeStructure && ' and table structure'} from{' '}
                  <strong>{sourcePanel.connectionName}</strong> to{' '}
                  <strong>{targetPanel.connectionName}</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!canSync || isInvalidConfig || isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Execute Sync'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
