'use client';

import * as React from 'react';
import { Database, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DatabaseType } from '@/types';

interface Connection {
  id: string;
  name: string;
  type: DatabaseType;
  database: string;
  isShared?: boolean;
}

interface PanelHeaderProps {
  panelId: string;
  panelIndex: number;
  connectionId: string | null;
  connectionName: string;
  connectionType: string | null;
  tableName: string | null;
  connections: Connection[];
  usedConnectionIds: string[]; // Connections already selected in other panels
  canRemove: boolean;
  selectedRowCount: number;
  onConnectionChange: (connectionId: string) => void;
  onRemove: () => void;
}

const DB_TYPE_COLORS: Record<string, string> = {
  mysql: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  mariadb: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  postgresql: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  sqlite: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function PanelHeader({
  panelIndex,
  connectionId,
  connectionName,
  connectionType,
  tableName,
  connections,
  usedConnectionIds,
  canRemove,
  selectedRowCount,
  onConnectionChange,
  onRemove,
}: PanelHeaderProps) {
  const dbTypeColor = connectionType ? DB_TYPE_COLORS[connectionType] || DB_TYPE_COLORS.sqlite : '';

  return (
    <div className="flex items-center justify-between p-2 border-b bg-muted/30">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-medium text-muted-foreground shrink-0">
          Panel {panelIndex + 1}
        </span>
        
        <Select value={connectionId || ''} onValueChange={onConnectionChange}>
          <SelectTrigger className="h-8 w-[180px] text-sm">
            <SelectValue placeholder="Select connection">
              {connectionId ? (
                <div className="flex items-center gap-1.5 truncate">
                  <Database className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{connectionName}</span>
                </div>
              ) : (
                'Select connection'
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {connections.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No connections available
              </div>
            ) : (
              connections.map((conn) => {
                const isUsedElsewhere = usedConnectionIds.includes(conn.id);
                return (
                  <SelectItem 
                    key={conn.id} 
                    value={conn.id}
                    disabled={isUsedElsewhere}
                    className={cn(isUsedElsewhere && 'opacity-50')}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5" />
                      <span>{conn.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {conn.type}
                      </Badge>
                      {isUsedElsewhere && (
                        <span className="text-[10px] text-muted-foreground">(in use)</span>
                      )}
                    </div>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>

        {connectionType && (
          <Badge variant="secondary" className={cn('text-xs shrink-0', dbTypeColor)}>
            {connectionType.toUpperCase()}
          </Badge>
        )}
        
        {tableName && (
          <Badge variant="outline" className="text-xs truncate max-w-[120px]">
            {tableName}
          </Badge>
        )}

        {selectedRowCount > 0 && (
          <Badge variant="default" className="text-xs shrink-0 bg-amber-500 hover:bg-amber-600">
            {selectedRowCount} selected
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {canRemove && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove panel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
