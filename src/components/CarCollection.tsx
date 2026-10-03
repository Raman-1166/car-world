import { useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { Dust, GroundFog, ReflectFloor, StudioEnv } from "./three/Studio";
import { Magnetic } from "./ui/Magnetic";
import { EASE, EASE_OUT, MaskLine } from "./ui/Reveal";
import { CARS, fmtPrice, type CarSpec } from "../data/cars";
import { damp, pointer, range, smoother, useIsMobile } from "../lib/utils";
import { scrollToTarget } from "../lib/scroll";
import { sound } from "../lib/sound";

const N = CARS.length;
const SP = 9;
const TINTS = ["#ffffff", "#bcd2ff", "#ffc9c9", "#ffffff", "#ffe4b8"];

/* ------------------------------------------------------------------ */
/* 3D                                                                  */
/* ------------------------------------------------------------------ */
function CollectionWorld({ target, onPick, quality }: { target: MotionValue<number>; onPick: (id: string) => void; quality: "high" | "low" }) {
  const { camera, size } = useThree();
  const cur = useRef(0);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const rig = useRef<THREE.Group>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const ptr = useRef({ x: 0, y: 0 });
  const tint = useMemo(() => new THREE.Color("#ffffff"), []);
  const tgtColor = useMemo(() => new THREE.Color(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const tg = target.get();
    cur.current = damp(cur.current, tg, 3.4, dt);
    const c = cur.current;
    const vel = tg - c;
    const av = Math.min(1, Math.abs(vel));
    ptr.current.x = damp(ptr.current.x, pointer.x, 2.4, dt);
    ptr.current.y = damp(ptr.current.y, pointer.y, 2.4, dt);

    const asp = size.width / size.height;
    const back = asp < 1 ? 9.5 / Math.max(asp, 0.45) * 0.62 : 7.3;

    // cinematic move: camera lags behind, arcs and pulls back while travelling
    camera.position.set(c * SP - vel * 2.2 + ptr.current.x * 0.5, 1.05 + av * 0.35 + ptr.current.y * 0.25, back + av * 1.8);
    look.set(c * SP + vel * 0.6, asp < 1 ? 0.9 : 0.55, 0);
    camera.lookAt(look);

    if (rig.current) rig.current.position.x = c * SP;
    const t = state.clock.elapsedTime;
    groups.current.forEach((g, i) => {
      if (!g) return;
      const d = i - c;
      g.visible = Math.abs(d) < 1.35;
      g.rotation.y = -0.6 - d * 0.55 + ptr.current.x * 0.08 + Math.sin(t * 0.35 + i) * 0.03;
      g.position.z = -Math.abs(d) * 0.8;
    });

    tgtColor.set(TINTS[Math.min(N - 1, Math.max(0, Math.round(c)))]);
    tint.lerp(tgtColor, 1 - Math.exp(-dt * 3));
    if (rim.current) rim.current.color.copy(tint);
  });

  return (
    <>
      <fog attach="fog" args={["#050505", 14, 38]} />
      <StudioEnv />
      <ambientLight intensity={0.04} />
      <group ref={rig}>
        <spotLight position={[0, 8, 1]} angle={0.55} penumbra={1} decay={1.4} intensity={110} />
        <spotLight ref={rim} position={[-6, 3, -4]} angle={0.5} penumbra={1} decay={1.4} intensity={70} />
        <ReflectFloor quality={quality} y={-0.002} />
        <ContactShadows position={[0, 0.004, 0]} opacity={0.9} scale={14} blur={2.2} far={1.8} resolution={512} />
        <GroundFog count={4} opacity={0.06} />
      </group>
      {CARS.map((car, i) => (
        <group
          key={car.id}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[i * SP, 0, 0]}
          onClick={(e) => {
            if (Math.abs(i - cur.current) < 0.35) {
              e.stopPropagation();
              onPick(car.id);
            }
          }}
        >
          <CarModel spec={car} quality={quality} beams={false} />
        </group>
      ))}
      <Dust count={quality === "high" ? 50 : 20} opacity={0.28} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Editorial index                                                     */
/* ------------------------------------------------------------------ */
function IndexTable({ onGo }: { onGo: (i: number) => void }) {
  return (
    <div className="mt-24 border-t border-white/12">
      {CARS.map((c, i) => (
        <motion.button
          key={c.id}
          onClick={() => {
            sound.tick();
            onGo(i);
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-5% 0px" }}
          transition={{ duration: 0.9, delay: i * 0.07, ease: EASE_OUT }}
          className="group relative grid w-full grid-cols-[2.2rem_1fr_auto] items-center gap-4 border-b border-white/12 py-5 text-left sm:grid-cols-[4rem_1fr_12rem_8rem_6rem] sm:py-6"
        >
          <span className="absolute inset-y-0 left-0 w-0 bg-white/[0.035] transition-all duration-700 [transition-timing-function:cubic-bezier(.76,0,.24,1)] group-hover:w-full" />
          <span className="mono-num relative text-sm text-white/40 transition-colors group-hover:text-racing">{c.index}</span>
          <span className="display relative text-4xl transition-transform duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:translate-x-4 sm:text-6xl">{c.name}</span>
          <span className="label relative hidden text-white/45 sm:block">{c.category}</span>
          <span className="mono-num relative hidden text-xl text-white/70 sm:block">{c.hp} HP</span>
          <span className="label relative justify-self-end text-white/40 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-bone">View →</span>
        </motion.button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
export function CarCollection({ onOpen }: { onOpen: (id: string) => void }) {
  const mobile = useIsMobile();
  const introRef = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const { scrollYProgress: introP } = useScroll({ target: introRef, offset: ["start end", "end start"] });
  const titleX = useTransform(introP, [0, 1], ["6vw", "-8vw"]);
  const marqueeX = useTransform(introP, [0, 1], ["0%", "-38%"]);
  const subY = useTransform(introP, [0, 1], [60, -80]);

  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const target = useTransform(scrollYProgress, (p) => {
    const f = p * (N - 1);
    const fl = Math.min(Math.floor(f), N - 2);
    return fl + smoother(range(f - fl, 0.3, 0.7));
  });
  useMotionValueEvent(target, "change", (v) => setIdx(Math.round(v)));

  const goTo = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToTarget(top + (i / (N - 1)) * (el.offsetHeight - window.innerHeight), 0, 2.2);
  };
  const toShowcase = (i: number) => {
    const el = wrap.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToTarget(top + (i / (N - 1)) * (el.offsetHeight - window.innerHeight), 0, 2.6);
  };

  const car: CarSpec = CARS[idx];

  return (
    <section id="collection" className="relative bg-ink">
      {/* --- editorial intro --- */}
      <div ref={introRef} className="relative overflow-hidden px-6 pb-24 pt-[24vh] sm:px-[6vw]">
        <div className="label mb-10 flex items-center gap-4 text-white/50">
          <span className="mono-num text-racing">02</span>
          <span className="h-px w-12 bg-white/25" />
          <span>The line-up</span>
        </div>

        <motion.h2 style={{ x: titleX }} className="display display-xl">
          <MaskLine>THE</MaskLine>
          <MaskLine delay={0.12}>
            <span className="outline">COLLECTION</span>
          </MaskLine>
        </motion.h2>

        <motion.p style={{ y: subY }} className="ml-auto mt-14 max-w-sm text-right text-lg font-extralight leading-snug text-white/70 sm:mt-6 sm:text-2xl">
          Machines designed without compromise.
        </motion.p>

        <div className="mt-24 overflow-hidden">
          <motion.div style={{ x: marqueeX }} className="display flex w-max gap-14 whitespace-nowrap text-[clamp(5rem,15vw,15rem)] leading-[0.9]">
            {[...CARS, ...CARS].map((c, i) => (
              <span key={i} className={i % 2 ? "outline" : "text-white/[0.07]"}>
                {c.name}
              </span>
            ))}
          </motion.div>
        </div>

        <IndexTable onGo={toShowcase} />
      </div>

      {/* --- pinned showcase --- */}
      <div ref={wrap} className="relative" style={{ height: `${N * 115}vh` }}>
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
          {/* giant name behind the car */}
          <AnimatePresence>
            <motion.div
              key={car.id}
              className="pointer-events-none absolute inset-x-0 top-[11vh] z-0 flex justify-center sm:top-[8vh]"
              initial={{ opacity: 0, x: "9vw", filter: "blur(16px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 1.1, ease: EASE_OUT, delay: 0.1 } }}
              exit={{ opacity: 0, x: "-9vw", filter: "blur(16px)", transition: { duration: 0.7, ease: EASE } }}
            >
              <span
                className="display whitespace-nowrap text-[clamp(8rem,31vw,36rem)] leading-[0.82] text-white/[0.035]"
                style={{ WebkitTextStroke: "1px rgba(236,235,231,0.2)" }}
              >
                {car.name}
              </span>
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 z-10" data-cursor="view">
            <LazyCanvas className="absolute inset-0" camera={{ position: [0, 1.1, 7.3], fov: 30, near: 0.1, far: 70 }}>
              <CollectionWorld target={target} onPick={onOpen} quality={mobile ? "low" : "high"} />
            </LazyCanvas>
          </div>

          {/* UI */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {/* counter */}
            <div className="absolute left-6 top-[13vh] flex items-center gap-4 sm:left-[6vw]">
              <span className="label text-white/50">The collection</span>
              <span className="h-px w-10 bg-white/25" />
              <span className="mono-num text-sm tracking-widest">
                <span className="text-bone">{car.index}</span>
                <span className="text-white/35"> / 0{N}</span>
              </span>
            </div>

            {/* dots */}
            <div className="pointer-events-auto absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-end gap-4 sm:right-[2.2vw]">
              {CARS.map((c, i) => (
                <button key={c.id} onClick={() => goTo(i)} className="group flex items-center gap-3" aria-label={`Go to ${c.name}`}>
                  <span className={`label hidden text-[0.55rem] transition-all duration-500 sm:block ${i === idx ? "translate-x-0 text-bone opacity-100" : "translate-x-2 text-white/40 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`}>
                    {c.name}
                  </span>
                  <span className={`block h-px transition-all duration-700 ${i === idx ? "w-9 bg-racing" : "w-4 bg-white/35 group-hover:w-7"}`} />
                </button>
              ))}
            </div>

            {/* info */}
            <div className="absolute inset-x-0 bottom-0 px-6 pb-9 sm:px-[6vw] sm:pb-[7vh]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={car.id}
                  initial="in"
                  animate="show"
                  exit="out"
                  className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"
                >
                  <div>
                    <div className="mb-4 flex items-center gap-5 overflow-hidden">
                      <motion.span variants={{ in: { y: "110%" }, show: { y: 0 }, out: { y: "-110%" } }} transition={{ duration: 0.7, ease: EASE }} className="mono-num text-5xl leading-none text-white/25 sm:text-7xl">
                        {car.index}
                      </motion.span>
                      <motion.div variants={{ in: { y: "110%" }, show: { y: 0 }, out: { y: "-110%" } }} transition={{ duration: 0.7, delay: 0.05, ease: EASE }}>
                        <div className="display text-3xl sm:text-5xl">{car.name}</div>
                        <div className="label mt-2 text-racing">{car.category}</div>
                      </motion.div>
                    </div>
                    <div className="overflow-hidden">
                      <motion.p variants={{ in: { y: "110%" }, show: { y: 0 }, out: { y: "-110%" } }} transition={{ duration: 0.7, delay: 0.1, ease: EASE }} className="max-w-sm text-sm font-light leading-relaxed text-white/55">
                        {car.personality}
                      </motion.p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-x-10 gap-y-5 sm:gap-x-14">
                    {[
                      [String(car.hp), "HP"],
                      [car.sec.toFixed(1), "SEC"],
                      [String(car.kmh), "KM/H"],
                    ].map(([v, u], i) => (
                      <div key={u} className="overflow-hidden">
                        <motion.div variants={{ in: { y: "110%" }, show: { y: 0 }, out: { y: "-110%" } }} transition={{ duration: 0.75, delay: 0.12 + i * 0.06, ease: EASE }}>
                          <div className="mono-num text-5xl leading-none sm:text-7xl">{v}</div>
                          <div className="label mt-2 text-white/45">{u}</div>
                        </motion.div>
                      </div>
                    ))}
                    <div className="pointer-events-auto flex flex-col items-start gap-3">
                      <span className="label text-white/45">From {fmtPrice(car.price)}</span>
                      <Magnetic>
                        <button className="btn btn-red" onClick={() => onOpen(car.id)}>
                          Explore vehicle <span>→</span>
                        </button>
                      </Magnetic>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
