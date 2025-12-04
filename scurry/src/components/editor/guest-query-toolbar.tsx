'use client';

import * as React from 'react';
import { Play, Loader2, Code, History, Download } from 'lucide-react';
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

interface ConnectionInfo {
  id: string;
  name: string;
  type: string;
  color?: string;
}

interface GuestQueryToolbarProps {
  connections: ConnectionInfo[];
  selectedConnectionId: string | null;
  currentQuery: string;
  onConnectionChange: (connectionId: string) => void;
  onExecute: () => void;
  onFormat: () => void;
  onToggleHistory: () => void;
  onExport?: () => void;
  executing: boolean;
  hasResults: boolean;
  showHistory?: boolean;
}

export function GuestQueryToolbar({
  connections,
  selectedConnectionId,
  onConnectionChange,
  onExecute,
  onFormat,
  onToggleHistory,
  onExport,
  executing,
  hasResults,
  showHistory,
}: GuestQueryToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 md:gap-2 p-2 border-b bg-muted/30 flex-wrap">
        <Select value={selectedConnectionId || ''} onValueChange={onConnectionChange}>
          <SelectTrigger className="w-full sm:w-[180px] md:w-[200px]">
            <SelectValue placeholder="Select connection" />
          </SelectTrigger>
          <SelectContent>
            {connections.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No connections</div>
            ) : (
              connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: conn.color || '#8B5A2B' }}
                    />
                    {conn.name}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="flex-1 min-w-0" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={showHistory ? 'secondary' : 'ghost'} 
              size="icon" 
              onClick={onToggleHistory}
              className="h-9 w-9 touch-target"
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Query History</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onFormat} className="h-9 w-9 touch-target hidden sm:flex">
              <Code className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Format SQL</TooltipContent>
        </Tooltip>

        {hasResults && onExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExport} className="h-9 w-9 touch-target hidden sm:flex">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        )}

        <Button 
          onClick={onExecute} 
          disabled={executing || !selectedConnectionId}
          className="h-9 touch-target"
        >
          {executing ? (
            <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
          ) : (
            <Play className="h-4 w-4 sm:mr-2" />
          )}
          <span className="hidden sm:inline">Run</span>
          <span className="hidden md:inline ml-2 text-xs text-muted-foreground">⌘↵</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
