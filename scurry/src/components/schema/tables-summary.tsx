'use client';

import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { TableInfo } from '@/types';

interface TablesSummaryProps {
  tables: TableInfo[];
  onSelectTable: (tableName: string) => void;
}

type SortField = 'name' | 'rowCount' | 'dataLength';
type SortDirection = 'asc' | 'desc';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function TablesSummary({ tables, onSelectTable }: TablesSummaryProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  // Filter only tables (exclude views)
  const tablesList = React.useMemo(
    () => tables.filter((t) => t.type === 'table'),
    [tables]
  );

  // Apply search filter
  const filteredTables = React.useMemo(() => {
    if (!searchQuery.trim()) return tablesList;
    const query = searchQuery.toLowerCase();
    return tablesList.filter((t) => t.name.toLowerCase().includes(query));
  }, [tablesList, searchQuery]);

  // Apply sorting
  const sortedTables = React.useMemo(() => {
    return [...filteredTables].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rowCount':
          comparison = (a.rowCount || 0) - (b.rowCount || 0);
          break;
        case 'dataLength':
          comparison = (a.dataLength || 0) - (b.dataLength || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTables, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Calculate totals
  const totalRows = React.useMemo(
    () => tablesList.reduce((sum, t) => sum + (t.rowCount || 0), 0),
    [tablesList]
  );
  const totalSize = React.useMemo(
    () => tablesList.reduce((sum, t) => sum + (t.dataLength || 0), 0),
    [tablesList]
  );

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Tables Overview
            </CardTitle>
            <CardDescription className="mt-1">
              {tablesList.length} tables · {formatNumber(totalRows)} total rows · {formatBytes(totalSize)}
            </CardDescription>
          </div>
        </div>
        <div className="mt-3">
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[50%]">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Table Name
                    <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead className="w-[15%] text-right">
                  <button
                    onClick={() => handleSort('rowCount')}
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                  >
                    Rows
                    <SortIcon field="rowCount" />
                  </button>
                </TableHead>
                <TableHead className="w-[15%] text-right">
                  <button
                    onClick={() => handleSort('dataLength')}
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                  >
                    Size
                    <SortIcon field="dataLength" />
                  </button>
                </TableHead>
                <TableHead className="w-[20%] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {searchQuery ? `No tables match "${searchQuery}"` : 'No tables found'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedTables.map((table) => (
                  <TableRow 
                    key={table.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelectTable(table.name)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Table2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{table.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatNumber(table.rowCount || 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatBytes(table.dataLength || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTable(table.name);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
