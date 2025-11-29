'use client';

import * as React from 'react';
import { ArrowRight, Trash2, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { SyncQueueItem } from '@/types/sync';

interface SyncQueueProps {
  items: SyncQueueItem[];
  onRemoveItem: (id: string) => void;
  onClear: () => void;
  onSync: () => void;
  isSyncing?: boolean;
  canSync?: boolean;
}

const OPERATION_STYLES: Record<SyncQueueItem['operation'], { bg: string; text: string; label: string }> = {
  insert: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'INSERT',
  },
  update: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'UPDATE',
  },
  delete: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'DELETE',
  },
};

export function SyncQueue({
  items,
  onRemoveItem,
  onClear,
  onSync,
  isSyncing = false,
  canSync = true,
}: SyncQueueProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  // Group items by operation
  const groupedItems = React.useMemo(() => {
    const groups: Record<SyncQueueItem['operation'], SyncQueueItem[]> = {
      insert: [],
      update: [],
      delete: [],
    };
    items.forEach((item) => {
      groups[item.operation].push(item);
    });
    return groups;
  }, [items]);

  const insertCount = groupedItems.insert.length;
  const updateCount = groupedItems.update.length;
  const deleteCount = groupedItems.delete.length;

  if (items.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-medium">Sync Queue</span>
              <div className="flex items-center gap-1.5">
                {insertCount > 0 && (
                  <Badge variant="secondary" className={cn('text-xs', OPERATION_STYLES.insert.bg, OPERATION_STYLES.insert.text)}>
                    +{insertCount}
                  </Badge>
                )}
                {updateCount > 0 && (
                  <Badge variant="secondary" className={cn('text-xs', OPERATION_STYLES.update.bg, OPERATION_STYLES.update.text)}>
                    ~{updateCount}
                  </Badge>
                )}
                {deleteCount > 0 && (
                  <Badge variant="secondary" className={cn('text-xs', OPERATION_STYLES.delete.bg, OPERATION_STYLES.delete.text)}>
                    -{deleteCount}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                      }}
                    >
                      Clear
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all items from queue</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onSync();
                }}
                disabled={isSyncing || !canSync}
              >
                <Play className="h-3.5 w-3.5" />
                Sync
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            <ScrollArea className="max-h-48">
              <div className="p-2 space-y-1">
                {items.map((item) => {
                  const style = OPERATION_STYLES[item.operation];
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-md text-sm',
                        style.bg
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={cn('text-xs shrink-0', style.text)}>
                          {style.label}
                        </Badge>
                        <span className="font-mono text-xs truncate">
                          {item.tableName}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {item.primaryKeyString}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
