'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { QueryResult } from '@/types';

interface ResultsTableProps {
  result: QueryResult;
}

export function ResultsTable({ result }: ResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [copiedCell, setCopiedCell] = React.useState<string | null>(null);

  const columns: ColumnDef<Record<string, unknown>>[] = React.useMemo(() => {
    return result.columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {col.name}
          <ArrowUpDown className="ml-2 h-3 w-3" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return <CellValue value={value} columnName={col.name} onCopy={handleCopy} copiedCell={copiedCell} />;
      },
    }));
  }, [result.columns, copiedCell]);

  const table = useReactTable({
    data: result.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: {
      pagination: { pageSize: 100 },
    },
  });

  const handleCopy = async (value: string, cellId: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedCell(cellId);
    setTimeout(() => setCopiedCell(null), 2000);
  };

  if (result.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No rows returned
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-auto max-h-[500px]">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="font-mono text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            result.rowCount
          )}{' '}
          of {result.rowCount} rows
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CellValueProps {
  value: unknown;
  columnName: string;
  onCopy: (value: string, cellId: string) => void;
  copiedCell: string | null;
}

function CellValue({ value, columnName, onCopy, copiedCell }: CellValueProps) {
  const cellId = `${columnName}-${String(value)}`;
  const isCopied = copiedCell === cellId;

  if (value === null) {
    return <span className="italic text-muted-foreground">NULL</span>;
  }

  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value, null, 2);
    return (
      <div className="group relative max-w-[300px]">
        <pre className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">
          {JSON.stringify(value)}
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={() => onCopy(jsonStr, cellId)}
        >
          {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    );
  }

  const strValue = String(value);
  const isLong = strValue.length > 50;

  return (
    <div className={cn('group relative', isLong && 'max-w-[300px]')}>
      <span className={cn(isLong && 'block overflow-hidden text-ellipsis whitespace-nowrap')}>
        {strValue}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-6 w-6 opacity-0 group-hover:opacity-100"
        onClick={() => onCopy(strValue, cellId)}
      >
        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
