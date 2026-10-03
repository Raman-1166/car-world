import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Line } from "@react-three/drei";
import * as THREE from "three";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { Dust, ReflectFloor, StudioEnv, useShadowExempt } from "./three/Studio";
import { MaskLine } from "./ui/Reveal";
import { useDragRotate } from "../hooks/useDragRotate";
import { makeProfiles } from "../lib/carGeometry";
import { CARS } from "../data/cars";
import { clamp, lerp, range, smooth, useIsMobile } from "../lib/utils";

const BG = "#0c1218";

function EnergyLines({ power }: { power: MotionValue<number> }) {
  const spec = CARS[1];
  const prof = useMemo(() => makeProfiles({ cabinH: spec.cabinH, nose: spec.nose }), [spec]);
  const lines = useMemo(() => {
    const out: { pts: THREE.Vector3[]; speed: number; offset: number; width: number }[] = [];
    const xs: number[] = [];
    for (let x = -3.6; x <= 3.6; x += 0.12) xs.push(x);
    const top = (x: number) => {
      let y = prof.top(x);
      if (x > -1.5 && x < 1.0) y = Math.max(y, prof.cabTop(x) * (0.9 + 0.1 * Math.min(1, (x + 1.5) * 2)));
      return y;
    };
    // roof-sweeping lines
    for (let k = 0; k < 5; k++) {
      const z = (k - 2) * 0.17;
      const pts = xs.map((x) => new THREE.Vector3(x, top(x) + 0.14 + k * 0.012 + Math.sin(x * 2 + k) * 0.015, z * (1 - Math.min(1, Math.abs(x) / 5) * 0.4)));
      out.push({ pts, speed: 0.6 + k * 0.12, offset: k * 0.7, width: 1.1 });
    }
    // flank lines
    for (const s of [1, -1]) {
      for (let k = 0; k < 4; k++) {
        const yy = 0.28 + k * 0.17;
        const pts = xs.map((x) => {
          const hw = Math.max(prof.hw(x) * prof.cap(x), 0.3);
          const wob = Math.sin(x * 1.6 + k * 1.3) * 0.03;
          return new THREE.Vector3(x, yy + wob + (Math.abs(x) > 2.2 ? (Math.abs(x) - 2.2) * 0.1 : 0), s * (hw + 0.1 + k * 0.012));
        });
        out.push({ pts, speed: 0.5 + k * 0.1, offset: k * 0.45 + (s > 0 ? 0 : 1.3), width: 1 });
      }
    }
    return out;
  }, [prof]);

  const refs = useRef<(any | null)[]>([]);
  const grp = useRef<THREE.Group>(null);
  useShadowExempt(grp);
  useFrame((_, dt) => {
    const pw = power.get();
    refs.current.forEach((l, i) => {
      if (!l?.material) return;
      l.material.dashOffset -= dt * (0.35 + lines[i].speed * (0.4 + pw * 1.8));
      l.material.opacity = 0.18 + pw * 0.62;
    });
  });

  return (
    <group ref={grp}>
      {lines.map((l, i) => (
        <Line
          key={i}
          ref={(el: any) => {
            refs.current[i] = el;
          }}
          points={l.pts}
          color="#a8cbff"
          lineWidth={l.width}
          dashed
          dashSize={0.45}
          gapSize={1.3}
          dashOffset={l.offset}
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
        />
      ))}
    </group>
  );
}

function ElectricWorld({ progress, power, drag, quality }: { progress: MotionValue<number>; power: MotionValue<number>; drag: ReturnType<typeof useDragRotate>; quality: "high" | "low" }) {
  const { camera, size } = useThree();
  const ring = useRef<THREE.Mesh>(null);
  const spec = CARS[1];
  const lights = useRef({ current: 1 }).current;
  const look = useMemo(() => new THREE.Vector3(0, 0.55, 0), []);

  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const p = progress.get();
    const st = drag.update(dt);
    const asp = size.width / size.height;
    const r = clamp(8.2 * Math.max(1, 1.35 / asp), 7, 15);
    const az = lerp(0.55, 1.75, smooth(p)) + st.yaw;
    const el = 0.16 + st.pitch;
    camera.position.set(Math.cos(az) * Math.cos(el) * r, 0.55 + Math.sin(el) * r, Math.sin(az) * Math.cos(el) * r);
    camera.lookAt(look);
    if (ring.current) {
      const t = (s.clock.elapsedTime * 0.5) % 1;
      ring.current.scale.setScalar(1 + t * 1.3);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.35 * (0.3 + power.get());
    }
  });

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 14, 38]} />
      <StudioEnv cool />
      <ambientLight intensity={0.08} color="#aac4ff" />
      <spotLight position={[0, 8, 1]} angle={0.55} penumbra={1} decay={1.4} intensity={120} color="#e8f0ff" />
      <spotLight position={[-6, 3, -4]} angle={0.5} penumbra={1} decay={1.4} intensity={80} color="#8fb4ff" />
      <spotLight position={[6, 2.5, 5]} angle={0.6} penumbra={1} decay={1.4} intensity={40} color="#cfe0ff" />
      <CarModel spec={spec} lights={lights} quality={quality} signature="#d6e8ff" beams={false} />
      <EnergyLines power={power} />
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.004}>
        <ringGeometry args={[2.5, 2.52, 96]} />
        <meshBasicMaterial color="#a8cbff" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      <ReflectFloor quality={quality} color="#0a1016" y={-0.002} mix={45} />
      <ContactShadows position={[0, 0.004, 0]} opacity={0.8} scale={12} blur={2.4} far={1.8} resolution={512} />
      <Dust count={quality === "high" ? 60 : 20} opacity={0.3} />
    </>
  );
}

const STATS = [
  { v: "780", u: "KM", l: "Range", a: 0.2 },
  { v: "18", u: "MIN", l: "Charge 10—80%", a: 0.36 },
  { v: "2.6", u: "SEC", l: "0—100 km/h", a: 0.52 },
  { v: "AWD", u: "", l: "Tri-motor vectoring", a: 0.68 },
];

export function ElectricFuture() {
  const ref = useRef<HTMLElement>(null);
  const mobile = useIsMobile();
  const dragRef = useRef<HTMLDivElement>(null);
  const drag = useDragRotate(dragRef);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 30, mass: 0.4 });
  const power = useTransform(progress, (p) => smooth(range(p, 0.05, 0.6)));
  const charge = useTransform(progress, [0.3, 0.75], ["10%", "80%"]);
  const chargeNum = useTransform(progress, (p) => Math.round(lerp(10, 80, smooth(range(p, 0.3, 0.75)))));

  return (
    <section id="electric" ref={ref} className="relative h-[330vh]" style={{ background: BG }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div ref={dragRef} data-cursor="drag" className="absolute inset-0">
          <LazyCanvas className="absolute inset-0" camera={{ position: [6, 1.5, 6], fov: 30, near: 0.1, far: 70 }}>
            <ElectricWorld progress={progress} power={power} drag={drag} quality={mobile ? "low" : "high"} />
          </LazyCanvas>
        </div>
        {/* soft cool wash from above */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[40vh]" style={{ background: "linear-gradient(to bottom, rgba(140,180,255,0.07), transparent)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32" style={{ background: `linear-gradient(to bottom, #050505, transparent)` }} />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute left-6 top-[15vh] sm:left-[6vw]">
            <div className="label mb-8 flex items-center gap-4 text-[#9fb8d8]">
              <span className="mono-num text-racing">06</span>
              <span className="h-px w-12 bg-[#9fb8d8]/40" />
              <span>Electric future</span>
            </div>
            <h2 className="display display-lg">
              <MaskLine>THE NEXT</MaskLine>
              <MaskLine delay={0.12}>
                <span className="outline" style={{ WebkitTextStroke: "1px rgba(190,215,255,0.5)" }}>
                  MOTION.
                </span>
              </MaskLine>
            </h2>
          </div>

          {/* stats */}
          <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-y-6 px-6 pb-[7vh] sm:grid-cols-4 sm:px-[6vw]">
            {STATS.map((s) => (
              <Stat key={s.l} stat={s} progress={progress} />
            ))}
          </div>

          {/* charge */}
          <div className="absolute right-6 top-[15vh] hidden w-56 sm:right-[6vw] sm:block">
            <div className="label mb-3 flex justify-between text-[#9fb8d8]">
              <span>State of charge</span>
              <motion.span className="mono-num">{chargeNum}</motion.span>
            </div>
            <div className="h-px w-full bg-white/15">
              <motion.div className="h-[3px] -translate-y-px bg-[#cfe3ff]" style={{ width: charge }} />
            </div>
            <div className="label mt-3 text-[0.55rem] text-white/35">350 kW · 800 V architecture</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ stat, progress }: { stat: (typeof STATS)[number]; progress: MotionValue<number> }) {
  const o = useTransform(progress, [stat.a - 0.04, stat.a + 0.04], [0, 1]);
  const y = useTransform(progress, [stat.a - 0.04, stat.a + 0.04], [30, 0]);
  const blur = useTransform(progress, [stat.a - 0.04, stat.a + 0.04], ["blur(10px)", "blur(0px)"]);
  return (
    <motion.div style={{ opacity: o, y, filter: blur }} className="border-t border-[#9fb8d8]/25 pt-4 sm:pr-6">
      <div className="flex items-end gap-2">
        <span className="mono-num text-[clamp(2.6rem,6.6vw,6.5rem)] leading-[0.85]">{stat.v}</span>
        {stat.u && <span className="label pb-2 text-[#9fb8d8]">{stat.u}</span>}
      </div>
      <div className="label mt-3 text-[0.58rem] text-white/45">{stat.l}</div>
    </motion.div>
  );
}
