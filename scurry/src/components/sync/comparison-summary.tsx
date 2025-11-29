'use client';

import * as React from 'react';
import { CheckCircle2, AlertTriangle, MinusCircle, PlusCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ComparisonSummaryProps {
  totalRows: number;
  matchingRows: number;
  differentRows: number;
  sourceOnlyRows: number;
  targetOnlyRows: number;
  isComparing?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ComparisonSummary({
  totalRows,
  matchingRows,
  differentRows,
  sourceOnlyRows,
  targetOnlyRows,
  isComparing = false,
  onRefresh,
  className,
}: ComparisonSummaryProps) {
  const matchPercentage = totalRows > 0 ? Math.round((matchingRows / totalRows) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      <TooltipProvider>
        {/* Match count */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              <CheckCircle2 className="h-3 w-3" />
              {matchingRows}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {matchingRows} matching rows ({matchPercentage}%)
          </TooltipContent>
        </Tooltip>

        {/* Different count */}
        {differentRows > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              >
                <AlertTriangle className="h-3 w-3" />
                {differentRows}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{differentRows} rows with differences</TooltipContent>
          </Tooltip>
        )}

        {/* Source only count */}
        {sourceOnlyRows > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <PlusCircle className="h-3 w-3" />
                {sourceOnlyRows}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{sourceOnlyRows} rows only in source</TooltipContent>
          </Tooltip>
        )}

        {/* Target only count */}
        {targetOnlyRows > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              >
                <MinusCircle className="h-3 w-3" />
                {targetOnlyRows}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{targetOnlyRows} rows only in target</TooltipContent>
          </Tooltip>
        )}

        {/* Refresh button */}
        {onRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRefresh}
                disabled={isComparing}
              >
                <RefreshCw
                  className={cn('h-3 w-3', isComparing && 'animate-spin')}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh comparison</TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
