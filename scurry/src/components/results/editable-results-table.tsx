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
import { ArrowUpDown, Plus, Trash2, Check, X, Pencil, Maximize2 } from 'lucide-react';
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
import { MobileTableWrapper } from '@/components/ui/mobile-table-wrapper';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks';
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
import { EditableRowSheet } from './editable-row-sheet';
import { EditRowDialog } from './edit-row-dialog';
import { ExpandedCellEditor } from './expanded-cell-editor';

interface EditableResultsTableProps {
  result: QueryResult;
  primaryKeyColumns: string[];
  columnDefinitions: ColumnDefinition[];
  onChangesUpdate: (changes: PendingChanges) => void;
  pendingChanges: PendingChanges;
  pageOffset?: number;
}

export function EditableResultsTable({
  result,
  primaryKeyColumns,
  columnDefinitions,
  onChangesUpdate,
  pendingChanges,
  pageOffset = 0,
}: EditableResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [editingCell, setEditingCell] = React.useState<{ rowIndex: number; column: string } | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');
  const [filters, setFilters] = React.useState<ColumnFilter[]>([]);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [editingRowIndex, setEditingRowIndex] = React.useState<number | null>(null);
  const [editRowDialogIndex, setEditRowDialogIndex] = React.useState<number | null>(null);
  const [expandedCell, setExpandedCell] = React.useState<{ rowIndex: number; column: string; value: string; columnType?: string } | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const isMobile = useMediaQuery('(max-width: 767px)');

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

  // Convert local row index to global row index
  const toGlobalIndex = React.useCallback(
    (localIndex: number) => localIndex + pageOffset,
    [pageOffset]
  );

  // Check if a row is marked for deletion
  const isRowDeleted = React.useCallback(
    (rowIndex: number) => {
      const globalIndex = toGlobalIndex(rowIndex);
      return pendingChanges.deletes.some((d) => d.rowIndex === globalIndex);
    },
    [pendingChanges.deletes, toGlobalIndex]
  );

  // Check if a cell has been modified
  const getCellChange = React.useCallback(
    (rowIndex: number, column: string): PendingCellChange | undefined => {
      const globalIndex = toGlobalIndex(rowIndex);
      return pendingChanges.updates.find(
        (u) => u.rowIndex === globalIndex && u.column === column
      );
    },
    [pendingChanges.updates, toGlobalIndex]
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

  // Detect if a value is long text or JSON/array (should use expanded editor)
  const isLongValue = React.useCallback((value: unknown, colType?: string): boolean => {
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

  // Get column type by name
  const getColumnType = React.useCallback((columnName: string): string | undefined => {
    const colDef = columnDefinitions.find((c) => c.name === columnName);
    return colDef?.type;
  }, [columnDefinitions]);

  const handleStartEdit = (rowIndex: number, column: string, currentValue: unknown) => {
    if (isRowDeleted(rowIndex)) return;
    
    const colType = getColumnType(column);
    const strValue = currentValue === null ? '' : typeof currentValue === 'object' ? JSON.stringify(currentValue) : String(currentValue);
    
    // Use expanded editor for long values
    if (isLongValue(currentValue, colType)) {
      setExpandedCell({ rowIndex, column, value: strValue, columnType: colType });
    } else {
      setEditingCell({ rowIndex, column });
      setEditValue(strValue);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleConfirmEdit = () => {
    if (!editingCell) return;

    const { rowIndex, column } = editingCell;
    const globalIndex = toGlobalIndex(rowIndex);
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

    // Remove any existing change for this cell (using global index)
    const existingChanges = pendingChanges.updates.filter(
      (u) => !(u.rowIndex === globalIndex && u.column === column)
    );

    // Check if we're reverting to original value
    const revertedToOriginal = originalValue === newValue;
    
    if (!revertedToOriginal) {
      const newChange: PendingCellChange = {
        rowIndex: globalIndex,
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

    const globalIndex = toGlobalIndex(rowIndex);

    // Check if already marked for deletion
    if (isRowDeleted(rowIndex)) {
      // Unmark for deletion
      onChangesUpdate({
        ...pendingChanges,
        deletes: pendingChanges.deletes.filter((d) => d.rowIndex !== globalIndex),
      });
    } else {
      // Mark for deletion
      const newDelete: PendingRowDelete = {
        rowIndex: globalIndex,
        rowData,
      };
      onChangesUpdate({
        ...pendingChanges,
        deletes: [...pendingChanges.deletes, newDelete],
      });
    }
  };

  // Mobile sheet handlers
  const handleMobileRowTap = (rowIndex: number) => {
    if (isMobile) {
      setEditingRowIndex(rowIndex);
    }
  };

  const handleMobileSheetSave = (rowIndex: number, changes: Record<string, unknown>) => {
    const originalRow = allRows[rowIndex];
    const globalIndex = toGlobalIndex(rowIndex);
    
    // Apply each change
    Object.entries(changes).forEach(([column, newValue]) => {
      const existingChanges = pendingChanges.updates.filter(
        (u) => !(u.rowIndex === globalIndex && u.column === column)
      );
      
      const newChange: PendingCellChange = {
        rowIndex: globalIndex,
        column,
        oldValue: originalRow[column],
        newValue,
      };
      
      onChangesUpdate({
        ...pendingChanges,
        updates: [...existingChanges, newChange],
      });
    });
  };

  const handleMobileDelete = (rowIndex: number) => {
    const rowData = allRows[rowIndex];
    handleDeleteRow(rowIndex, rowData);
  };

  const handleMobileRestore = (rowIndex: number) => {
    const globalIndex = toGlobalIndex(rowIndex);
    onChangesUpdate({
      ...pendingChanges,
      deletes: pendingChanges.deletes.filter((d) => d.rowIndex !== globalIndex),
    });
  };

  // Handler for expanded cell editor save
  const handleExpandedCellSave = (newValue: string) => {
    if (!expandedCell) return;

    const { rowIndex, column } = expandedCell;
    const globalIndex = toGlobalIndex(rowIndex);
    const originalRow = allRows[rowIndex];
    const originalValue = originalRow[column];

    // Parse the value back to appropriate type
    let parsedValue: unknown = newValue;
    if (newValue === '') {
      parsedValue = null;
    } else {
      // Try to parse as JSON first
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        // Not JSON, check if it's a number
        if (!isNaN(Number(newValue)) && newValue.trim() !== '') {
          parsedValue = Number(newValue);
        }
      }
    }

    // Get original as string for comparison
    const originalStr = originalValue === null ? '' : typeof originalValue === 'object' ? JSON.stringify(originalValue) : String(originalValue);
    
    // Check if value actually changed
    if (newValue === originalStr) {
      setExpandedCell(null);
      return;
    }

    // Remove any existing change for this cell
    const existingChanges = pendingChanges.updates.filter(
      (u) => !(u.rowIndex === globalIndex && u.column === column)
    );

    const newChange: PendingCellChange = {
      rowIndex: globalIndex,
      column,
      oldValue: originalValue,
      newValue: parsedValue,
    };

    onChangesUpdate({
      ...pendingChanges,
      updates: [...existingChanges, newChange],
    });

    setExpandedCell(null);
  };

  // Handler for edit row dialog save
  const handleEditRowDialogSave = (rowIndex: number, changes: Record<string, unknown>) => {
    const originalRow = allRows[rowIndex];
    const globalIndex = toGlobalIndex(rowIndex);

    // Apply each change
    let updatedChanges = [...pendingChanges.updates];
    
    Object.entries(changes).forEach(([column, newValue]) => {
      updatedChanges = updatedChanges.filter(
        (u) => !(u.rowIndex === globalIndex && u.column === column)
      );

      const newChange: PendingCellChange = {
        rowIndex: globalIndex,
        column,
        oldValue: originalRow[column],
        newValue,
      };

      updatedChanges.push(newChange);
    });

    onChangesUpdate({
      ...pendingChanges,
      updates: updatedChanges,
    });
  };

  // Handler for opening row edit dialog
  const handleOpenEditRowDialog = (rowIndex: number) => {
    setEditRowDialogIndex(rowIndex);
  };

  // Handler for delete from edit row dialog
  const handleEditRowDialogDelete = (rowIndex: number) => {
    const rowData = allRows[rowIndex];
    handleDeleteRow(rowIndex, rowData);
  };

  // Handler for restore from edit row dialog
  const handleEditRowDialogRestore = (rowIndex: number) => {
    const globalIndex = toGlobalIndex(rowIndex);
    onChangesUpdate({
      ...pendingChanges,
      deletes: pendingChanges.deletes.filter((d) => d.rowIndex !== globalIndex),
    });
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
    // Expand row column - shows icon to open full row editor
    const expandCol: ColumnDef<Record<string, unknown>> = {
      id: 'expand',
      header: () => <span className="sr-only">Expand</span>,
      cell: ({ row }) => {
        const rowIndex = row.index;
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-40 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditRowDialog(rowIndex);
            }}
            title="View/Edit all fields"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        );
      },
      size: 32,
    };

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
            <TooltipProvider delayDuration={1500}>
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

    return [expandCol, ...dataCols, actionsCol];
  }, [result.columns, primaryKeyColumns, editingCell, editValue, isRowDeleted, getCellChange, getCellDisplayValue, allRows, pendingChanges, onChangesUpdate, isMobile]);

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
    <div className="flex flex-col min-w-0 h-full">
      {/* Filter bar + Add Row - Fixed at top */}
      <div className="flex-shrink-0 pb-3 flex items-start justify-between gap-3 md:gap-4 flex-wrap relative z-10">
        <div className="flex-1 min-w-[150px] md:min-w-[200px]">
          <SchemaFilter
            columns={columnNames}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)} className="gap-1 flex-shrink-0 h-9 touch-target">
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Row</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Table - Scrollable area */}
      <MobileTableWrapper maxHeight="max-h-[300px] md:max-h-[400px]" className="flex-1 min-h-0">
        <div ref={tableContainerRef} className="min-w-full">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-20">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap bg-background">
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
                      isDeleted && 'opacity-60',
                      isMobile && 'cursor-pointer active:bg-accent'
                    )}
                    onClick={() => handleMobileRowTap(row.index)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="font-mono text-sm md:text-sm text-xs py-1">
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
      </MobileTableWrapper>

      <AddRowDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        columns={columnDefinitions}
        onAdd={handleAddRow}
      />

      {/* Mobile Edit Sheet */}
      <EditableRowSheet
        open={editingRowIndex !== null && isMobile}
        onOpenChange={(open) => {
          if (!open) setEditingRowIndex(null);
        }}
        rowData={editingRowIndex !== null ? allRows[editingRowIndex] : null}
        rowIndex={editingRowIndex ?? 0}
        columns={columnDefinitions}
        primaryKeyColumns={primaryKeyColumns}
        onSave={handleMobileSheetSave}
        isDeleted={editingRowIndex !== null ? isRowDeleted(editingRowIndex) : false}
        onDelete={handleMobileDelete}
        onRestore={handleMobileRestore}
      />

      {/* Desktop Edit Row Dialog */}
      <EditRowDialog
        open={editRowDialogIndex !== null && !isMobile}
        onOpenChange={(open) => {
          if (!open) setEditRowDialogIndex(null);
        }}
        rowData={editRowDialogIndex !== null ? allRows[editRowDialogIndex] : null}
        rowIndex={editRowDialogIndex ?? 0}
        columns={columnDefinitions}
        primaryKeyColumns={primaryKeyColumns}
        onSave={handleEditRowDialogSave}
        isDeleted={editRowDialogIndex !== null ? isRowDeleted(editRowDialogIndex) : false}
        onDelete={handleEditRowDialogDelete}
        onRestore={handleEditRowDialogRestore}
      />

      {/* Expanded Cell Editor for long text/JSON */}
      <ExpandedCellEditor
        open={expandedCell !== null}
        onOpenChange={(open) => {
          if (!open) setExpandedCell(null);
        }}
        columnName={expandedCell?.column ?? ''}
        columnType={expandedCell?.columnType}
        value={expandedCell?.value ?? ''}
        onSave={handleExpandedCellSave}
      />
    </div>
  );
}
