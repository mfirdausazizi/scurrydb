'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ColumnDefinition } from '@/types';

interface EditRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowData: Record<string, unknown> | null;
  rowIndex: number;
  columns: ColumnDefinition[];
  primaryKeyColumns: string[];
  onSave: (rowIndex: number, changes: Record<string, unknown>) => void;
  isDeleted?: boolean;
  onDelete?: (rowIndex: number) => void;
  onRestore?: (rowIndex: number) => void;
}

// Detect if a value is long text or JSON/array
function isLongField(value: unknown, colType?: string): boolean {
  if (value === null || value === undefined) return false;
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const type = colType?.toLowerCase() || '';
  // Long if: > 50 chars, starts with [ or {, or type indicates JSON/text
  return (
    str.length > 50 ||
    /^[\[{]/.test(str.trim()) ||
    type.includes('json') ||
    type.includes('text') ||
    type.includes('blob')
  );
}

// Try to format JSON, return original if not valid JSON
function tryFormatJson(value: string): { formatted: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(value);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: value, isJson: false };
  }
}

export function EditRowDialog({
  open,
  onOpenChange,
  rowData,
  rowIndex,
  columns,
  primaryKeyColumns,
  onSave,
  isDeleted,
  onDelete,
  onRestore,
}: EditRowDialogProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = React.useState(false);

  // Initialize values when row data changes
  React.useEffect(() => {
    if (rowData && open) {
      const initialValues: Record<string, string> = {};
      columns.forEach((col) => {
        const value = rowData[col.name];
        if (value === null || value === undefined) {
          initialValues[col.name] = '';
        } else if (typeof value === 'object') {
          initialValues[col.name] = JSON.stringify(value, null, 2);
        } else {
          initialValues[col.name] = String(value);
        }
      });
      setValues(initialValues);
      setIsDirty(false);
    }
  }, [rowData, columns, open]);

  const handleChange = (columnName: string, value: string) => {
    setValues((prev) => ({ ...prev, [columnName]: value }));
    setIsDirty(true);
  };

  const handleFormatJson = (columnName: string) => {
    const currentValue = values[columnName] || '';
    const { formatted, isJson } = tryFormatJson(currentValue);
    if (isJson) {
      setValues((prev) => ({ ...prev, [columnName]: formatted }));
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    if (!rowData || !isDirty) {
      onOpenChange(false);
      return;
    }

    const changes: Record<string, unknown> = {};
    columns.forEach((col) => {
      const newValue = values[col.name];
      const originalValue = rowData[col.name];
      let originalStr: string;
      
      if (originalValue === null || originalValue === undefined) {
        originalStr = '';
      } else if (typeof originalValue === 'object') {
        originalStr = JSON.stringify(originalValue, null, 2);
      } else {
        originalStr = String(originalValue);
      }

      if (newValue !== originalStr) {
        // Convert empty string to null
        if (newValue === '') {
          changes[col.name] = null;
        } else {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(newValue);
            changes[col.name] = parsed;
          } catch {
            // Not JSON, check if it's a number
            if (!isNaN(Number(newValue)) && newValue.trim() !== '') {
              changes[col.name] = Number(newValue);
            } else {
              changes[col.name] = newValue;
            }
          }
        }
      }
    });

    if (Object.keys(changes).length > 0) {
      onSave(rowIndex, changes);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete?.(rowIndex);
    onOpenChange(false);
  };

  const handleRestore = () => {
    onRestore?.(rowIndex);
    onOpenChange(false);
  };

  if (!rowData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            Edit Row
            {isDeleted && (
              <Badge variant="destructive" className="text-xs">
                Marked for deletion
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View and edit all fields for this row. Changes will be staged until you commit.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 overflow-auto">
          <div className="space-y-4 pb-4">
            {columns.map((col) => {
              const isPK = primaryKeyColumns.includes(col.name);
              const value = values[col.name] ?? '';
              const originalValue = rowData[col.name];
              const useLongField = isLongField(originalValue, col.type);
              const { isJson } = tryFormatJson(value);

              return (
                <div key={col.name} className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor={col.name} className="font-mono text-sm">
                      {col.name}
                    </Label>
                    {isPK && (
                      <Badge variant="default" className="text-xs h-5">
                        PK
                      </Badge>
                    )}
                    {!col.nullable && (
                      <Badge variant="outline" className="text-xs h-5">
                        Required
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs h-5 font-normal">
                      {col.type}
                    </Badge>
                    {useLongField && isJson && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-xs"
                        onClick={() => handleFormatJson(col.name)}
                        disabled={isDeleted}
                      >
                        Format JSON
                      </Button>
                    )}
                  </div>
                  {useLongField ? (
                    <Textarea
                      id={col.name}
                      value={value}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      placeholder={col.nullable ? 'NULL' : `Enter ${col.name}`}
                      disabled={isDeleted}
                      className={cn(
                        'min-h-[120px] font-mono text-sm resize-y',
                        isJson && 'font-mono'
                      )}
                    />
                  ) : (
                    <Input
                      id={col.name}
                      value={value}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      placeholder={col.nullable ? 'NULL' : `Enter ${col.name}`}
                      disabled={isDeleted}
                      className="h-10 font-mono text-sm"
                    />
                  )}
                  {col.defaultValue && (
                    <p className="text-xs text-muted-foreground">
                      Default: {col.defaultValue}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t bg-background">
          {isDeleted ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                Close
              </Button>
              <Button
                variant="default"
                onClick={handleRestore}
                className="flex-1 sm:flex-none"
              >
                Restore Row
              </Button>
            </>
          ) : (
            <>
              {onDelete && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isDirty}
              >
                Save Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
