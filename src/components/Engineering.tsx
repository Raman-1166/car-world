import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Grid, Html } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { StudioEnv } from "./three/Studio";
import { EASE, EASE_OUT, MaskLine } from "./ui/Reveal";
import { CARS } from "../data/cars";
import { clamp, damp, lerp, pointer, range, smooth, useIsMobile } from "../lib/utils";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const CAM = [V(5.6, 1.3, 6.2), V(6.2, 2.4, 6.4), V(5.0, 3.0, 5.6), V(0.5, 3.4, 7.2), V(-4.8, 3.3, 5.6), V(-6.5, 3.8, 4.2)];
const TGT = [V(0, 0.6, 0), V(0.2, 1.0, 0), V(0.4, 1.0, 0), V(-0.3, 0.9, 0), V(-0.8, 1.2, 0), V(-1.2, 1.7, 0)];

interface EngStage {
  no: string;
  title: string;
  sub: string;
  body: string;
  at: number;
  anchor: [number, number, number];
}

const ENG: EngStage[] = [
  { no: "01", title: "Carbon monocoque", sub: "78 kg · 52,000 Nm/°", body: "A tub autoclaved and laid by hand. Rigid enough to make the suspension the only thing that moves.", at: 0.2, anchor: [0.1, 0.45, 0.5] },
  { no: "02", title: "Dual motor", sub: "2 × 425 HP · axial flux", body: "Two axial-flux motors, one per axle. Torque vectoring in 1.5 milliseconds.", at: 0.36, anchor: [1.4, 0.6, 0.15] },
  { no: "03", title: "Thermal system", sub: "112 kWh · ±1 °C", body: "A dielectric cooling loop holds the battery within a degree under full load — lap after lap.", at: 0.52, anchor: [-0.7, 0.34, -0.4] },
  { no: "04", title: "Active suspension", sub: "1,000 Hz · magnetorheological", body: "Dampers that read the road a thousand times a second and answer before you feel it.", at: 0.66, anchor: [1.4, 0.62, 1.55] },
  { no: "05", title: "Active aero", sub: "0 — 38° · 3 modes", body: "A rear wing and underfloor that rewrite themselves at every speed.", at: 0.8, anchor: [-2.1, 3.1, 0] },
];

/* ------------------------------------------------------------------ */
function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function cyl(r: number, len: number, x: number, y: number, z: number, axis: "x" | "z" = "z") {
  const g = new THREE.CylinderGeometry(r, r, len, 16);
  if (axis === "z") g.rotateX(Math.PI / 2);
  else g.rotateZ(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
function strut(a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, 8);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

function useParts() {
  return useMemo(() => {
    const chassis = mergeGeometries([
      box(3.4, 0.05, 1.0, 0, 0.15, 0),
      box(3.0, 0.13, 0.1, 0, 0.24, 0.5),
      box(3.0, 0.13, 0.1, 0, 0.24, -0.5),
      box(0.6, 0.14, 0.7, 1.85, 0.28, 0),
      box(0.6, 0.16, 0.8, -1.9, 0.3, 0),
      box(1.5, 0.3, 0.05, -0.15, 0.42, 0.46),
      box(1.5, 0.3, 0.05, -0.15, 0.42, -0.46),
      box(0.06, 0.6, 0.92, -0.62, 0.62, 0),
      box(0.06, 0.42, 0.92, 0.55, 0.42, 0),
    ])!;
    const motors = mergeGeometries([
      cyl(0.17, 0.5, 1.4, 0.37, 0),
      box(0.34, 0.28, 0.42, 1.4, 0.37, 0),
      cyl(0.17, 0.5, -1.38, 0.37, 0),
      box(0.34, 0.28, 0.42, -1.38, 0.37, 0),
      cyl(0.03, 4.0, 1.4, 0.37, 0),
      cyl(0.03, 4.0, -1.38, 0.37, 0),
    ])!;
    const bat: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) bat.push(box(0.27, 0.09, 0.78, -0.95 + i * 0.31, 0.3, 0));
    bat.push(cyl(0.018, 2.4, 0.05, 0.38, 0.43, "x"), cyl(0.018, 2.4, 0.05, 0.38, -0.43, "x"));
    const battery = mergeGeometries(bat)!;
    const sus: THREE.BufferGeometry[] = [];
    for (const s of [1, -1]) {
      for (const x of [1.4, -1.38]) {
        const hub = V(x, 0.37, s * 1.85);
        sus.push(
          strut(V(x + 0.22, 0.52, s * 0.45), V(x + 0.02, 0.52, s * 1.8), 0.017),
          strut(V(x - 0.22, 0.52, s * 0.45), V(x - 0.02, 0.52, s * 1.8), 0.017),
          strut(V(x + 0.24, 0.2, s * 0.42), V(x + 0.02, 0.22, s * 1.8), 0.02),
          strut(V(x - 0.24, 0.2, s * 0.42), V(x - 0.02, 0.22, s * 1.8), 0.02),
          strut(V(x + 0.05, 0.82, s * 0.5), V(x + 0.03, 0.26, s * 1.6), 0.032),
          cyl(0.06, 0.12, x, 0.37, hub.z),
        );
      }
    }
    const suspension = mergeGeometries(sus)!;
    const aero = mergeGeometries([
      box(3.0, 0.02, 1.5, -0.1, 0.07, 0),
      ...[-0.6, -0.3, 0, 0.3, 0.6].map((z) => box(0.7, 0.15, 0.02, -1.85, 0.14, z)),
      box(1.0, 0.1, 0.02, 0.1, 0.12, 0.75),
      box(1.0, 0.1, 0.02, 0.1, 0.12, -0.75),
      box(0.35, 0.02, 0.32, 2.0, 0.1, 0.95),
      box(0.35, 0.02, 0.32, 2.0, 0.1, -0.95),
    ])!;
    return { chassis, motors, battery, suspension, aero };
  }, []);
}

function Part({
  geo,
  progress,
  reveal,
  hot,
  color = "#16181b",
}: {
  geo: THREE.BufferGeometry;
  progress: MotionValue<number>;
  reveal: (p: number) => number;
  hot: (p: number) => number;
  color?: string;
}) {
  const g = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.85,
        roughness: 0.38,
        transparent: true,
        opacity: 0,
        emissive: new THREE.Color("#c1121f"),
        emissiveIntensity: 0,
        envMapIntensity: 1.2,
      }),
    [color],
  );
  const lmat = useMemo(() => new THREE.LineBasicMaterial({ color: "#9a9da4", transparent: true, opacity: 0 }), []);
  const eg = useMemo(() => new THREE.EdgesGeometry(geo, 25), [geo]);
  useFrame(() => {
    const p = progress.get();
    const r = reveal(p);
    const h = hot(p);
    mat.opacity = r * 0.95;
    mat.emissiveIntensity = h * 0.45;
    lmat.opacity = r * (0.3 + 0.7 * h);
    lmat.color.setRGB(lerp(0.6, 0.85, h), lerp(0.62, 0.1, h), lerp(0.64, 0.14, h));
    if (g.current) {
      g.current.visible = r > 0.01;
      g.current.position.y = (1 - r) * -0.3;
    }
  });
  return (
    <group ref={g}>
      <mesh geometry={geo} material={mat} />
      <lineSegments geometry={eg} material={lmat} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
function EngWorld({ progress, stage }: { progress: MotionValue<number>; stage: number }) {
  const { camera, size } = useThree();
  const parts = useParts();
  const explode = useRef(0);
  const ptr = useRef({ x: 0, y: 0 });
  const curves = useMemo(
    () => ({ pos: new THREE.CatmullRomCurve3(CAM, false, "centripetal"), tgt: new THREE.CatmullRomCurve3(TGT, false, "centripetal") }),
    [],
  );
  const vp = useMemo(() => new THREE.Vector3(), []);
  const vt = useMemo(() => new THREE.Vector3(), []);
  const lights = useRef({ current: 1 }).current;
  const spec = CARS[0];

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const p = progress.get();
    explode.current = smooth(range(p, 0.1, 0.36));
    ptr.current.x = damp(ptr.current.x, pointer.x, 2, dt);
    ptr.current.y = damp(ptr.current.y, pointer.y, 2, dt);
    curves.pos.getPoint(clamp(p), vp);
    curves.tgt.getPoint(clamp(p), vt);
    const asp = size.width / size.height;
    const k = clamp(1.35 / asp, 1, 2);
    vp.sub(vt).multiplyScalar(k).add(vt);
    camera.position.copy(vp);
    camera.position.x += ptr.current.x * 0.35;
    camera.position.y += ptr.current.y * 0.2;
    camera.lookAt(vt);
  });

  const h = (c: number, w = 0.09) => (p: number) => smooth(1 - Math.abs(p - c) / w);
  const r = (a: number, b: number) => (p: number) => smooth(range(p, a, b));

  return (
    <>
      <color attach="background" args={["#040404"]} />
      <fog attach="fog" args={["#040404", 14, 34]} />
      <StudioEnv />
      <ambientLight intensity={0.05} />
      <spotLight position={[0, 9, 2]} angle={0.6} penumbra={1} decay={1.3} intensity={140} />
      <spotLight position={[-6, 3, -4]} angle={0.5} penumbra={1} decay={1.4} intensity={60} />
      <pointLight position={[3, 0.5, 4]} color="#c1121f" intensity={7} decay={1.6} />

      <CarModel spec={spec} lights={lights} explode={explode} quality="low" beams={false} wingAngle={0.3} />

      <Part geo={parts.chassis} progress={progress} reveal={r(0.14, 0.26)} hot={h(0.24, 0.1)} />
      <Part geo={parts.motors} progress={progress} reveal={r(0.3, 0.4)} hot={h(0.4, 0.08)} color="#202226" />
      <Part geo={parts.battery} progress={progress} reveal={r(0.46, 0.56)} hot={h(0.56, 0.08)} color="#101113" />
      <Part geo={parts.suspension} progress={progress} reveal={r(0.6, 0.7)} hot={h(0.7, 0.07)} color="#2a2c30" />
      <Part geo={parts.aero} progress={progress} reveal={r(0.72, 0.82)} hot={h(0.84, 0.08)} color="#0b0b0c" />

      {ENG.map((s, i) => (
        <Html key={s.no} position={s.anchor} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
          <div
            className="flex items-center gap-3 whitespace-nowrap transition-all duration-1000"
            style={{ opacity: stage > i ? (stage === i + 1 ? 1 : 0.35) : 0, transform: stage > i ? "translateX(0)" : "translateX(-12px)" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-racing opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-racing" />
            </span>
            <span className="h-px w-8 bg-white/40 sm:w-14" />
            <div>
              <div className="label text-[0.55rem] text-bone sm:text-[0.62rem]">
                {s.no} · {s.title}
              </div>
              <div className="mt-1 hidden text-[0.68rem] font-light tracking-wider text-white/50 sm:block">{s.sub}</div>
            </div>
          </div>
        </Html>
      ))}

      <Grid
        position={[0, -0.01, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#26282c"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#4a4d54"
        fadeDistance={20}
        fadeStrength={1.6}
        infiniteGrid
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
export function Engineering() {
  const ref = useRef<HTMLElement>(null);
  const mobile = useIsMobile();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.35 });
  const [stage, setStage] = useState(0);
  useMotionValueEvent(progress, "change", (p) => {
    let s = 0;
    ENG.forEach((e, i) => {
      if (p >= e.at) s = i + 1;
    });
    setStage((o) => (o === s ? o : s));
  });

  const headOpacity = useTransform(progress, [0, 0.1, 0.17], [1, 1, 0]);
  const headY = useTransform(progress, [0, 0.17], [0, -60]);
  const pct = useTransform(progress, (v) => String(Math.round(clamp(v) * 100)).padStart(3, "0") + " %");
  const cur = stage > 0 ? ENG[stage - 1] : null;

  return (
    <section id="technology" ref={ref} className="relative h-[560vh] bg-[#040404]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <LazyCanvas className="absolute inset-0" camera={{ position: [5.6, 1.3, 6.2], fov: mobile ? 36 : 30, near: 0.1, far: 60 }}>
          <EngWorld progress={progress} stage={stage} />
        </LazyCanvas>

        <div className="pointer-events-none absolute inset-0 z-10">
          {/* headline */}
          <motion.div style={{ opacity: headOpacity, y: headY }} className="absolute left-6 top-[16vh] sm:left-[6vw]">
            <div className="label mb-8 flex items-center gap-4 text-white/50">
              <span className="mono-num text-racing">05</span>
              <span className="h-px w-12 bg-white/25" />
              <span>Technology</span>
            </div>
            <h2 className="display display-lg">
              <MaskLine>ENGINEERED</MaskLine>
              <MaskLine delay={0.12}>
                <span className="outline">FOR EMOTION.</span>
              </MaskLine>
            </h2>
            <p className="label mt-8 text-white/45">Scroll to disassemble ↓</p>
          </motion.div>

          {/* lab readout */}
          <div className="absolute right-6 top-[14vh] hidden text-right sm:right-[3vw] sm:block">
            <div className="label text-white/35">Lab 01 / Apex</div>
            <motion.div className="mono-num mt-2 text-sm text-white/50">{pct}</motion.div>
          </div>

          {/* index */}
          <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 text-right sm:right-[3vw] sm:block">
            {ENG.map((e, i) => (
              <div key={e.no} className={`flex items-center justify-end gap-4 py-[0.4rem] transition-all duration-700 ${stage === i + 1 ? "text-bone" : stage > i ? "text-white/45" : "text-white/15"}`}>
                <span className="label text-[0.58rem]">{e.title}</span>
                <span className="mono-num text-xs">{e.no}</span>
                <span className={`h-px transition-all duration-700 ${stage === i + 1 ? "w-10 bg-racing" : "w-4 bg-current"}`} />
              </div>
            ))}
          </div>

          {/* stage copy */}
          <div className="absolute bottom-[8vh] left-6 max-w-sm sm:left-[6vw]">
            <AnimatePresence mode="wait">
              {cur && (
                <motion.div
                  key={cur.no}
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE_OUT } }}
                  exit={{ opacity: 0, y: -16, filter: "blur(8px)", transition: { duration: 0.4, ease: EASE } }}
                >
                  <div className="label mb-4 flex items-center gap-3 text-white/50">
                    <span className="mono-num text-racing">{cur.no}</span>
                    <span>{cur.sub}</span>
                  </div>
                  <h3 className="display text-5xl sm:text-6xl">{cur.title}</h3>
                  <p className="mt-4 text-sm font-light leading-relaxed text-white/55">{cur.body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
