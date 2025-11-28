'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ColumnDefinition } from '@/types';

interface EditableRowSheetProps {
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

export function EditableRowSheet({
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
}: EditableRowSheetProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = React.useState(false);

  // Detect if a value is long text or JSON/array (should use textarea)
  const isLongField = React.useCallback((value: unknown, colType?: string): boolean => {
    if (value === null || value === undefined) return false;
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const type = colType?.toLowerCase() || '';
    return (
      str.length > 50 ||
      /^[\[{]/.test(str.trim()) ||
      type.includes('json') ||
      type.includes('text') ||
      type.includes('blob')
    );
  }, []);

  // Initialize values when row data changes
  React.useEffect(() => {
    if (rowData && open) {
      const initialValues: Record<string, string> = {};
      columns.forEach((col) => {
        const value = rowData[col.name];
        if (value === null || value === undefined) {
          initialValues[col.name] = '';
        } else if (typeof value === 'object') {
          // Pretty print JSON for easier editing
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col px-6">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            Edit Row
            {isDeleted && (
              <Badge variant="destructive" className="text-xs">
                Marked for deletion
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {columns.map((col) => {
              const isPK = primaryKeyColumns.includes(col.name);
              const value = values[col.name] ?? '';
              const originalValue = rowData?.[col.name];
              const useLongField = isLongField(originalValue, col.type);

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
                  </div>
                  {useLongField ? (
                    <Textarea
                      id={col.name}
                      value={value}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      placeholder={col.nullable ? 'NULL' : `Enter ${col.name}`}
                      disabled={isDeleted}
                      className="min-h-[100px] font-mono text-sm resize-y"
                    />
                  ) : (
                    <Input
                      id={col.name}
                      value={value}
                      onChange={(e) => handleChange(col.name, e.target.value)}
                      placeholder={col.nullable ? 'NULL' : `Enter ${col.name}`}
                      disabled={isDeleted}
                      className="h-11 font-mono text-sm"
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

        <SheetFooter className="flex-shrink-0 flex-row gap-2 pt-4 border-t">
          {isDeleted ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11"
              >
                Close
              </Button>
              <Button
                variant="default"
                onClick={handleRestore}
                className="flex-1 h-11"
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
                  className="h-11"
                >
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isDirty}
                className="h-11"
              >
                Save Changes
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
