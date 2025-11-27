'use client';

import * as React from 'react';
import { Play, Loader2, Code, History, Download, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { DatabaseConnection } from '@/types';

type SafeConnection = Omit<DatabaseConnection, 'password'>;

interface QueryToolbarProps {
  connections: SafeConnection[];
  selectedConnectionId: string | null;
  onConnectionChange: (connectionId: string) => void;
  onExecute: () => void;
  onFormat: () => void;
  onToggleHistory: () => void;
  onToggleAI?: () => void;
  onExport?: () => void;
  executing: boolean;
  hasResults: boolean;
  showAI?: boolean;
}

export function QueryToolbar({
  connections,
  selectedConnectionId,
  onConnectionChange,
  onExecute,
  onFormat,
  onToggleHistory,
  onToggleAI,
  onExport,
  executing,
  hasResults,
  showAI,
}: QueryToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <Select value={selectedConnectionId || ''} onValueChange={onConnectionChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: conn.color || '#8B5A2B' }}
                  />
                  {conn.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {onToggleAI && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={showAI ? 'secondary' : 'ghost'} 
                size="icon" 
                onClick={onToggleAI}
              >
                <Bot className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI Assistant</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleHistory}>
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Query History</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onFormat}>
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Format SQL</TooltipContent>
        </Tooltip>

        {hasResults && onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        )}

        <Button onClick={onExecute} disabled={executing || !selectedConnectionId}>
          {executing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Run
          <span className="ml-2 text-xs text-muted-foreground">⌘↵</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
