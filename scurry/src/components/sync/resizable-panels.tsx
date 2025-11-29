'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelsProps {
  children: React.ReactNode[];
  className?: string;
  minPanelWidth?: number;
}

export function ResizablePanels({
  children,
  className,
  minPanelWidth = 250,
}: ResizablePanelsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [panelWidths, setPanelWidths] = React.useState<number[]>([]);
  const [resizingIndex, setResizingIndex] = React.useState<number | null>(null);
  const [initialized, setInitialized] = React.useState(false);

  const panelCount = React.Children.count(children);

  // Initialize equal widths
  React.useEffect(() => {
    if (containerRef.current && !initialized) {
      const containerWidth = containerRef.current.offsetWidth;
      const handlersWidth = (panelCount - 1) * 8; // 8px per handler
      const availableWidth = containerWidth - handlersWidth;
      const equalWidth = availableWidth / panelCount;
      setPanelWidths(Array(panelCount).fill(equalWidth));
      setInitialized(true);
    }
  }, [panelCount, initialized]);

  // Reset widths when panel count changes
  React.useEffect(() => {
    if (initialized && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const handlersWidth = (panelCount - 1) * 8;
      const availableWidth = containerWidth - handlersWidth;
      const equalWidth = availableWidth / panelCount;
      setPanelWidths(Array(panelCount).fill(equalWidth));
    }
  }, [panelCount, initialized]);

  const handleResizeStart = React.useCallback((index: number) => {
    setResizingIndex(index);
  }, []);

  React.useEffect(() => {
    if (resizingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;

      // Calculate the position where the divider should be
      let leftPanelsWidth = 0;
      for (let i = 0; i < resizingIndex; i++) {
        leftPanelsWidth += panelWidths[i] + 8; // panel + handler
      }

      const newLeftWidth = mouseX - leftPanelsWidth;
      const currentRightWidth = panelWidths[resizingIndex + 1];
      const combinedWidth = panelWidths[resizingIndex] + currentRightWidth;

      // Enforce minimum widths
      const clampedLeftWidth = Math.max(
        minPanelWidth,
        Math.min(combinedWidth - minPanelWidth, newLeftWidth)
      );
      const newRightWidth = combinedWidth - clampedLeftWidth;

      setPanelWidths((prev) => {
        const next = [...prev];
        next[resizingIndex] = clampedLeftWidth;
        next[resizingIndex + 1] = newRightWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      setResizingIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingIndex, panelWidths, minPanelWidth]);

  const childrenArray = React.Children.toArray(children);

  return (
    <div ref={containerRef} className={cn('flex h-full overflow-hidden', className)}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          <div
            className="overflow-hidden flex-shrink-0"
            style={{
              width: panelWidths[index] || `${100 / panelCount}%`,
            }}
          >
            {child}
          </div>
          {index < childrenArray.length - 1 && (
            <div
              className={cn(
                'w-2 flex-shrink-0 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center group',
                resizingIndex === index && 'bg-primary/30'
              )}
              onMouseDown={() => handleResizeStart(index)}
            >
              <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
