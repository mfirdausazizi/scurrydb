'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-mobile-table';

interface ScrollIndicatorProps {
  direction: 'left' | 'right';
  visible: boolean;
  onClick?: () => void;
  className?: string;
}

export function ScrollIndicator({
  direction,
  visible,
  onClick,
  className,
}: ScrollIndicatorProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

  return (
    <div
      className={cn(
        'absolute top-0 bottom-0 w-10 z-20 pointer-events-none',
        'flex items-center justify-center',
        direction === 'left' ? 'left-0' : 'right-0',
        prefersReducedMotion ? '' : 'transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        background:
          direction === 'left'
            ? 'linear-gradient(to right, hsl(var(--background)), transparent)'
            : 'linear-gradient(to left, hsl(var(--background)), transparent)',
      }}
    >
      {onClick && visible && (
        <button
          onClick={onClick}
          className={cn(
            'pointer-events-auto p-1 rounded-full',
            'bg-background/80 border border-border shadow-sm',
            'hover:bg-accent hover:border-accent',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            prefersReducedMotion ? '' : 'transition-colors duration-150'
          )}
          aria-label={`Scroll ${direction}`}
        >
          <Icon className="h-4 w-4 text-sprint" />
        </button>
      )}
    </div>
  );
}

interface ScrollIndicatorsProps {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  className?: string;
}

export function ScrollIndicators({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
  className,
}: ScrollIndicatorsProps) {
  return (
    <>
      <ScrollIndicator
        direction="left"
        visible={canScrollLeft}
        onClick={onScrollLeft}
        className={className}
      />
      <ScrollIndicator
        direction="right"
        visible={canScrollRight}
        onClick={onScrollRight}
        className={className}
      />
    </>
  );
}
