'use client';

import * as React from 'react';
import { Lock, LockOpen, Table2, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ScrollLockMode } from '@/types/sync';

interface ScrollLockControlsProps {
  mode: ScrollLockMode;
  onModeChange: (mode: ScrollLockMode) => void;
}

const MODE_CONFIG: Record<ScrollLockMode, { label: string; description: string; icon: React.ElementType }> = {
  off: {
    label: 'Off',
    description: 'Panels scroll independently',
    icon: LockOpen,
  },
  table: {
    label: 'Table Lock',
    description: 'Selecting a table syncs all panels',
    icon: Table2,
  },
  row: {
    label: 'Table & Row Lock',
    description: 'Table selection and scroll position sync across panels',
    icon: Rows3,
  },
};

export function ScrollLockControls({ mode, onModeChange }: ScrollLockControlsProps) {
  const currentConfig = MODE_CONFIG[mode];
  const Icon = currentConfig.icon;
  const isLocked = mode !== 'off';

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-2',
                  isLocked && 'border-amber-500 text-amber-600 dark:text-amber-400'
                )}
              >
                {isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <LockOpen className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{currentConfig.label}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Scroll Lock: {currentConfig.label}</p>
            <p className="text-xs text-muted-foreground">{currentConfig.description}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) => onModeChange(value as ScrollLockMode)}
          >
            {(Object.entries(MODE_CONFIG) as [ScrollLockMode, typeof MODE_CONFIG[ScrollLockMode]][]).map(
              ([key, config]) => {
                const ItemIcon = config.icon;
                return (
                  <DropdownMenuRadioItem
                    key={key}
                    value={key}
                    className="flex items-start gap-2 py-2"
                  >
                    <ItemIcon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                  </DropdownMenuRadioItem>
                );
              }
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
