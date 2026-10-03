import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { hasWebGL, useIsMobile } from "../../lib/utils";
import { CarSilhouette } from "./CarSilhouette";

export function WebGLFallback({ note = "Immersive 3D unavailable on this device" }: { note?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-white/40">
      <CarSilhouette className="w-[70%] max-w-[720px]" stroke="currentColor" />
      <span className="label">{note}</span>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("3D scene error", e);
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

interface Props {
  children: ReactNode;
  className?: string;
  camera?: CanvasProps["camera"];
  eager?: boolean;
  dprMax?: number;
  shadows?: boolean;
  onCreated?: CanvasProps["onCreated"];
  /** keep canvas mounted but paused when offscreen (default true) */
  alpha?: boolean;
}

/**
 * Mounts a WebGL canvas only when near the viewport and pauses rendering when off-screen.
 * Keeps GPU work minimal across the long page.
 */
export function LazyCanvas({ children, className = "absolute inset-0", camera, eager, dprMax, shadows, onCreated }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(!!eager);
  const [inView, setInView] = useState(!!eager);
  const webgl = useMemo(() => hasWebGL(), []);
  const mobile = useIsMobile();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = new IntersectionObserver(([e]) => setNear((n) => (eager ? n || e.isIntersecting : e.isIntersecting)), {
      rootMargin: "120% 0px",
    });
    const b = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "5% 0px" });
    a.observe(el);
    b.observe(el);
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, [eager]);

  const dpr: [number, number] = [1, dprMax ?? (mobile ? 1.5 : 2)];

  return (
    <div ref={ref} className={className}>
      {!webgl ? (
        <WebGLFallback />
      ) : (
        <Boundary fallback={<WebGLFallback note="Scene failed to initialise" />}>
          {near && (
            <Canvas
              dpr={dpr}
              shadows={shadows}
              frameloop={inView ? "always" : "never"}
              camera={camera ?? { position: [0, 1.2, 8], fov: 32, near: 0.1, far: 70 }}
              gl={{ antialias: !mobile, powerPreference: "high-performance" }}
              onCreated={onCreated}
              style={{ position: "absolute", inset: 0 }}
            >
              <Suspense fallback={null}>{children}</Suspense>
            </Canvas>
          )}
        </Boundary>
      )}
    </div>
  );
}
