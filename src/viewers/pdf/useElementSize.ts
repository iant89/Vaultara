import { useLayoutEffect, useState, type RefObject } from 'react';

export interface ElementSize {
  readonly width: number;
  readonly height: number;
}

const EMPTY: ElementSize = { width: 0, height: 0 };

/** Tracks an element's content box so PDF pages can scale to whatever cell they sit in. */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>(EMPTY);

  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) {
      return;
    }

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return size;
}
