import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 横向画廊：支持按钮翻页、触摸/触控板横滑、键盘方向键，
 * 并同步上一页/下一页按钮的可用状态与当前页序号。
 */
export function useCarousel<T extends HTMLElement>(itemCount: number) {
  const ref = useRef<T | null>(null);
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const x = el.scrollLeft;
    setAtStart(x <= 2);
    setAtEnd(x >= max - 2);
    const first = el.firstElementChild as HTMLElement | null;
    if (first && first.offsetWidth > 0) {
      const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0');
      setIndex(Math.max(0, Math.min(itemCount - 1, Math.round(x / step))));
    }
  }, [itemCount]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first && first.offsetWidth > 0 ? first.offsetWidth + 20 : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);

  const scrollToIndex = useCallback((next: number) => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    const target = items[Math.max(0, Math.min(items.length - 1, next))];
    if (target) el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollByPage(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollByPage(-1);
      }
    },
    [scrollByPage],
  );

  return { ref, index, atStart, atEnd, scrollByPage, scrollToIndex, onKeyDown, sync };
}
