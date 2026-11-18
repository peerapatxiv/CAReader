import { useEffect, useState, type RefObject } from 'preact/compat';

export function visibleRange(scrollTop: number, viewport: number, rowHeight: number, count: number, overscan = 8) {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const end = Math.min(count, Math.ceil((scrollTop + viewport) / rowHeight) + overscan);
  return { start: Math.min(start, end), end };
}

/** Track scroll position + height of a scroll container. */
export function useScrollBox(ref: RefObject<HTMLElement>) {
  const [box, setBox] = useState({ top: 0, height: 600 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setBox({ top: el.scrollTop, height: el.clientHeight });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, [ref]);
  return box;
}
