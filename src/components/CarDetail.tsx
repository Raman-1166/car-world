import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { AnimatePresence, motion, useMotionValue, type MotionValue } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { Dust, StudioEnv } from "./three/Studio";
import { Magnetic } from "./ui/Magnetic";
import { EASE, EASE_OUT } from "./ui/Reveal";
import { useDragRotate } from "../hooks/useDragRotate";
import { fmtPrice, getCar, type CarSpec } from "../data/cars";
import { damp, lerp, pointer, smooth, useIsMobile } from "../lib/utils";
import { lockScroll } from "../lib/scroll";
import { sound } from "../lib/sound";

/* ------------------------------------------------------------------ */
function DetailWorld({
  spec,
  drag,
  rot,
  quality,
}: {
  spec: CarSpec;
  drag: ReturnType<typeof useDragRotate>;
  rot: MotionValue<number>;
  quality: "high" | "low";
}) {
  const { camera, size } = useThree();
  const car = useRef<THREE.Group>(null);
  const platter = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  const auto = useRef(0);
  const ptr = useRef({ x: 0, y: 0 });
  const look = useMemo(() => new THREE.Vector3(0, 0.55, 0), []);
  const ticks = useMemo(() => Array.from({ length: 72 }), []);
  const lights = useRef({ current: 0 }).current;

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05);
    t0.current += dt;
    const intro = smooth(t0.current / 2.4);
    lights.current = smooth((t0.current - 0.6) / 1.2);
    const st = drag.update(dt);
    if (!st.dragging) auto.current += dt * 0.12;
    const yaw = -0.62 + st.yaw + auto.current;
    if (car.current) {
      car.current.rotation.y = yaw;
      car.current.rotation.z = 0;
    }
    if (platter.current) platter.current.rotation.y = yaw;
    rot.set((-(st.yaw + auto.current) * 180) / Math.PI);

    ptr.current.x = damp(ptr.current.x, pointer.x, 2, dt);
    ptr.current.y = damp(ptr.current.y, pointer.y, 2, dt);
    const asp = size.width / size.height;
    const base = asp < 1 ? 12.5 : 7.6;
    const pitch = 1.1 + st.pitch * 4 + ptr.current.y * 0.2;
    camera.position.set(ptr.current.x * 0.4, pitch, lerp(4.4, base, intro));
    look.set(0, asp < 1 ? 0.7 : 0.55, 0);
    camera.lookAt(look);
  });

  return (
    <>
      <StudioEnv />
      <ambientLight intensity={0.05} />
      <spotLight position={[0, 8, 2]} angle={0.5} penumbra={1} decay={1.4} intensity={120} />
      <spotLight position={[-6, 3, -4]} angle={0.5} penumbra={1} decay={1.4} intensity={60} />
      <spotLight position={[6, 2, 5]} angle={0.6} penumbra={1} decay={1.4} intensity={22} color="#b9cdf5" />
      <pointLight position={[-3, 0.6, -3.4]} color="#c1121f" intensity={10} decay={1.6} />

      <group ref={car}>
        <CarModel spec={spec} lights={lights} quality={quality} />
      </group>

      {/* turntable */}
      <group ref={platter}>
        <mesh rotation-x={-Math.PI / 2} position-y={-0.004}>
          <circleGeometry args={[3.5, 72]} />
          <meshStandardMaterial color="#0a0a0a" metalness={0.85} roughness={0.38} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
          <ringGeometry args={[3.42, 3.46, 96]} />
          <meshBasicMaterial color="#ecebe7" transparent opacity={0.28} />
        </mesh>
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const big = i % 6 === 0;
          return (
            <mesh key={i} position={[Math.cos(a) * 3.2, 0.002, Math.sin(a) * 3.2]} rotation={[-Math.PI / 2, 0, -a]}>
              <planeGeometry args={[big ? 0.2 : 0.09, 0.012]} />
              <meshBasicMaterial color={big && i === 0 ? "#c1121f" : "#ecebe7"} transparent opacity={big ? 0.55 : 0.2} />
            </mesh>
          );
        })}
      </group>
      <ContactShadows position={[0, 0.006, 0]} opacity={0.85} scale={11} blur={2.2} far={1.8} resolution={512} />
      <Dust count={quality === "high" ? 40 : 15} opacity={0.22} />
    </>
  );
}

/* ------------------------------------------------------------------ */
function SpecWheel({ spec, rot }: { spec: CarSpec; rot: MotionValue<number> }) {
  const text = `${spec.hp} HP — ${spec.nm} NM — ${spec.sec.toFixed(1)} SEC — ${spec.kmh} KM/H — ${spec.drive} — `.repeat(2);
  const ticks = Array.from({ length: 120 });
  return (
    <div className="pointer-events-none absolute left-1/2 top-[54%] z-0 aspect-square w-[min(150vw,92vh)] -translate-x-1/2 -translate-y-1/2 sm:w-[min(74vw,100vh)]">
      <motion.svg viewBox="0 0 600 600" className="h-full w-full" style={{ rotate: rot }}>
        <defs>
          <path id="wheel-path" d="M300,300 m-262,0 a262,262 0 1,1 524,0 a262,262 0 1,1 -524,0" />
        </defs>
        <circle cx="300" cy="300" r="290" fill="none" stroke="rgba(236,235,231,0.1)" />
        <circle cx="300" cy="300" r="238" fill="none" stroke="rgba(236,235,231,0.08)" />
        <g style={{ transformOrigin: "300px 300px", animation: "spin-slow 140s linear infinite reverse" }}>
          {ticks.map((_, i) => {
            const a = (i / ticks.length) * Math.PI * 2;
            const big = i % 10 === 0;
            const r1 = 290;
            const r2 = big ? 276 : 283;
            return (
              <line
                key={i}
                x1={300 + Math.cos(a) * r1}
                y1={300 + Math.sin(a) * r1}
                x2={300 + Math.cos(a) * r2}
                y2={300 + Math.sin(a) * r2}
                stroke={i === 0 ? "#c1121f" : "rgba(236,235,231,0.35)"}
                strokeWidth={big ? 1.4 : 0.8}
              />
            );
          })}
        </g>
        <g style={{ transformOrigin: "300px 300px", animation: "spin-slow 90s linear infinite" }}>
          <text fill="rgba(236,235,231,0.55)" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight={600} fontSize="19" letterSpacing="7">
            <textPath href="#wheel-path">{text}</textPath>
          </text>
        </g>
      </motion.svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function CarDetail({ carId, onClose, onConfigure }: { carId: string | null; onClose: () => void; onConfigure: (id: string) => void }) {
  return (
    <AnimatePresence>
      {carId && <DetailInner key={carId} spec={getCar(carId)} onClose={onClose} onConfigure={onConfigure} />}
    </AnimatePresence>
  );
}

function DetailInner({ spec, onClose, onConfigure }: { spec: CarSpec; onClose: () => void; onConfigure: (id: string) => void }) {
  const mobile = useIsMobile();
  const dragRef = useRef<HTMLDivElement>(null);
  const drag = useDragRotate(dragRef);
  const rot = useMotionValue(0);

  useEffect(() => {
    lockScroll(true);
    sound.whoosh();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const rows: [string, string][] = [
    ["Powertrain", spec.powertrain],
    ["Drive", spec.drive],
    ["Weight", spec.weight],
    ["Torque", `${spec.nm} NM`],
  ];

  const item = (d: number) => ({
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 1, delay: 0.7 + d, ease: EASE_OUT } },
  });

  return (
    <motion.div
      className="fixed inset-0 z-[120] overflow-hidden bg-ink"
      initial={{ clipPath: "inset(50% 0% 50% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)", transition: { duration: 1.15, ease: EASE } }}
      exit={{ clipPath: "inset(50% 0% 50% 0%)", transition: { duration: 0.9, ease: EASE } }}
    >
      <SpecWheel spec={spec} rot={rot} />

      {/* oversize name */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-[11vh] z-0 flex justify-center"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 1.6, delay: 0.5, ease: EASE_OUT } }}
      >
        <span className="display whitespace-nowrap text-[clamp(7rem,28vw,32rem)] leading-[0.82] text-transparent" style={{ WebkitTextStroke: "1px rgba(236,235,231,0.2)" }}>
          {spec.name}
        </span>
      </motion.div>

      {/* 3D */}
      <div ref={dragRef} data-cursor="drag" className="absolute inset-0 z-10">
        <LazyCanvas eager className="absolute inset-0" camera={{ position: [0, 1.1, 4.4], fov: 30, near: 0.1, far: 60 }}>
          <DetailWorld spec={spec} drag={drag} rot={rot} quality={mobile ? "low" : "high"} />
        </LazyCanvas>
      </div>

      {/* top bar */}
      <motion.div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 sm:px-[4vw]" {...item(0.2)}>
        <button onClick={onClose} className="label link-line flex items-center gap-3" aria-label="Close vehicle">
          <span>←</span> Back to collection
        </button>
        <div className="label hidden text-white/45 sm:block">
          Vehicle {spec.index} · {spec.category}
        </div>
        <button onClick={onClose} className="label text-white/45 transition-colors hover:text-bone" aria-label="Close">
          Esc ✕
        </button>
      </motion.div>

      {/* info */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col justify-between gap-6 px-6 pb-7 sm:px-[4vw] sm:pb-[5vh] lg:flex-row lg:items-end">
        <motion.div {...item(0.1)} className="hidden lg:block">
          <div className="label mb-2 text-white/40">Starting from</div>
          <div className="mono-num mb-7 text-4xl">{fmtPrice(spec.price)}</div>
          <dl className="w-[22rem] border-t border-white/12">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-white/12 py-3">
                <dt className="label text-white/40">{k}</dt>
                <dd className="mono-num text-base tracking-wider">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div {...item(0.2)} className="grid grid-cols-2 items-end gap-x-8 gap-y-5 sm:grid-cols-4 sm:gap-x-12 lg:flex lg:flex-wrap">
          {[
            [String(spec.hp), "HP"],
            [String(spec.nm), "NM"],
            [spec.sec.toFixed(1), "SEC 0—100"],
            [String(spec.kmh), "KM/H"],
          ].map(([v, u]) => (
            <div key={u}>
              <div className="mono-num text-4xl leading-none sm:text-6xl">{v}</div>
              <div className="label mt-2 text-white/45">{u}</div>
            </div>
          ))}
        </motion.div>

        <motion.div {...item(0.3)} className="pointer-events-auto flex flex-col items-start gap-4 lg:items-end">
          <div className="label text-white/40 lg:hidden">From {fmtPrice(spec.price)}</div>
          <p className="hidden max-w-[16rem] text-right text-[0.8rem] font-light leading-relaxed text-white/50 lg:block">{spec.tagline}</p>
          <Magnetic className="w-full lg:w-auto">
            <button
              className="btn btn-red w-full lg:w-auto justify-center"
              onClick={() => {
                sound.tick();
                onConfigure(spec.id);
              }}
            >
              Explore vehicle <span>→</span>
            </button>
          </Magnetic>
        </motion.div>
      </div>
    </motion.div>
  );
}
