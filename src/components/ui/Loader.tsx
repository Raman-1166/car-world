import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CarSilhouette } from "./CarSilhouette";

/** Cinematic loading screen. Progress eases toward 92% then completes when the 3D scene reports ready. */
export function Loader({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [p, setP] = useState(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const done = useRef(false);

  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    let cur = 0;
    const tick = (now: number) => {
      const el = (now - t0) / 1000;
      const cap = (readyRef.current && el > 2.4) || el > 7 ? 1 : Math.min(0.92, el / 3.2);
      cur += (cap - cur) * 0.05 + 0.0015;
      cur = Math.min(cur, cap);
      setP(cur);
      if (cur >= 0.999 && !done.current) {
        done.current = true;
        setTimeout(onDone, 650);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const pct = Math.round(p * 100);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-ink"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      exit={{ clipPath: "inset(0% 0% 100% 0%)", transition: { duration: 1.3, ease: [0.76, 0, 0.24, 1] } }}
    >
      <div className="relative flex flex-col items-center">
        <div className="display text-center text-[clamp(3.4rem,10vw,8rem)] leading-[0.82] text-bone">
          <div>CAR</div>
          <div className="outline">WORLD</div>
        </div>

        <div
          className="relative mt-10 w-[min(78vw,560px)] text-white/70"
          style={{ clipPath: `inset(0 ${100 - pct}% 0 0)`, filter: `blur(${(1 - p) * 3}px)`, opacity: 0.2 + p * 0.8 }}
        >
          <CarSilhouette stroke="currentColor" strokeWidth={1.6} />
        </div>

        <div className="mt-8 flex w-[min(78vw,560px)] items-center justify-between">
          <span className="label text-white/50">Loading experience</span>
          <span className="mono-num text-sm tracking-widest text-white/70">{String(pct).padStart(3, "0")}</span>
        </div>
        <div className="relative mt-3 h-px w-[min(78vw,560px)] bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-racing" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </motion.div>
  );
}
