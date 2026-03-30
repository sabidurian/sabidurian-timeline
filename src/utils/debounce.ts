/**
 * debounce — Rate-limits a function so it only runs once per delay window.
 * Uses requestAnimationFrame when delay is 0 (for frame-rate throttling).
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  const debounced = (...args: any[]) => {
    if (delay === 0) {
      // rAF-based throttle (~16ms on 60Hz)
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        fn(...args);
      });
    } else {
      if (timer != null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, delay);
    }
  };

  return debounced as unknown as T;
}

/**
 * Detect if current device uses touch as primary input.
 */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore — vendor prefix
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Detect narrow viewport (mobile-ish).
 */
export function isMobileViewport(): boolean {
  return window.innerWidth < 768;
}
