import { useEffect } from 'react';

/**
 * 用 IntersectionObserver 做进入视口淡入。
 *
 * 同一容器内的元素按 DOM 顺序依次延迟，形成克制的错落感。
 * 即使脚本失败，`.reveal` 也会在 `no-js` 场景下保持可见。
 */
export function useRevealOnScroll(options?: { threshold?: number; rootMargin?: string }) {
  /*
   * threshold 用 0、底边只内缩 8%：
   * 元素一进入视口就开始淡入，长图不会因为「要露出 18% 才触发」而长时间停留在透明状态。
   */
  const { threshold = 0, rootMargin = '0px 0px -8% 0px' } = options ?? {};

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
    if (!nodes.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const group = el.closest('[data-reveal-group]');
          const peers = group
            ? Array.from(group.querySelectorAll<HTMLElement>('.reveal'))
            : [el];
          const index = Math.max(0, peers.indexOf(el));
          el.style.transitionDelay = `${Math.min(index, 6) * 70}ms`;
          el.classList.add('is-visible');
          observer.unobserve(el);
        });
      },
      { threshold, rootMargin },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [threshold, rootMargin]);
}
