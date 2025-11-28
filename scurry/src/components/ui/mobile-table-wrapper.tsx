'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTableScroll } from '@/hooks/use-mobile-table';
import { ScrollIndicators } from './scroll-indicator';

interface MobileTableWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
  showIndicators?: boolean;
}

export function MobileTableWrapper({
  children,
  className,
  maxHeight = 'max-h-[350px] md:max-h-[500px]',
  showIndicators = true,
}: MobileTableWrapperProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const {
    canScrollLeft,
    canScrollRight,
    scrollToStart,
    scrollToEnd,
  } = useTableScroll(containerRef);

  const hasHorizontalScroll = canScrollLeft || canScrollRight;

  return (
    <div className={cn('relative rounded-md border', className)}>
      {showIndicators && hasHorizontalScroll && (
        <ScrollIndicators
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScrollLeft={scrollToStart}
          onScrollRight={scrollToEnd}
        />
      )}
      <div
        ref={containerRef}
        className={cn('overflow-auto', maxHeight)}
      >
        {children}
      </div>
    </div>
  );
}
