import Lenis from "lenis";

let lenis: Lenis | null = null;

const cine = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initScroll() {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
  let raf = 0;
  const loop = (t: number) => {
    lenis?.raf(t);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

export function scrollToTarget(target: string | number | HTMLElement, offset = 0, duration = 2) {
  if (lenis) lenis.scrollTo(target as never, { offset, duration, easing: cine });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: "smooth" });
  else {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    el?.scrollIntoView({ behavior: "smooth" });
  }
}

export function lockScroll(lock: boolean) {
  if (!lenis) return;
  if (lock) lenis.stop();
  else lenis.start();
}
