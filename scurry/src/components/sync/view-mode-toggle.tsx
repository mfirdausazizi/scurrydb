'use client';

import * as React from 'react';
import { LayoutGrid, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ViewMode } from '@/types/sync';

interface ViewModeToggleProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center border rounded-md">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 px-3 rounded-r-none',
                mode === 'tab' && 'bg-muted'
              )}
              onClick={() => onModeChange('tab')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tab View</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 px-3 rounded-l-none border-l',
                mode === 'split' && 'bg-muted'
              )}
              onClick={() => onModeChange('split')}
            >
              <Columns2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Split View</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
