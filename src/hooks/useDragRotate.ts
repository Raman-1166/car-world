import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface DragState {
  yaw: number;
  pitch: number;
  vyaw: number;
  dragging: boolean;
}

/**
 * Pointer / touch drag → yaw & pitch with inertia. Horizontal drags rotate;
 * vertical touch pans still scroll the page (touch-action: pan-y).
 */
export function useDragRotate(ref: RefObject<HTMLElement | null>, opts: { sens?: number; pitchLimit?: number } = {}) {
  const { sens = 0.0065, pitchLimit = 0.22 } = opts;
  const s = useRef<DragState>({ yaw: 0, pitch: 0, vyaw: 0, dragging: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.touchAction = "pan-y";
    let lx = 0;
    let ly = 0;
    let lt = 0;
    const down = (e: PointerEvent) => {
      s.current.dragging = true;
      s.current.vyaw = 0;
      lx = e.clientX;
      ly = e.clientY;
      lt = performance.now();
    };
    const move = (e: PointerEvent) => {
      if (!s.current.dragging) return;
      const now = performance.now();
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      const dt = Math.max(1, now - lt) / 1000;
      s.current.yaw += dx * sens;
      s.current.vyaw = (dx * sens) / dt;
      if (e.pointerType === "mouse") {
        s.current.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, s.current.pitch + dy * sens * 0.6));
      }
      lx = e.clientX;
      ly = e.clientY;
      lt = now;
    };
    const up = () => {
      s.current.dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [ref, sens, pitchLimit]);

  const update = useCallback((dt: number, settlePitch = true) => {
    const st = s.current;
    if (!st.dragging) {
      st.yaw += Math.max(-6, Math.min(6, st.vyaw)) * dt;
      st.vyaw *= Math.exp(-dt * 2.6);
      if (settlePitch) st.pitch *= Math.exp(-dt * 1.2);
    }
    return st;
  }, []);

  return { state: s, update };
}
