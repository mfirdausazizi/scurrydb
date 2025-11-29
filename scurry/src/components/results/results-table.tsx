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
import { MobileTableWrapper } from '@/components/ui/mobile-table-wrapper';
import { cn } from '@/lib/utils';
import type { QueryResult } from '@/types';

interface ResultsTableProps {
  result: QueryResult;
}

// PERF-007: Track copied cell state globally to avoid re-renders
const CopiedCellContext = React.createContext<{
  copiedCell: string | null;
  setCopiedCell: (cellId: string | null) => void;
}>({ copiedCell: null, setCopiedCell: () => {} });

export const ResultsTable = React.memo(function ResultsTable({ result }: ResultsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [copiedCell, setCopiedCell] = React.useState<string | null>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Memoize context value to prevent unnecessary re-renders
  const copiedCellContextValue = React.useMemo(
    () => ({ copiedCell, setCopiedCell }),
    [copiedCell]
  );

  // PERF-007: Memoize columns separately from copiedCell state
  // This prevents the entire table from re-rendering when a cell is copied
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
        return <MemoizedCellValue value={value} cellId={cellId} />;
      },
    }));
  }, [result.columns]); // PERF-007: Removed copiedCell from dependencies

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
        <span className="flex items-center gap-2">
          <span className="text-xl">🐿️</span>
          No rows returned
        </span>
      </div>
    );
  }

  return (
    <CopiedCellContext.Provider value={copiedCellContextValue}>
      <div className="space-y-2 min-w-0">
        <MobileTableWrapper maxHeight="max-h-[350px] md:max-h-[500px]">
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
                  return (
                    <TableRow key={row.id} data-index={virtualRow.index}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="font-mono text-sm md:text-sm text-xs">
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

        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {result.rows.length} of {result.rowCount} rows
          </div>
        </div>
      </div>
    </CopiedCellContext.Provider>
  );
});

interface MemoizedCellValueProps {
  value: unknown;
  cellId: string;
}

// PERF-007: Memoized cell value that only re-renders when value changes
// Uses context for copy state to avoid prop drilling and unnecessary re-renders
const MemoizedCellValue = React.memo(function MemoizedCellValue({
  value,
  cellId,
}: MemoizedCellValueProps) {
  const { copiedCell, setCopiedCell } = React.useContext(CopiedCellContext);
  const isCopied = copiedCell === cellId;

  const handleCopy = React.useCallback(async () => {
    const strValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    await navigator.clipboard.writeText(strValue);
    setCopiedCell(cellId);
    setTimeout(() => setCopiedCell(null), 2000);
  }, [value, cellId, setCopiedCell]);

  if (value === null) {
    return <span className="italic text-muted-foreground">NULL</span>;
  }

  const strValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const isLong = displayValue.length > 50;

  const content = (
    <div className={cn('group relative max-w-[120px] sm:max-w-[180px] md:max-w-[250px]')}>
      <span className="block truncate">
        {displayValue}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-6 w-6 opacity-0 group-hover:opacity-100 touch-target"
        onClick={handleCopy}
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
