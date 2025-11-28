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
import { ArrowUpDown, Copy, Check } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { QueryResult } from '@/types';

interface ResultsTableProps {
  result: QueryResult;
}

export const ResultsTable = React.memo(function ResultsTable({ result }: ResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [copiedCell, setCopiedCell] = React.useState<string | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = React.useCallback(async (value: string, cellId: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedCell(cellId);
    setTimeout(() => setCopiedCell(null), 2000);
  }, []);

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
          <span className="truncate max-w-[150px]">{col.name}</span>
          <ArrowUpDown className="ml-2 h-3 w-3 flex-shrink-0" />
        </Button>
      ),
      cell: ({ getValue, row, column }) => {
        const value = getValue();
        const cellId = `${row.index}-${column.id}`;
        return (
          <CellValue
            value={value}
            cellId={cellId}
            onCopy={handleCopy}
            isCopied={copiedCell === cellId}
          />
        );
      },
    }));
  }, [result.columns, copiedCell, handleCopy]);

  const table = useReactTable({
    data: result.rows,
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

  if (result.rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No rows returned
      </div>
    );
  }

  return (
    <div className="space-y-2 min-w-0">
      <div
        ref={tableContainerRef}
        className="rounded-md border overflow-auto max-h-[500px]"
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
              return (
                <TableRow key={row.id} data-index={virtualRow.index}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="font-mono text-sm">
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

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {result.rows.length} of {result.rowCount} rows
        </div>
      </div>
    </div>
  );
});

interface CellValueProps {
  value: unknown;
  cellId: string;
  onCopy: (value: string, cellId: string) => void;
  isCopied: boolean;
}

const CellValue = React.memo(function CellValue({
  value,
  cellId,
  onCopy,
  isCopied,
}: CellValueProps) {
  if (value === null) {
    return <span className="italic text-muted-foreground">NULL</span>;
  }

  const strValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const isLong = displayValue.length > 50;

  const content = (
    <div className={cn('group relative max-w-[250px]')}>
      <span className="block truncate">
        {displayValue}
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

  if (isLong) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[400px] break-all">
            <p className="font-mono text-xs whitespace-pre-wrap">{strValue}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
});
