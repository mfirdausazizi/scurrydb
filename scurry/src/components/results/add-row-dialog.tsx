'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { ColumnDefinition } from '@/types';

interface AddRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDefinition[];
  onAdd: (values: Record<string, unknown>) => void;
}

export function AddRowDialog({ open, onOpenChange, columns, onAdd }: AddRowDialogProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Filter out auto-increment columns - they are handled by the database
  const editableColumns = React.useMemo(() => {
    return columns.filter((col) => !col.autoIncrement);
  }, [columns]);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      const initialValues: Record<string, string> = {};
      editableColumns.forEach((col) => {
        if (col.defaultValue && col.defaultValue !== 'NULL') {
          initialValues[col.name] = col.defaultValue.replace(/^'|'$/g, '');
        } else {
          initialValues[col.name] = '';
        }
      });
      setValues(initialValues);
      setErrors({});
    }
  }, [open, editableColumns]);

  const handleValueChange = (columnName: string, value: string) => {
    setValues((prev) => ({ ...prev, [columnName]: value }));
    // Clear error when user starts typing
    if (errors[columnName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[columnName];
        return next;
      });
    }
  };

  const validateAndParse = (): Record<string, unknown> | null => {
    const newErrors: Record<string, string> = {};
    const parsedValues: Record<string, unknown> = {};

    for (const col of editableColumns) {
      const value = values[col.name]?.trim() ?? '';
      const colType = col.type.toLowerCase();

      // Check required fields (non-nullable without default)
      if (!col.nullable && !col.defaultValue && value === '') {
        newErrors[col.name] = 'This field is required';
        continue;
      }

      // Empty value becomes null
      if (value === '') {
        parsedValues[col.name] = null;
        continue;
      }

      // Type-specific validation
      if (colType.includes('int') || colType.includes('serial')) {
        const num = parseInt(value, 10);
        if (isNaN(num)) {
          newErrors[col.name] = 'Must be an integer';
          continue;
        }
        parsedValues[col.name] = num;
      } else if (
        colType.includes('float') ||
        colType.includes('double') ||
        colType.includes('decimal') ||
        colType.includes('numeric') ||
        colType.includes('real')
      ) {
        const num = parseFloat(value);
        if (isNaN(num)) {
          newErrors[col.name] = 'Must be a number';
          continue;
        }
        parsedValues[col.name] = num;
      } else if (colType.includes('bool')) {
        const lower = value.toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
          newErrors[col.name] = 'Must be true/false or 1/0';
          continue;
        }
        parsedValues[col.name] = ['true', '1', 'yes'].includes(lower);
      } else if (colType.includes('json')) {
        try {
          parsedValues[col.name] = JSON.parse(value);
        } catch {
          newErrors[col.name] = 'Must be valid JSON';
          continue;
        }
      } else {
        // String/text and other types
        parsedValues[col.name] = value;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return null;
    }

    return parsedValues;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValues = validateAndParse();
    if (parsedValues) {
      onAdd(parsedValues);
      toast.success('Row added to pending changes');
    }
  };

  const getInputType = (colType: string): string => {
    const lower = colType.toLowerCase();
    if (lower.includes('int') || lower.includes('serial')) return 'number';
    if (lower.includes('float') || lower.includes('double') || lower.includes('decimal') || lower.includes('numeric')) return 'number';
    if (lower.includes('date') && !lower.includes('time')) return 'date';
    if (lower.includes('time') && !lower.includes('date')) return 'time';
    if (lower.includes('datetime') || lower.includes('timestamp')) return 'datetime-local';
    return 'text';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Add New Row</DialogTitle>
          <DialogDescription>
            Enter values for the new row. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 px-6 overflow-auto">
            <div className="space-y-4 pb-4">
              {editableColumns.map((col) => {
                const isRequired = !col.nullable && !col.defaultValue;
                const inputType = getInputType(col.type);

                return (
                  <div key={col.name} className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label htmlFor={col.name} className="font-mono text-sm">
                        {col.name}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Badge variant="outline" className="text-xs font-normal">
                        {col.type}
                      </Badge>
                      {col.isPrimaryKey && (
                        <Badge variant="default" className="text-xs">PK</Badge>
                      )}
                      {col.nullable && (
                        <Badge variant="secondary" className="text-xs">nullable</Badge>
                      )}
                    </div>
                    <Input
                      id={col.name}
                      type={inputType}
                      step={inputType === 'number' ? 'any' : undefined}
                      value={values[col.name] || ''}
                      onChange={(e) => handleValueChange(col.name, e.target.value)}
                      placeholder={col.defaultValue ? `Default: ${col.defaultValue}` : col.nullable ? 'NULL' : ''}
                      className={errors[col.name] ? 'border-red-500' : ''}
                    />
                    {errors[col.name] && (
                      <p className="text-xs text-red-500">{errors[col.name]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 px-6 pb-6 pt-4 border-t bg-background sticky bottom-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Row</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
