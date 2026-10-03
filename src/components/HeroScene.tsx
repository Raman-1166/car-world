import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Bloom, DepthOfField, EffectComposer, N8AO, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { Dust, GroundFog, ReflectFloor, StudioEnv, StudioSlits } from "./three/Studio";
import { Magnetic } from "./ui/Magnetic";
import { MaskLine } from "./ui/Reveal";
import { CARS } from "../data/cars";
import { clamp, damp, lerp, pointer, range, smooth, smoother, useIsMobile } from "../lib/utils";
import { scrollToTarget } from "../lib/scroll";
import { sound } from "../lib/sound";

/* ------------------------------------------------------------------ */
/* Camera film path                                                    */
/* ------------------------------------------------------------------ */
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const STOPS = [0, 0.22, 0.42, 0.62, 0.82, 1];
const CAM = [V(5.1, 1.25, 5.7), V(0.4, 1.1, 7.0), V(-5.8, 1.5, 3.9), V(2.4, 0.5, 3.2), V(4.6, 0.75, 1.9), V(7.6, 0.8, 0.6)];
const TGT = [V(0, 0.55, 0), V(0, 0.6, 0), V(-0.2, 0.6, 0), V(1.4, 0.4, 0.8), V(2.0, 0.5, 0.45), V(0, 0.65, 0)];
const FOV = [30, 30, 30, 27, 25, 30];
const INTRO_POS = V(3.1, 0.58, 1.05);
const INTRO_TGT = V(1.9, 0.5, 0.42);

function remap(p: number) {
  const n = STOPS.length;
  if (p <= 0) return { u: 0, i: 0, t: 0 };
  if (p >= 1) return { u: 1, i: n - 2, t: 1 };
  let i = 0;
  while (p > STOPS[i + 1]) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const hold = 0.045;
  const t = smoother((p - (a + hold)) / (b - a - hold * 2));
  return { u: (i + t) / (n - 1), i, t };
}

const bump = (p: number, c: number, w: number) => smooth(1 - Math.abs(p - c) / w);

/* ------------------------------------------------------------------ */
/* 3D world                                                            */
/* ------------------------------------------------------------------ */
function HeroWorld({
  progress,
  intro,
  quality,
  onReady,
}: {
  progress: MotionValue<number>;
  intro: MotionValue<number>;
  quality: "high" | "low";
  onReady: () => void;
}) {
  const { camera, scene, size } = useThree();
  const car = useRef<THREE.Group>(null);
  const lights = useRef(0);
  const key = useRef<THREE.SpotLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const red = useRef<THREE.PointLight>(null);
  const cool = useRef<THREE.PointLight>(null);
  const dof = useRef<DepthOfFieldEffect>(null);
  const frames = useRef(0);
  const ready = useRef(false);

  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(CAM, false, "centripetal"),
      tgt: new THREE.CatmullRomCurve3(TGT, false, "centripetal"),
    }),
    [],
  );
  const tmp = useMemo(
    () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), a: new THREE.Vector3(), focus: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(), ptr: { x: 0, y: 0 } }),
    [],
  );
  const hi = quality === "high";
  const spec = CARS[0];

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05);
    const p = progress.get();
    const it = intro.get();
    const { u, i, t } = remap(p);
    curves.pos.getPoint(u, tmp.p);
    curves.tgt.getPoint(u, tmp.t);

    // cinematic intro: start tight on the headlight, pull back
    tmp.p.lerpVectors(INTRO_POS, tmp.p, it);
    tmp.t.lerpVectors(INTRO_TGT, tmp.t, it);

    // portrait screens: pull camera back so the car fits
    const asp = size.width / size.height;
    const k = clamp(1.3 / asp, 1, 1.85);
    tmp.p.sub(tmp.t).multiplyScalar(lerp(1, k, smooth(it))).add(tmp.t);

    // pointer parallax (smooth, restrained)
    tmp.ptr.x = damp(tmp.ptr.x, pointer.x, 2.2, dt);
    tmp.ptr.y = damp(tmp.ptr.y, pointer.y, 2.2, dt);

    camera.position.copy(tmp.p);
    camera.lookAt(tmp.t);
    camera.updateMatrix();
    tmp.right.setFromMatrixColumn(camera.matrix, 0);
    tmp.up.setFromMatrixColumn(camera.matrix, 1);

    // composition: car sits right-of-centre for the headline (desktop) / lower (portrait)
    const heroAmt = (1 - smooth(range(p, 0.02, 0.16))) * smooth(it);
    if (asp > 1.15) tmp.t.addScaledVector(tmp.right, -1.25 * heroAmt);
    else tmp.t.addScaledVector(tmp.up, 0.95 * heroAmt);

    camera.position.addScaledVector(tmp.right, tmp.ptr.x * 0.38).addScaledVector(tmp.up, tmp.ptr.y * 0.2);
    camera.lookAt(tmp.t);

    const fov = lerp(FOV[i], FOV[i + 1], t);
    const fovI = lerp(22, fov, it);
    if (Math.abs((camera as THREE.PerspectiveCamera).fov - fovI) > 0.01) {
      (camera as THREE.PerspectiveCamera).fov = fovI;
      camera.updateProjectionMatrix();
    }

    // car: very slight response to the pointer
    if (car.current) {
      car.current.rotation.y = damp(car.current.rotation.y, tmp.ptr.x * 0.07, 2.5, dt);
    }

    // lighting choreography
    const act = smooth(range(it, 0.0, 0.7));
    const headOn = smooth(range(it, 0.4, 0.64));
    lights.current = headOn * (1 + 0.8 * bump(p, 0.82, 0.1));
    scene.environmentIntensity = lerp(0.03, 1, act) * (1 + 0.15 * bump(p, 0.42, 0.14));
    const redMood = 0.25 + 0.75 * bump(p, 0.42, 0.16);
    const coolMood = smooth(range(p, 0.5, 0.9));
    if (key.current) key.current.intensity = act * 110;
    if (rim.current) {
      rim.current.intensity = act * lerp(50, 80, coolMood);
      rim.current.color.setRGB(lerp(1, 0.72, coolMood), lerp(1, 0.82, coolMood), 1);
      rim.current.position.x = lerp(-7, -3, bump(p, 0.42, 0.2));
    }
    if (red.current) red.current.intensity = smooth(range(it, 0.5, 0.9)) * 20 * redMood;
    if (cool.current) cool.current.intensity = act * 14 * coolMood;

    if (dof.current) {
      tmp.focus.copy(tmp.t);
      if (dof.current.target !== tmp.focus) dof.current.target = tmp.focus;
    }

    if (!ready.current && ++frames.current > 24) {
      ready.current = true;
      onReady();
    }
  });

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 16, 42]} />
      <StudioEnv />
      <ambientLight intensity={0.02} />
      <spotLight ref={key} position={[0, 8, 0.5]} angle={0.55} penumbra={1} decay={1.4} color="#ffffff" intensity={0} />
      <spotLight ref={rim} position={[-7, 3, -5]} angle={0.5} penumbra={1} decay={1.4} intensity={0} />
      <pointLight ref={red} position={[-3.2, 0.7, -3.4]} color="#c1121f" decay={1.6} intensity={0} />
      <pointLight ref={cool} position={[6, 2, 5]} color="#9db8ff" decay={1.6} intensity={0} />

      <group ref={car}>
        <CarModel spec={spec} lights={lights} quality={quality} signature="#e8f1ff" />
      </group>

      <ReflectFloor quality={quality} y={-0.002} />
      <ContactShadows position={[0, 0.004, 0]} opacity={0.9} scale={12} blur={2.2} far={1.8} resolution={512} color="#000" />
      <GroundFog count={hi ? 6 : 3} />
      <Dust count={hi ? 80 : 30} />
      <StudioSlits />

      {hi ? (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={0.55} intensity={2.2} distanceFalloff={1} quality="medium" halfRes />
          <DepthOfField ref={dof} focusDistance={8} focusRange={2.6} bokehScale={2.4} resolutionScale={0.5} />
          <Bloom intensity={0.38} luminanceThreshold={0.92} luminanceSmoothing={0.2} mipmapBlur radius={0.7} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
          <Vignette eskil={false} offset={0.28} darkness={0.7} />
          <Noise opacity={0.035} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.3} luminanceThreshold={0.92} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette eskil={false} offset={0.25} darkness={0.7} />
        </EffectComposer>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stage copy                                                          */
/* ------------------------------------------------------------------ */
interface Stage {
  at: number;
  side: "left" | "right";
  no: string;
  kicker: string;
  lines: string[];
  body: string;
  stats?: [string, string][];
}

const STAGES: Stage[] = [
  { at: 0.22, side: "left", no: "01", kicker: "Form", lines: ["Sculpted", "by air."], body: "Every surface negotiated with the wind tunnel. Not a single line without a purpose." },
  { at: 0.42, side: "right", no: "02", kicker: "Atmosphere", lines: ["Lit by", "the night."], body: "Studio light follows the shoulder line. The car never looks the same twice." },
  {
    at: 0.62,
    side: "left",
    no: "03",
    kicker: "Performance",
    lines: ["410 mm", "of stopping."],
    body: "Carbon-ceramic discs and six-piston calipers. 850 horsepower you can actually use.",
    stats: [
      ["850", "HP"],
      ["2.4", "SEC 0—100"],
    ],
  },
  { at: 0.82, side: "right", no: "04", kicker: "Technology", lines: ["1,024 points", "of light."], body: "Matrix LED. Every segment steered individually — a beam that bends around the dark." },
];

function StageText({ stage, progress }: { stage: Stage; progress: MotionValue<number> }) {
  const a = stage.at;
  const opacity = useTransform(progress, [a - 0.1, a - 0.045, a + 0.045, a + 0.1], [0, 1, 1, 0]);
  const y = useTransform(progress, [a - 0.1, a + 0.1], [50, -50]);
  const blur = useTransform(progress, [a - 0.1, a - 0.05, a + 0.05, a + 0.1], ["blur(14px)", "blur(0px)", "blur(0px)", "blur(14px)"]);
  const right = stage.side === "right";
  return (
    <motion.div
      style={{ opacity, y, filter: blur }}
      className={`pointer-events-none absolute z-20 max-sm:bottom-[14vh] max-sm:left-6 max-sm:right-6 sm:top-1/2 sm:-mt-[18vh] ${right ? "sm:right-[6vw] sm:text-right" : "sm:left-[6vw]"}`}
    >
      <div className={`label mb-5 flex items-center gap-4 text-white/60 ${right ? "sm:justify-end" : ""}`}>
        <span className="mono-num text-racing">{stage.no}</span>
        <span className="h-px w-10 bg-white/25" />
        <span>{stage.kicker}</span>
      </div>
      <h2 className="display text-[clamp(2.8rem,7.4vw,7.6rem)] leading-[0.86]">
        {stage.lines.map((l, i) => (
          <span key={l} className={`block ${i === 1 ? "outline" : ""}`}>
            {l}
          </span>
        ))}
      </h2>
      <p className={`mt-6 max-w-[21rem] text-[0.82rem] font-light leading-relaxed text-white/55 ${right ? "sm:ml-auto" : ""}`}>{stage.body}</p>
      {stage.stats && (
        <div className={`mt-7 flex gap-10 ${right ? "sm:justify-end" : ""}`}>
          {stage.stats.map(([n, u]) => (
            <div key={u}>
              <div className="mono-num text-5xl leading-none">{n}</div>
              <div className="label mt-2 text-white/45">{u}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
export function HeroScene({ started, onReady }: { started: boolean; onReady: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const mobile = useIsMobile();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.35 });
  const intro = useMotionValue(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!started) return;
    const c = animate(intro, 1, { duration: 6, ease: [0.42, 0.0, 0.14, 1] });
    const t = setTimeout(() => setShow(true), 2700);
    const w = setTimeout(() => sound.whoosh(), 300);
    return () => {
      c.stop();
      clearTimeout(t);
      clearTimeout(w);
    };
  }, [started, intro]);

  const headOpacity = useTransform(progress, [0, 0.06, 0.125], [1, 1, 0]);
  const headY = useTransform(progress, [0, 0.125], [0, -70]);
  const headBlur = useTransform(progress, [0.04, 0.125], ["blur(0px)", "blur(14px)"]);
  const headEvents = useTransform(progress, (v) => (v > 0.08 ? "none" : "auto"));
  const hintOpacity = useTransform(progress, [0, 0.04], [1, 0]);
  const railFill = useTransform(progress, [0.14, 0.9], [0, 1]);
  const railOpacity = useTransform(progress, [0.1, 0.16, 0.9, 0.97], [0, 1, 1, 0]);
  const barH = useMotionValue(14);
  useEffect(() => {
    if (started) animate(barH, 0, { duration: 3.4, delay: 0.6, ease: [0.76, 0, 0.24, 1] });
  }, [started, barH]);
  const barHeight = useTransform(barH, (v) => `${v}vh`);

  return (
    <section ref={ref} id="top" className="relative h-[650vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
        <LazyCanvas eager className="absolute inset-0" camera={{ position: [3.1, 0.58, 1.05], fov: 22, near: 0.1, far: 60 }}>
          <HeroWorld progress={progress} intro={intro} quality={mobile ? "low" : "high"} onReady={onReady} />
        </LazyCanvas>

        {/* cinematic letterbox */}
        <motion.div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-black" style={{ height: barHeight }} />
        <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-black" style={{ height: barHeight }} />

        {/* frame marks */}
        <div className="pointer-events-none absolute inset-[3.2vw] z-10 hidden sm:block">
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-b border-l", "right-0 bottom-0 border-b border-r"].map((c) => (
            <span key={c} className={`absolute h-3 w-3 border-white/25 ${c}`} />
          ))}
        </div>

        {/* headline */}
        <motion.div
          className="absolute inset-x-0 bottom-0 z-20 px-6 pb-[15vh] sm:px-[6vw] sm:pb-[14vh] max-sm:bottom-auto max-sm:top-[17vh]"
          style={{ opacity: headOpacity, y: headY, filter: headBlur, pointerEvents: headEvents }}
        >
          <h1 className="display text-[clamp(3.3rem,10.4vw,11.2rem)] leading-[0.84]">
            <MaskLine inView={false} show={show} delay={0}>
              THE FUTURE
            </MaskLine>
            <MaskLine inView={false} show={show} delay={0.14}>
              HAS A <span className="outline">SHAPE.</span>
            </MaskLine>
          </h1>
          <div className="mt-7 flex flex-col gap-8 sm:mt-9 sm:flex-row sm:items-center sm:gap-14">
            <MaskLine inView={false} show={show} delay={0.5} duration={1}>
              <p className="label text-white/60">Where engineering meets emotion.</p>
            </MaskLine>
            <motion.div
              className="flex flex-col min-[481px]:flex-row items-stretch gap-3 w-full min-[481px]:w-auto"
              initial={{ opacity: 0, y: 18 }}
              animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{ duration: 1, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              <Magnetic className="w-full min-[481px]:w-auto">
                <button className="btn btn-red w-full min-[481px]:w-auto justify-center" onClick={() => scrollToTarget("#collection", 0, 2.4)} data-cursor="btn">
                  Explore collection
                </button>
              </Magnetic>
              <Magnetic className="w-full min-[481px]:w-auto">
                <button className="btn btn-ghost w-full min-[481px]:w-auto justify-center" onClick={() => scrollToTarget("#configurator", 0, 2.6)} data-cursor="btn">
                  Build your car
                </button>
              </Magnetic>
            </motion.div>
          </div>
        </motion.div>

        {/* scroll hint */}
        <motion.div
          className="pointer-events-none absolute bottom-6 right-6 z-20 sm:bottom-9 sm:right-[6vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: show ? 1 : 0 }}
          transition={{ duration: 1.2, delay: 1 }}
        >
          <motion.div style={{ opacity: hintOpacity }} className="flex items-center gap-3">
            <span className="label text-white/55">Scroll to explore</span>
            <span className="inline-block text-white/70" style={{ animation: "bob 2.2s ease-in-out infinite" }}>
              ↓
            </span>
          </motion.div>
        </motion.div>

        {/* readout */}
        <motion.div style={{ opacity: hintOpacity }} className="pointer-events-none absolute right-[6vw] top-[16vh] z-10 hidden text-right sm:block">
          <div className="label text-white/35">Model 001</div>
          <div className="display mt-2 text-3xl text-white/80">Apex</div>
          <div className="label mt-1 text-white/35">V8 Hybrid · 850 HP</div>
        </motion.div>

        {STAGES.map((s) => (
          <StageText key={s.no} stage={s} progress={progress} />
        ))}

        {/* progress rail */}
        <motion.div style={{ opacity: railOpacity }} className="pointer-events-none absolute right-5 top-1/2 z-20 hidden h-[34vh] -translate-y-1/2 sm:right-[2.2vw] sm:block">
          <div className="relative h-full w-px bg-white/15">
            <motion.div className="absolute inset-x-0 top-0 h-full origin-top bg-racing" style={{ scaleY: railFill }} />
          </div>
          {STAGES.map((s, i) => (
            <span key={s.no} className="label absolute -left-6 -translate-y-1/2 text-[0.55rem] text-white/40" style={{ top: `${(i / (STAGES.length - 1)) * 100}%` }}>
              {s.no}
            </span>
          ))}
        </motion.div>

        {/* bottom fade into next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-ink to-transparent" />
      </div>
    </section>
  );
}
