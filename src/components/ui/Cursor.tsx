import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useIsCoarse } from "../../lib/utils";

type Mode = "idle" | "hover" | "drag" | "view";

export function Cursor() {
  const coarse = useIsCoarse();
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 900, damping: 50, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 900, damping: 50, mass: 0.25 });
  const [mode, setMode] = useState<Mode>("idle");
  const [down, setDown] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (coarse) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHidden(false);
      const t = e.target as HTMLElement | null;
      const c = t?.closest?.("[data-cursor]") as HTMLElement | null;
      if (c?.dataset.cursor === "drag") setMode("drag");
      else if (c?.dataset.cursor === "view") setMode("view");
      else if (c || t?.closest?.("a,button,input,[role=button]")) setMode("hover");
      else setMode("idle");
    };
    const dn = () => setDown(true);
    const up = () => setDown(false);
    const leave = () => setHidden(true);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", dn);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", dn);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, [coarse, x, y]);

  if (coarse) return null;

  const big = mode === "drag" || mode === "view";
  const size = big ? (down ? 70 : 96) : mode === "hover" ? 52 : 7;

  return (
    <motion.div className="pointer-events-none fixed left-0 top-0 z-[9999]" style={{ x: sx, y: sy, opacity: hidden ? 0 : 1 }}>
      <motion.div
        className="absolute flex items-center justify-center rounded-full"
        style={{ translateX: "-50%", translateY: "-50%", borderWidth: 1, borderStyle: "solid" }}
        animate={{
          width: size,
          height: size,
          backgroundColor: mode === "idle" ? "rgba(255,255,255,1)" : big ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0)",
          borderColor: mode === "idle" ? "rgba(255,255,255,0)" : "rgba(255,255,255,0.55)",
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <span
          className="label whitespace-pre text-center transition-opacity duration-300"
          style={{ fontSize: "0.5rem", letterSpacing: "0.2em", lineHeight: 1.5, opacity: big ? 1 : 0 }}
        >
          {mode === "view" ? "VIEW\nVEHICLE" : "DRAG TO\nROTATE"}
        </span>
      </motion.div>
    </motion.div>
  );
}
