'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import type {
  QueryResult,
  PendingChanges,
  PendingCellChange,
  PendingRowInsert,
  PendingRowDelete,
  ColumnFilter,
  ColumnDefinition,
} from '@/types';
import { SchemaFilter, applyFilters } from '@/components/schema';
import { AddRowDialog } from './add-row-dialog';

interface EditableResultsTableProps {
  result: QueryResult;
  primaryKeyColumns: string[];
  columnDefinitions: ColumnDefinition[];
  onChangesUpdate: (changes: PendingChanges) => void;
  pendingChanges: PendingChanges;
}

export function EditableResultsTable({
  result,
  primaryKeyColumns,
  columnDefinitions,
  onChangesUpdate,
  pendingChanges,
}: EditableResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [editingCell, setEditingCell] = React.useState<{ rowIndex: number; column: string } | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');
  const [filters, setFilters] = React.useState<ColumnFilter[]>([]);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  React.useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Combine original rows with inserted rows
  const allRows = React.useMemo((): Record<string, unknown>[] => {
    const insertedRows: Record<string, unknown>[] = pendingChanges.inserts.map((insert) => ({
      ...insert.values,
      __tempId: insert.tempId,
      __isNew: true,
    }));
    return [...result.rows, ...insertedRows];
  }, [result.rows, pendingChanges.inserts]);

  // Apply filters
  const filteredRows = React.useMemo(() => {
    return applyFilters(allRows, filters);
  }, [allRows, filters]);

  // Check if a row is marked for deletion
  const isRowDeleted = React.useCallback(
    (rowIndex: number) => {
      return pendingChanges.deletes.some((d) => d.rowIndex === rowIndex);
    },
    [pendingChanges.deletes]
  );

  // Check if a cell has been modified
  const getCellChange = React.useCallback(
    (rowIndex: number, column: string): PendingCellChange | undefined => {
      return pendingChanges.updates.find(
        (u) => u.rowIndex === rowIndex && u.column === column
      );
    },
    [pendingChanges.updates]
  );

  // Get the display value for a cell (considering pending changes)
  const getCellDisplayValue = React.useCallback(
    (row: Record<string, unknown>, rowIndex: number, column: string): unknown => {
      const change = getCellChange(rowIndex, column);
      if (change) {
        return change.newValue;
      }
      return row[column];
    },
    [getCellChange]
  );

  const handleStartEdit = (rowIndex: number, column: string, currentValue: unknown) => {
    if (isRowDeleted(rowIndex)) return;
    setEditingCell({ rowIndex, column });
    setEditValue(currentValue === null ? '' : String(currentValue));
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleConfirmEdit = () => {
    if (!editingCell) return;

    const { rowIndex, column } = editingCell;
    const originalRow = allRows[rowIndex];
    const originalValue = originalRow[column];
    
    // Parse the value back to appropriate type
    let newValue: unknown = editValue;
    if (editValue === '') {
      newValue = null;
    } else if (!isNaN(Number(editValue)) && editValue.trim() !== '') {
      newValue = Number(editValue);
    }

    // Don't create change if value is the same
    if (originalValue === newValue || (originalValue === null && newValue === null)) {
      handleCancelEdit();
      return;
    }

    // Remove any existing change for this cell
    const existingChanges = pendingChanges.updates.filter(
      (u) => !(u.rowIndex === rowIndex && u.column === column)
    );

    // Check if we're reverting to original value
    const revertedToOriginal = originalValue === newValue;
    
    if (!revertedToOriginal) {
      const newChange: PendingCellChange = {
        rowIndex,
        column,
        oldValue: originalValue,
        newValue,
      };
      onChangesUpdate({
        ...pendingChanges,
        updates: [...existingChanges, newChange],
      });
    } else {
      onChangesUpdate({
        ...pendingChanges,
        updates: existingChanges,
      });
    }

    handleCancelEdit();
  };

  const handleAddRow = (values: Record<string, unknown>) => {
    const newRow: PendingRowInsert = {
      tempId: crypto.randomUUID(),
      values,
    };
    onChangesUpdate({
      ...pendingChanges,
      inserts: [...pendingChanges.inserts, newRow],
    });
    setShowAddDialog(false);
  };

  const handleDeleteRow = (rowIndex: number, rowData: Record<string, unknown>) => {
    // If it's a new row, just remove it from inserts
    if ('__isNew' in rowData && rowData.__isNew === true) {
      const tempId = rowData.__tempId as string;
      onChangesUpdate({
        ...pendingChanges,
        inserts: pendingChanges.inserts.filter((i) => i.tempId !== tempId),
      });
      return;
    }

    // Check if already marked for deletion
    if (isRowDeleted(rowIndex)) {
      // Unmark for deletion
      onChangesUpdate({
        ...pendingChanges,
        deletes: pendingChanges.deletes.filter((d) => d.rowIndex !== rowIndex),
      });
    } else {
      // Mark for deletion
      const newDelete: PendingRowDelete = {
        rowIndex,
        rowData,
      };
      onChangesUpdate({
        ...pendingChanges,
        deletes: [...pendingChanges.deletes, newDelete],
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = React.useMemo(() => {
    const dataCols: ColumnDef<Record<string, unknown>>[] = result.columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <span className="truncate max-w-[150px]">{col.name}</span>
          {primaryKeyColumns.includes(col.name) && (
            <span className="ml-1 text-xs text-amber-500 flex-shrink-0">PK</span>
          )}
          <ArrowUpDown className="ml-1 h-3 w-3 flex-shrink-0" />
        </Button>
      ),
      cell: ({ row, column }) => {
        const rowIndex = row.index;
        const isDeleted = isRowDeleted(rowIndex);
        const cellChange = getCellChange(rowIndex, column.id);
        const isNew = '__isNew' in row.original && row.original.__isNew === true;
        const value = getCellDisplayValue(row.original, rowIndex, column.id);
        const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.column === column.id;
        const strValue = value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
        const isLongValue = strValue.length > 50;

        if (isEditing) {
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm font-mono min-w-[150px]"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-600 hover:text-green-700 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmEdit();
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-600 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        }

        const cellContent = (
          <div
            className={cn(
              'cursor-pointer p-1 -m-1 rounded min-h-[24px] max-w-[250px] truncate group relative',
              isDeleted && 'line-through text-muted-foreground bg-red-50 dark:bg-red-950/30',
              cellChange && !isDeleted && 'bg-amber-100 dark:bg-amber-900/30',
              isNew && !isDeleted && 'bg-green-50 dark:bg-green-950/30',
              !isDeleted && 'hover:bg-accent'
            )}
            onDoubleClick={() => handleStartEdit(rowIndex, column.id, value)}
          >
            {value === null ? (
              <span className="italic text-muted-foreground">NULL</span>
            ) : (
              strValue
            )}
            {!isDeleted && (
              <Pencil className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50" />
            )}
          </div>
        );

        if (isLongValue) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {cellContent}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[400px] break-all">
                  <p className="font-mono text-xs">{strValue}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return cellContent;
      },
    }));

    // Add actions column
    const actionsCol: ColumnDef<Record<string, unknown>> = {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const rowIndex = row.index;
        const isDeleted = isRowDeleted(rowIndex);
        const isNew = '__isNew' in row.original && row.original.__isNew;

        return (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 flex-shrink-0',
              isDeleted && 'text-green-600 hover:text-green-700',
              !isDeleted && 'text-red-500 hover:text-red-600'
            )}
            onClick={() => handleDeleteRow(rowIndex, row.original)}
            title={isDeleted ? 'Restore row' : isNew ? 'Remove new row' : 'Mark for deletion'}
          >
            {isDeleted ? (
              <Check className="h-3 w-3" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        );
      },
      size: 40,
    };

    return [...dataCols, actionsCol];
  }, [result.columns, primaryKeyColumns, editingCell, editValue, isRowDeleted, getCellChange, getCellDisplayValue, allRows, pendingChanges, onChangesUpdate]);

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 40,
    getScrollElement: () => tableContainerRef.current,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  const columnNames = result.columns.map((c) => c.name);

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SchemaFilter
            columns={columnNames}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} className="gap-1 flex-shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </Button>
      </div>

      <div
        ref={tableContainerRef}
        className="rounded-md border overflow-auto max-h-[400px]"
      >
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isNew = '__isNew' in row.original && row.original.__isNew === true;
              const isDeleted = isRowDeleted(row.index);

              return (
                <TableRow
                  key={row.id}
                  data-index={virtualRow.index}
                  className={cn(
                    isNew && 'border-l-2 border-l-green-500',
                    isDeleted && 'opacity-60'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="font-mono text-sm py-1">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
              </tr>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredRows.length} rows
        {filters.length > 0 && ` (filtered from ${allRows.length})`}
      </div>

      <AddRowDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        columns={columnDefinitions}
        onAdd={handleAddRow}
      />
    </div>
  );
}
