'use client';

import * as React from 'react';
import { Key, Hash, Link2, CircleDot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ColumnDefinition, IndexInfo } from '@/types';

interface ColumnCardsProps {
  columns: ColumnDefinition[];
  className?: string;
}

export function ColumnCards({ columns, className }: ColumnCardsProps) {
  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <span className="text-2xl mb-2">🐿️</span>
        <span>No columns found</span>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {columns.map((column) => (
        <Card key={column.name} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CircleDot className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="font-mono font-medium text-sm truncate">
                  {column.name}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {column.isPrimaryKey && (
                  <Badge variant="default" className="h-5 gap-0.5 text-xs px-1.5">
                    <Key className="h-3 w-3" />
                    <span className="hidden sm:inline">PK</span>
                  </Badge>
                )}
                {column.isForeignKey && (
                  <Badge variant="secondary" className="h-5 gap-0.5 text-xs px-1.5">
                    <Hash className="h-3 w-3" />
                    <span className="hidden sm:inline">FK</span>
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {column.type}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nullable</span>
                <span className={cn(
                  'text-xs font-medium',
                  column.nullable ? 'text-muted-foreground' : 'text-foreground'
                )}>
                  {column.nullable ? 'Yes' : 'No'}
                </span>
              </div>

              {column.defaultValue && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Default</span>
                  <span className="font-mono text-xs truncate max-w-[120px]" title={column.defaultValue}>
                    {column.defaultValue}
                  </span>
                </div>
              )}

              {column.references && (
                <div className="flex items-center gap-1.5 pt-1 border-t text-xs text-muted-foreground">
                  <Link2 className="h-3 w-3" />
                  <span className="truncate">
                    {column.references.table}.{column.references.column}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface IndexCardsProps {
  indexes: IndexInfo[];
  className?: string;
}

export function IndexCards({ indexes, className }: IndexCardsProps) {
  if (indexes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <span className="text-2xl mb-2">🐿️</span>
        <span>No indexes found</span>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {indexes.map((index) => (
        <Card key={index.name} className="overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-mono font-medium text-sm truncate flex-1">
                {index.name}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {index.primary && (
                  <Badge variant="default" className="h-5 text-xs px-1.5">
                    Primary
                  </Badge>
                )}
                {index.unique && !index.primary && (
                  <Badge variant="secondary" className="h-5 text-xs px-1.5">
                    Unique
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Columns</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {index.columns.map((col) => (
                    <span
                      key={col}
                      className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
