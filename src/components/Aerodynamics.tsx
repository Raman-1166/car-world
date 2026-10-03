import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, Line } from "@react-three/drei";
import * as THREE from "three";
import { AnimatePresence, motion } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { StudioEnv, useShadowExempt } from "./three/Studio";
import { EASE, EASE_OUT, MaskLine } from "./ui/Reveal";
import { useDragRotate } from "../hooks/useDragRotate";
import { makeProfiles } from "../lib/carGeometry";
import { CARS } from "../data/cars";
import { clamp, damp, lerp, useIsMobile } from "../lib/utils";
import { sound } from "../lib/sound";

type Mode = "downforce" | "drag" | "airflow" | "active";

const MODES: { id: Mode; title: string; value: string; unit: string; text: string }[] = [
  { id: "downforce", title: "Downforce", value: "1,240", unit: "KG @ 300 KM/H", text: "A flat floor and venturi tunnels glue 1.2 tonnes of air to the road. Red marks where the pressure works." },
  { id: "drag", title: "Drag", value: "0.27", unit: "CD", text: "Despite the wing, the body slips through at a Cd of 0.27. Watch the wake close behind the tail." },
  { id: "airflow", title: "Airflow", value: "94", unit: "% LAMINAR", text: "Ninety-four percent of the surface stays attached. Cool air is channelled to brakes, battery and motors." },
  { id: "active", title: "Active aero", value: "0—38", unit: "° WING ANGLE", text: "The wing reads speed, steering and brake pressure and re-trims itself every 10 ms." },
];

const WING_STEPS = [0.0, 0.18, 0.4];
const WING_LABEL = ["0° · LOW DRAG", "18° · BALANCED", "38° · MAX DOWNFORCE"];

const M = 190;
const T = 10;

function Streamlines({ mode }: { mode: React.RefObject<Mode> }) {
  const spec = CARS[0];
  const prof = useMemo(() => makeProfiles({ cabinH: spec.cabinH, nose: spec.nose }), [spec]);
  const state = useMemo(() => {
    const items: { y: number; z: number; x: number; v: number; ph: number }[] = [];
    while (items.length < M) {
      const y = 0.06 + Math.random() * 2.5;
      const z = (Math.random() * 2 - 1) * 2.1;
      const rho = Math.sqrt(Math.pow((y - 0.62) / 0.62, 2) + Math.pow(z / 1.0, 2));
      if (rho < 1.12) continue;
      items.push({ y, z, x: -8 + Math.random() * 16, v: 0.75 + Math.random() * 0.5, ph: Math.random() * 6.28 });
    }
    return items;
  }, []);

  const { geo, pos, col } = useMemo(() => {
    const pos = new Float32Array(M * (T - 1) * 2 * 3);
    const col = new Float32Array(M * (T - 1) * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    return { geo, pos, col };
  }, []);

  const lsRef = useRef<THREE.LineSegments>(null);
  useShadowExempt(lsRef);
  const ptmp = useMemo(() => new Float32Array(T * 3), []);
  const ctmp = useMemo(() => new Float32Array(T * 3), []);

  const H = (x: number) => {
    let h = prof.top(x);
    if (x > -1.6 && x < 1.0) h = Math.max(h, prof.cabTop(x));
    if (x < -1.7 && x > -2.45) h = Math.max(h, 1.26);
    return h;
  };

  useFrame((s, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const m = mode.current ?? "airflow";
    const speed = m === "airflow" ? 11 : 8;
    const turb = m === "drag" ? 1 : 0.18;
    const down = m === "downforce" ? 1 : m === "active" ? 0.5 : 0.12;
    const time = s.clock.elapsedTime;
    for (let i = 0; i < M; i++) {
      const it = state[i];
      it.x -= dt * speed * it.v;
      if (it.x < -8.2) it.x = 8.2;
      for (let k = 0; k < T; k++) {
        const x = it.x + k * 0.22;
        const hh = H(x);
        const bot = prof.bot(x);
        const cy = (hh + bot) / 2;
        const ay = Math.max((hh - bot) / 2 + 0.03, 0.12);
        const az = Math.max(prof.hw(x) * prof.cap(x) + 0.03, 0.12);
        const dy = it.y - cy;
        const dz = it.z;
        const rho = Math.sqrt((dy / ay) * (dy / ay) + (dz / az) * (dz / az)) || 0.001;
        // smooth max keeps lines hugging the silhouette
        const along = x > -2.6 && x < 2.6 ? 1 : 0;
        const rho2 = along ? Math.pow(Math.pow(rho, 6) + Math.pow(1.14, 6), 1 / 6) : rho;
        const bulge = along * 0.22 * Math.exp(-(rho - 1) * 1.6) * Math.min(1, rho2 / 1.14);
        const r = rho2 + bulge;
        let y = cy + (dy / rho) * ay * r;
        let z = (dz / rho) * az * r;
        // wake turbulence
        if (x < -2.2) {
          const w = Math.min(1, (-2.2 - x) / 2.5) * turb * Math.exp(-Math.abs(it.z) * 0.5) * Math.exp(-Math.abs(it.y - 0.7) * 0.6);
          y += Math.sin(x * 2.3 + it.ph + time * 5) * 0.28 * w;
          z += Math.cos(x * 2.1 + it.ph * 1.3 + time * 4.5) * 0.28 * w;
        }
        if (y < 0.03) y = 0.03;
        ptmp[k * 3] = x;
        ptmp[k * 3 + 1] = y;
        ptmp[k * 3 + 2] = z;

        // colour: ice white → racing red near the surface (pressure) / in the wake
        const near = clamp((1.7 - rho) / 0.6);
        const wake = x < -2.3 && x > -5.5 ? turb * Math.min(1, (-2.3 - x) / 1.2) : 0;
        const redAmt = clamp(near * down + wake * 0.9);
        const fade = 1 - k / (T - 1);
        const f = fade * fade * (0.75 + 0.25 * Math.sin(it.ph));
        ctmp[k * 3] = lerp(0.62, 1.0, redAmt) * f * 0.9;
        ctmp[k * 3 + 1] = lerp(0.72, 0.1, redAmt) * f * 0.9;
        ctmp[k * 3 + 2] = lerp(0.9, 0.14, redAmt) * f * 0.9;
      }
      for (let k = 0; k < T - 1; k++) {
        const o = (i * (T - 1) + k) * 6;
        for (let c = 0; c < 3; c++) {
          pos[o + c] = ptmp[k * 3 + c];
          pos[o + 3 + c] = ptmp[(k + 1) * 3 + c];
          col[o + c] = ctmp[k * 3 + c];
          col[o + 3 + c] = ctmp[(k + 1) * 3 + c];
        }
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments ref={lsRef} geometry={geo} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}

function DownforceArrows({ mode }: { mode: React.RefObject<Mode> }) {
  const g = useRef<THREE.Group>(null);
  useShadowExempt(g);
  const pts: [number, number, number][] = [
    [-2.06, 1.52, 0.5],
    [-2.06, 1.52, -0.5],
    [1.95, 0.45, 0.5],
    [1.95, 0.45, -0.5],
    [0.2, 0.36, 0.55],
    [0.2, 0.36, -0.55],
  ];
  useFrame((s) => {
    if (!g.current) return;
    const on = mode.current === "downforce" || mode.current === "active";
    g.current.children.forEach((c, i) => {
      const t = (s.clock.elapsedTime * 0.9 + i * 0.17) % 1;
      c.visible = on;
      c.position.y = pts[i][1] + (1 - t) * 0.35;
      c.scale.setScalar(on ? 0.6 + 0.4 * Math.sin(t * Math.PI) : 0.001);
    });
  });
  return (
    <group ref={g}>
      {pts.map((p, i) => (
        <mesh key={i} position={p} rotation-x={Math.PI}>
          <coneGeometry args={[0.07, 0.22, 12]} />
          <meshBasicMaterial color="#c1121f" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Tunnel() {
  const frames = useMemo(() => {
    const out: THREE.Vector3[][] = [];
    for (let x = -7; x <= 7; x += 2.333) {
      out.push([new THREE.Vector3(x, 0, -3.2), new THREE.Vector3(x, 4.4, -3.2), new THREE.Vector3(x, 4.4, 3.2), new THREE.Vector3(x, 0, 3.2)]);
    }
    return out;
  }, []);
  const tg = useRef<THREE.Group>(null);
  useShadowExempt(tg);
  return (
    <group ref={tg}>
      {frames.map((f, i) => (
        <Line key={i} points={f} color="#ffffff" transparent opacity={0.07} lineWidth={1} />
      ))}
      {[-3.2, 3.2].map((z) => (
        <Line key={z} points={[new THREE.Vector3(-7, 4.4, z), new THREE.Vector3(7, 4.4, z)]} color="#ffffff" transparent opacity={0.07} lineWidth={1} />
      ))}
      {/* rolling-road belt */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]}>
        <planeGeometry args={[14, 4]} />
        <meshStandardMaterial color="#0a0a0b" roughness={0.8} metalness={0.4} />
      </mesh>
    </group>
  );
}

function AeroWorld({ mode, wing, drag, quality }: { mode: React.RefObject<Mode>; wing: number; drag: ReturnType<typeof useDragRotate>; quality: "high" | "low" }) {
  const { camera, size } = useThree();
  const lights = useRef({ current: 1 }).current;
  const look = useMemo(() => new THREE.Vector3(0, 0.6, 0), []);
  const r = useRef(8.4);
  const spec = CARS[0];

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const st = drag.update(dt);
    if (!st.dragging) st.yaw += dt * 0.025;
    const asp = size.width / size.height;
    r.current = damp(r.current, clamp(8.4 * Math.max(1, 1.4 / asp), 7, 16), 3, dt);
    const az = 0.85 + st.yaw;
    const el = 0.14 + st.pitch * 1.5;
    camera.position.set(Math.cos(az) * Math.cos(el) * r.current, 0.6 + Math.sin(el) * r.current, Math.sin(az) * Math.cos(el) * r.current);
    camera.lookAt(look);
  });

  return (
    <>
      <color attach="background" args={["#030303"]} />
      <fog attach="fog" args={["#030303", 12, 30]} />
      <StudioEnv />
      <ambientLight intensity={0.05} />
      <spotLight position={[0, 8, 1]} angle={0.6} penumbra={1} decay={1.4} intensity={110} />
      <spotLight position={[-6, 3, -4]} angle={0.5} penumbra={1} decay={1.4} intensity={50} />
      <CarModel spec={spec} lights={lights} quality={quality} beams={false} wingAngle={wing} />
      <Tunnel />
      <Streamlines mode={mode} />
      <DownforceArrows mode={mode} />
      <ContactShadows position={[0, 0.006, 0]} opacity={0.9} scale={12} blur={2.2} far={1.8} resolution={512} />
      <Grid position={[0, -0.01, 0]} args={[40, 40]} cellSize={0.5} cellThickness={0.5} cellColor="#1d1f22" sectionSize={2.5} sectionThickness={0.9} sectionColor="#383b40" fadeDistance={18} fadeStrength={1.6} infiniteGrid />
    </>
  );
}

export function Aerodynamics() {
  const mobile = useIsMobile();
  const [mode, setMode] = useState<Mode>("downforce");
  const [wingStep, setWingStep] = useState(1);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const dragRef = useRef<HTMLDivElement>(null);
  const drag = useDragRotate(dragRef);

  useEffect(() => {
    if (mode !== "active") return;
    const t = window.setInterval(() => setWingStep((s) => (s + 1) % WING_STEPS.length), 2600);
    return () => window.clearInterval(t);
  }, [mode]);

  const wing = mode === "active" ? WING_STEPS[wingStep] : mode === "downforce" ? 0.3 : mode === "drag" ? 0.02 : 0.12;
  const cur = MODES.find((m) => m.id === mode)!;

  return (
    <section id="aerodynamics" className="relative h-screen min-h-[780px] overflow-hidden bg-[#030303]">
      <div ref={dragRef} data-cursor="drag" className="absolute inset-0">
        <LazyCanvas className="absolute inset-0" camera={{ position: [5, 1.5, 6], fov: 30, near: 0.1, far: 60 }}>
          <AeroWorld mode={modeRef} wing={wing} drag={drag} quality={mobile ? "low" : "high"} />
        </LazyCanvas>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#050505] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050505] to-transparent" />

      <div className="pointer-events-none absolute inset-0 z-10 px-6 pb-8 pt-[13vh] sm:px-[6vw] sm:pb-[7vh]">
        <div className="label mb-7 flex items-center gap-4 text-white/50">
          <span className="mono-num text-racing">07</span>
          <span className="h-px w-12 bg-white/25" />
          <span>Aerodynamics · Wind tunnel</span>
        </div>
        <h2 className="display text-[clamp(2.8rem,6.6vw,7rem)] leading-[0.86]">
          <MaskLine>SHAPED BY</MaskLine>
          <MaskLine delay={0.12}>
            <span className="outline">THE WIND.</span>
          </MaskLine>
        </h2>

        <div className="absolute inset-x-6 bottom-8 flex flex-col justify-between gap-8 sm:inset-x-[6vw] sm:bottom-[7vh] lg:flex-row lg:items-end">
          <div className="pointer-events-auto flex flex-wrap gap-x-8 gap-y-3 lg:block lg:space-y-1">
            {MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => {
                  sound.tick();
                  setMode(m.id);
                }}
                className={`group flex items-center gap-4 text-left transition-colors duration-500 ${mode === m.id ? "text-bone" : "text-white/35 hover:text-white/75"}`}
              >
                <span className="mono-num w-5 text-xs">0{i + 1}</span>
                <span className="display text-3xl sm:text-5xl">{m.title}</span>
                <span className={`hidden h-px bg-racing transition-all duration-700 lg:block ${mode === m.id ? "w-12" : "w-0"}`} />
              </button>
            ))}
          </div>

          <div className="min-h-[9.5rem] lg:w-[24rem] lg:text-right">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -12, filter: "blur(8px)", transition: { duration: 0.3, ease: EASE } }}
              >
                <div className="flex items-end gap-3 lg:justify-end">
                  <span className="mono-num text-6xl leading-none sm:text-8xl">{cur.value}</span>
                  <span className="label pb-2 text-racing">{cur.unit}</span>
                </div>
                {mode === "active" && <div className="label mt-3 text-white/60">{WING_LABEL[wingStep]}</div>}
                <p className="mt-4 text-[0.82rem] font-light leading-relaxed text-white/50 lg:ml-auto lg:max-w-[22rem]">{cur.text}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="label absolute right-6 top-[14vh] hidden text-white/35 sm:right-[6vw] sm:block">Drag to rotate · 60 m/s</div>
      </div>
    </section>
  );
}
