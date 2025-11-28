'use client';

import * as React from 'react';
import { ChevronRight, Table2, Eye, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export const SchemaTree = React.memo(function SchemaTree({
  tables,
  loading,
  selectedTable,
  onSelectTable,
  onRefresh,
}: SchemaTreeProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['tables', 'views'])
  );
  const [searchQuery, setSearchQuery] = React.useState('');
  const parentRef = React.useRef<HTMLDivElement>(null);

  const tablesList = React.useMemo(
    () => tables.filter((t) => t.type === 'table'),
    [tables]
  );
  const viewsList = React.useMemo(
    () => tables.filter((t) => t.type === 'view'),
    [tables]
  );

  const filteredTables = React.useMemo(() => {
    if (!searchQuery.trim()) return tablesList;
    const query = searchQuery.toLowerCase();
    return tablesList.filter((t) => t.name.toLowerCase().includes(query));
  }, [tablesList, searchQuery]);

  const filteredViews = React.useMemo(() => {
    if (!searchQuery.trim()) return viewsList;
    const query = searchQuery.toLowerCase();
    return viewsList.filter((v) => v.name.toLowerCase().includes(query));
  }, [viewsList, searchQuery]);

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

  const tableVirtualizer = useVirtualizer({
    count: filteredTables.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

  const viewVirtualizer = useVirtualizer({
    count: filteredViews.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 5,
  });

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

      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1" ref={parentRef}>
        <div className="p-2 space-y-1">
          {filteredTables.length > 0 && (
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
                <span>Tables ({filteredTables.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 space-y-0.5">
                  {filteredTables.length > 50 ? (
                    <div
                      style={{
                        height: `${tableVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {tableVirtualizer.getVirtualItems().map((virtualItem) => {
                        const table = filteredTables[virtualItem.index];
                        return (
                          <button
                            key={table.name}
                            onClick={() => onSelectTable(table.name)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                            className={cn(
                              'flex items-center gap-2 w-full p-1.5 pl-4 rounded text-sm hover:bg-accent text-left',
                              selectedTable === table.name && 'bg-accent'
                            )}
                          >
                            <Table2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate flex-1">{table.name}</span>
                            {table.rowCount !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {table.rowCount.toLocaleString()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    filteredTables.map((table) => (
                      <button
                        key={table.name}
                        onClick={() => onSelectTable(table.name)}
                        className={cn(
                          'flex items-center gap-2 w-full p-1.5 pl-4 rounded text-sm hover:bg-accent text-left',
                          selectedTable === table.name && 'bg-accent'
                        )}
                      >
                        <Table2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{table.name}</span>
                        {table.rowCount !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {table.rowCount.toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {filteredViews.length > 0 && (
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
                <span>Views ({filteredViews.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 space-y-0.5">
                  {filteredViews.length > 50 ? (
                    <div
                      style={{
                        height: `${viewVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {viewVirtualizer.getVirtualItems().map((virtualItem) => {
                        const view = filteredViews[virtualItem.index];
                        return (
                          <button
                            key={view.name}
                            onClick={() => onSelectTable(view.name)}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                            className={cn(
                              'flex items-center gap-2 w-full p-1.5 pl-4 rounded text-sm hover:bg-accent text-left',
                              selectedTable === view.name && 'bg-accent'
                            )}
                          >
                            <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{view.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    filteredViews.map((view) => (
                      <button
                        key={view.name}
                        onClick={() => onSelectTable(view.name)}
                        className={cn(
                          'flex items-center gap-2 w-full p-1.5 pl-4 rounded text-sm hover:bg-accent text-left',
                          selectedTable === view.name && 'bg-accent'
                        )}
                      >
                        <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{view.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {tables.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tables found
            </div>
          )}

          {searchQuery && filteredTables.length === 0 && filteredViews.length === 0 && tables.length > 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tables match &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
