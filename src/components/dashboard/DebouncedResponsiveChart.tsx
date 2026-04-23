'use client';

import { useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

const DEBOUNCE_MS = 120;

type DebouncedResponsiveChartProps = {
  height: number;
  className?: string;
  children: ReactElement;
};

/**
 * Recharts' ResponsiveContainer listens to parent size on every frame. When the
 * dashboard rail animates width (hover expand), that causes heavy relayout.
 * Debouncing resize commits keeps charts stable until the transition settles.
 */
export function DebouncedResponsiveChart({
  height,
  className = 'w-full min-w-0',
  children,
}: DebouncedResponsiveChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const apply = (width: number) => {
      if (width <= 0) return;
      setSize({ w: width, h: height });
    };

    apply(el.getBoundingClientRect().width);

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w == null || w <= 0) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => apply(w), DEBOUNCE_MS);
    });

    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(debounceRef.current);
    };
  }, [height]);

  return (
    <div ref={wrapRef} className={className} style={{ height }}>
      {size && size.w > 0 ? (
        <ResponsiveContainer width={size.w} height={size.h}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
