'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setBreakpoint('mobile');
      } else if (width < TABLET_BREAKPOINT) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isMobileOrTablet: breakpoint === 'mobile' || breakpoint === 'tablet',
  };
}

interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollProgress: number;
}

export function useTableScroll(containerRef: React.RefObject<HTMLElement | null>) {
  const [scrollState, setScrollState] = React.useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
    scrollProgress: 0,
  });

  const updateScrollState = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;
    
    setScrollState({
      canScrollLeft: scrollLeft > 5,
      canScrollRight: scrollLeft < maxScroll - 5,
      scrollProgress: maxScroll > 0 ? scrollLeft / maxScroll : 0,
    });
  }, [containerRef]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateScrollState();

    container.addEventListener('scroll', updateScrollState, { passive: true });
    
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [containerRef, updateScrollState]);

  const scrollToStart = React.useCallback(() => {
    containerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [containerRef]);

  const scrollToEnd = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
  }, [containerRef]);

  return {
    ...scrollState,
    scrollToStart,
    scrollToEnd,
    updateScrollState,
  };
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReducedMotion(mql.matches);
    mql.addEventListener('change', onChange);
    setPrefersReducedMotion(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return prefersReducedMotion;
}
