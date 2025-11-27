'use client';

import * as React from 'react';
import { ChevronRight, Table2, Eye, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TableInfo } from '@/types';

interface SchemaTreeProps {
  tables: TableInfo[];
  loading: boolean;
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  onRefresh: () => void;
}

export function SchemaTree({
  tables,
  loading,
  selectedTable,
  onSelectTable,
  onRefresh,
}: SchemaTreeProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['tables', 'views'])
  );

  const tablesList = tables.filter((t) => t.type === 'table');
  const viewsList = tables.filter((t) => t.type === 'view');

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">Schema</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tablesList.length > 0 && (
            <Collapsible
              open={expandedSections.has('tables')}
              onOpenChange={() => toggleSection('tables')}
            >
              <CollapsibleTrigger className="flex items-center gap-1 w-full p-1 hover:bg-accent rounded text-sm">
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform',
                    expandedSections.has('tables') && 'rotate-90'
                  )}
                />
                <Table2 className="h-4 w-4 text-muted-foreground" />
                <span>Tables ({tablesList.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 space-y-0.5">
                  {tablesList.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => onSelectTable(table.name)}
                      className={cn(
                        'flex items-center gap-2 w-full p-1.5 pl-4 rounded text-sm hover:bg-accent text-left',
                        selectedTable === table.name && 'bg-accent'
                      )}
                    >
                      <Table2 className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate flex-1">{table.name}</span>
                      {table.rowCount !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {table.rowCount.toLocaleString()}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {viewsList.length > 0 && (
            <Collapsible
              open={expandedSections.has('views')}
              onOpenChange={() => toggleSection('views')}
            >
              <CollapsibleTrigger className="flex items-center gap-1 w-full p-1 hover:bg-accent rounded text-sm">
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform',
                    expandedSections.has('views') && 'rotate-90'
                  )}
                />
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>Views ({viewsList.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 space-y-0.5">
                  {viewsList.map((view) => (
                    <button
                      key={view.name}
                      onClick={() => onSelectTable(view.name)}
                      className={cn(
                        'flex items-center gap-2 w-full p-1.5 pl-4 rounded text-sm hover:bg-accent text-left',
                        selectedTable === view.name && 'bg-accent'
                      )}
                    >
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{view.name}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {tables.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tables found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
