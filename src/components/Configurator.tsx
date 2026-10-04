import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";
import { LazyCanvas } from "./ui/LazyCanvas";
import { CarModel } from "./three/CarModel";
import { Dust, GroundFog, ReflectFloor, StudioEnv, StudioSlits } from "./three/Studio";
import { Magnetic } from "./ui/Magnetic";
import { EASE_OUT, MaskLine } from "./ui/Reveal";
import { useDragRotate } from "../hooks/useDragRotate";
import {
  BODY_COLORS,
  BRAKE_COLORS,
  CARS,
  INTERIORS,
  SIGNATURES,
  TRIMS,
  WHEEL_COLORS,
  WHEEL_DESIGNS,
  defaultBuild,
  fmtPrice,
  getCar,
  type Build,
} from "../data/cars";
import { clamp, damp, useIsMobile } from "../lib/utils";
import { sound } from "../lib/sound";

type Tab = "body" | "wheels" | "brakes" | "interior" | "details";
const TABS: { id: Tab; label: string }[] = [
  { id: "body", label: "Body" },
  { id: "wheels", label: "Wheels" },
  { id: "brakes", label: "Brakes" },
  { id: "interior", label: "Interior" },
  { id: "details", label: "Details" },
];

const PRESETS: Record<Tab, { az: number; el: number; r: number; t: [number, number, number] }> = {
  body: { az: 0.78, el: 0.2, r: 8.4, t: [0, 0.55, 0] },
  wheels: { az: 1.22, el: 0.1, r: 3.7, t: [1.38, 0.4, 0.86] },
  brakes: { az: 1.36, el: 0.08, r: 2.6, t: [1.38, 0.42, 0.9] },
  interior: { az: 1.5, el: 0.82, r: 4.6, t: [-0.1, 0.9, 0.1] },
  details: { az: 0.5, el: 0.14, r: 3.3, t: [1.9, 0.5, 0.45] },
};

const find = <T extends { id: string }>(arr: T[], id: string) => arr.find((a) => a.id === id) ?? arr[0];

function priceOf(b: Build) {
  const car = getCar(b.carId);
  const custom =
    find(BODY_COLORS, b.body).price +
    (WHEEL_DESIGNS.find((w) => w.id === b.wheelDesign)?.price ?? 0) +
    find(WHEEL_COLORS, b.wheelColor).price +
    find(BRAKE_COLORS, b.brake).price +
    find(INTERIORS, b.interior).price +
    (TRIMS.find((t) => t.id === b.trim)?.price ?? 0) +
    find(SIGNATURES, b.signature).price;
  return { base: car.price, custom, total: car.price + custom };
}

/* ------------------------------------------------------------------ */
function ConfigWorld({ build, tab, drag, quality }: { build: Build; tab: Tab; drag: ReturnType<typeof useDragRotate>; quality: "high" | "low" }) {
  const { camera, size } = useThree();
  const spec = getCar(build.carId);
  const cam = useRef({ az: 0.78, el: 0.2, r: 8.4, t: new THREE.Vector3(0, 0.55, 0) });
  const auto = useRef(0);
  const applied = useRef(0);
  const reset = useRef(0);
  const clock = useRef(0);
  const tg = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    reset.current = clock.current + 1.4;
  }, [tab]);

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05);
    clock.current += dt;
    const P = PRESETS[tab];
    const asp = size.width / size.height;
    const k = tab === "body" ? clamp(1.55 / asp, 1, 2.2) : clamp(1.2 / asp, 1, 1.7);
    const st = drag.update(dt, true);
    if (!st.dragging && clock.current < reset.current) {
      st.yaw = damp(st.yaw, 0, 3.2, dt);
      st.vyaw = 0;
    }
    if (tab === "body" && !st.dragging) auto.current += dt * 0.04;
    applied.current = damp(applied.current, tab === "body" ? auto.current : 0, 3, dt);

    const c = cam.current;
    c.az = damp(c.az, P.az, 2.6, dt);
    c.el = damp(c.el, P.el, 2.6, dt);
    c.r = damp(c.r, P.r * k, 2.6, dt);
    tg.set(P.t[0], P.t[1], P.t[2]);
    c.t.lerp(tg, 1 - Math.exp(-dt * 2.6));

    const az = c.az + st.yaw + applied.current;
    const el = clamp(c.el + st.pitch * 1.4, 0.03, 1.2);
    camera.position.set(c.t.x + Math.cos(el) * Math.cos(az) * c.r, c.t.y + Math.sin(el) * c.r, c.t.z + Math.cos(el) * Math.sin(az) * c.r);
    camera.lookAt(c.t);
  });

  const body = find(BODY_COLORS, build.body).value;
  const rim = find(WHEEL_COLORS, build.wheelColor).value;
  const brake = find(BRAKE_COLORS, build.brake).value;
  const interior = find(INTERIORS, build.interior).value;
  const sig = find(SIGNATURES, build.signature).value;

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 14, 38]} />
      <StudioEnv />
      <ambientLight intensity={0.04} />
      <spotLight position={[0, 8, 1]} angle={0.55} penumbra={1} decay={1.4} intensity={120} />
      <spotLight position={[-7, 3, -4]} angle={0.5} penumbra={1} decay={1.4} intensity={60} />
      <spotLight position={[6, 2.5, 5]} angle={0.6} penumbra={1} decay={1.4} intensity={26} color="#cfdcff" />
      <pointLight position={[-3, 0.6, -3.4]} color="#c1121f" intensity={9} decay={1.6} />

      <CarModel
        key={spec.id}
        spec={spec}
        body={body}
        rim={rim}
        caliper={brake}
        interior={interior}
        trim={build.trim}
        wheelDesign={build.wheelDesign}
        signature={sig}
        quality={quality}
        glassOpacity={tab === "interior" ? 0.16 : 0.58}
      />
      <ReflectFloor quality={quality} y={-0.002} />
      <ContactShadows position={[0, 0.004, 0]} opacity={0.9} scale={12} blur={2.2} far={1.8} resolution={512} />
      <GroundFog count={4} opacity={0.06} />
      <Dust count={quality === "high" ? 50 : 18} opacity={0.25} />
      <StudioSlits />
    </>
  );
}

/* ------------------------------------------------------------------ */
function Swatch({ color, active, label, onClick }: { color: string; active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="group relative h-9 w-9">
      <span className="absolute inset-0 border border-white/15" style={{ background: color }} />
      <span className={`absolute -inset-[5px] border transition-all duration-500 ${active ? "border-white/80 opacity-100" : "scale-90 border-white/40 opacity-0 group-hover:scale-100 group-hover:opacity-100"}`} />
      {active && <span className="absolute -bottom-3 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-racing" />}
    </button>
  );
}

function Money({ v }: { v: number }) {
  return <span>{v === 0 ? "Included" : `+ ${fmtPrice(v)}`}</span>;
}

function Total({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 90, damping: 22 });
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  const text = useTransform(spring, (v) => fmtPrice(Math.round(v / 10) * 10));
  return <motion.span>{text}</motion.span>;
}

/* ------------------------------------------------------------------ */
export function Configurator({ build, setBuild }: { build: Build; setBuild: (b: Build) => void }) {
  const mobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("body");
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<"none" | "request" | "sent">("none");
  const dragRef = useRef<HTMLDivElement>(null);
  const drag = useDragRotate(dragRef);
  const spec = getCar(build.carId);
  const pr = priceOf(build);

  const set = (patch: Partial<Build>) => {
    sound.tick();
    setBuild({ ...build, ...patch });
  };

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 3200);
  };

  const save = () => {
    sound.tick();
    const id = "CW-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    try {
      localStorage.setItem("carworld-build", JSON.stringify({ id, build, total: pr.total }));
    } catch {
      /* ignore */
    }
    flash(`Build saved · ${id}`);
  };

  const summary: [string, string][] = [
    ["Body", find(BODY_COLORS, build.body).name],
    ["Wheels", `${WHEEL_DESIGNS.find((w) => w.id === build.wheelDesign)?.name} · ${find(WHEEL_COLORS, build.wheelColor).name}`],
    ["Brakes", find(BRAKE_COLORS, build.brake).name],
    ["Interior", find(INTERIORS, build.interior).name],
    ["Trim", TRIMS.find((t) => t.id === build.trim)?.name ?? ""],
  ];

  const optionsFor = () => {
    switch (tab) {
      case "body":
        return (
          <Group title="Paint" selected={find(BODY_COLORS, build.body)}>
            {BODY_COLORS.map((o) => (
              <Swatch key={o.id} color={o.value} label={o.name} active={build.body === o.id} onClick={() => set({ body: o.id })} />
            ))}
          </Group>
        );
      case "wheels":
        return (
          <>
            <div className="mb-8">
              <div className="label mb-4 text-white/40">Design</div>
              <div className="grid grid-cols-2 gap-px bg-white/10">
                {WHEEL_DESIGNS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => set({ wheelDesign: w.id })}
                    className={`bg-ink px-4 py-4 text-left transition-colors duration-500 ${build.wheelDesign === w.id ? "text-bone" : "text-white/45 hover:text-bone"}`}
                  >
                    <div className="display text-2xl">{w.name}</div>
                    <div className="label mt-1 text-[0.55rem] text-white/40">
                      <Money v={w.price} />
                    </div>
                    <span className={`mt-3 block h-px bg-racing transition-all duration-700 ${build.wheelDesign === w.id ? "w-full" : "w-0"}`} />
                  </button>
                ))}
              </div>
            </div>
            <Group title="Finish" selected={find(WHEEL_COLORS, build.wheelColor)}>
              {WHEEL_COLORS.map((o) => (
                <Swatch key={o.id} color={o.value} label={o.name} active={build.wheelColor === o.id} onClick={() => set({ wheelColor: o.id })} />
              ))}
            </Group>
          </>
        );
      case "brakes":
        return (
          <Group title="Caliper" selected={find(BRAKE_COLORS, build.brake)}>
            {BRAKE_COLORS.map((o) => (
              <Swatch key={o.id} color={o.value} label={o.name} active={build.brake === o.id} onClick={() => set({ brake: o.id })} />
            ))}
          </Group>
        );
      case "interior":
        return (
          <Group title="Upholstery" selected={find(INTERIORS, build.interior)}>
            {INTERIORS.map((o) => (
              <Swatch key={o.id} color={o.value} label={o.name} active={build.interior === o.id} onClick={() => set({ interior: o.id })} />
            ))}
          </Group>
        );
      case "details": {
        const t = TRIMS.find((x) => x.id === build.trim)!;
        return (
          <>
            <div className="mb-8">
              <Group title="Trim" selected={{ name: t.name, price: t.price }}>
                {TRIMS.map((o) => (
                  <Swatch key={o.id} color={o.swatch} label={o.name} active={build.trim === o.id} onClick={() => set({ trim: o.id })} />
                ))}
              </Group>
            </div>
            <Group title="Light signature" selected={find(SIGNATURES, build.signature)}>
              {SIGNATURES.map((o) => (
                <Swatch key={o.id} color={o.value} label={o.name} active={build.signature === o.id} onClick={() => set({ signature: o.id })} />
              ))}
            </Group>
          </>
        );
      }
    }
  };

  return (
    <section id="configurator" className="relative bg-ink">
      {/*
        Mobile:  flex-col stack — left panel | canvas | right panel
        Desktop: 3-col grid [22rem | 1fr | 22rem], min-h-screen
        Canvas fills its grid cell via absolute; panels are normal flow.
      */}
      <div className="flex flex-col lg:grid lg:grid-cols-[22rem_1fr_22rem] lg:min-h-screen">

        {/* ══ LEFT PANEL ══════════════════════════════════════════ */}
        <div className="flex flex-col px-7 pt-12 pb-10 sm:px-10 lg:px-10 lg:pt-16 lg:pb-12 border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10 overflow-y-auto">

          {/* section label */}
          <div className="label mb-8 flex items-center gap-4 text-white/40">
            <span className="mono-num text-racing">03</span>
            <span className="h-px w-10 bg-white/20" />
            <span>Configurator</span>
          </div>

          {/* heading */}
          <h2 className="display text-[clamp(2.6rem,3.6vw,4.8rem)] leading-[0.86] mb-8">
            <MaskLine>BUILD YOUR</MaskLine>
            <MaskLine delay={0.1}>
              <span className="outline">MACHINE</span>
            </MaskLine>
          </h2>

          {/* car selector */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 pb-8 mb-8 border-b border-white/10">
            {CARS.map((c) => (
              <button
                key={c.id}
                onClick={() => { sound.tick(); setBuild(defaultBuild(c.id)); }}
                data-active={c.id === build.carId}
                className={`label link-line pb-1 transition-colors duration-300 ${c.id === build.carId ? "text-bone" : "text-white/35 hover:text-white/75"}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* section tabs */}
          <nav aria-label="Configurator sections" className="no-scrollbar -mx-7 flex gap-2 overflow-x-auto px-7 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => { sound.tick(true); setTab(t.id); }}
                className={`group relative flex shrink-0 items-center gap-4 py-2 lg:py-[0.45rem] text-left transition-colors duration-500 lg:w-full ${tab === t.id ? "text-bone" : "text-white/30 hover:text-white/65"}`}
              >
                <span className="mono-num w-5 shrink-0 text-[0.65rem] text-white/35">{String(i + 1).padStart(2, "0")}</span>
                <span className="display text-[1.5rem] lg:text-[1.85rem] leading-none">{t.label}</span>
                <span className={`hidden h-px bg-racing transition-all duration-700 lg:block ${tab === t.id ? "w-8 opacity-100" : "w-0 opacity-0"}`} />
              </button>
            ))}
          </nav>

          {/* options area */}
          <div className="mt-auto pt-8 border-t border-white/10">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              >
                {optionsFor()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ══ CANVAS ═════════════════════════════════════════════ */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:h-auto lg:self-stretch">
          <div ref={dragRef} data-cursor="drag" className="absolute inset-0">
            <LazyCanvas className="absolute inset-0" camera={{ position: [5, 2, 6], fov: 30, near: 0.1, far: 70 }}>
              <ConfigWorld build={build} tab={tab} drag={drag} quality={mobile ? "low" : "high"} />
            </LazyCanvas>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink to-transparent" />
            <div className="label pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 tracking-widest text-white/30 text-[0.6rem]">
              DRAG TO ORBIT
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ════════════════════════════════════════ */}
        <div className="flex flex-col px-7 pt-10 pb-10 sm:px-10 lg:px-10 lg:pt-16 lg:pb-12 border-t border-white/10 lg:border-t-0 lg:border-l lg:border-white/10 overflow-y-auto">

          {/* your build header */}
          <div className="label mb-6 flex items-center justify-between">
            <span className="text-white/45">Your build</span>
            <span className="text-white/25">{spec.name}</span>
          </div>

          {/* summary rows */}
          <dl className="border-t border-white/10">
            {summary.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 border-b border-white/[0.07] py-[0.6rem]">
                <dt className="label text-[0.58rem] uppercase tracking-wider text-white/30 shrink-0">{k}</dt>
                <dd className="text-right text-[0.8rem] font-light leading-snug text-white/75 min-w-0">{v}</dd>
              </div>
            ))}
          </dl>

          {/* price block */}
          <div className="mt-6 pt-0">
            <div className="flex flex-col gap-[0.6rem] border-t border-white/10 pt-6">
              <div className="flex items-baseline justify-between gap-4">
                <span className="label text-[0.6rem] uppercase tracking-wider text-white/35">Base</span>
                <span className="mono-num text-base text-white/70">{fmtPrice(pr.base)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="label text-[0.6rem] uppercase tracking-wider text-white/35">Customization</span>
                <span className="mono-num text-base text-white/70">{pr.custom ? "+ " + fmtPrice(pr.custom) : "—"}</span>
              </div>
            </div>

            {/* total */}
            <div className="flex items-end justify-between gap-4 mt-5 pt-5 border-t border-white/12">
              <span className="label text-[0.6rem] uppercase tracking-wider text-white/35 pb-1">Total</span>
              <span className="mono-num text-[2.6rem] leading-none tracking-tight">
                <Total value={pr.total} />
              </span>
            </div>

            {/* action buttons */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Magnetic>
                <button className="btn btn-red w-full sm:w-auto" onClick={save}>
                  Save build
                </button>
              </Magnetic>
              <Magnetic>
                <button
                  className="btn btn-ghost w-full sm:w-auto"
                  onClick={() => { sound.tick(); setModal("request"); }}
                >
                  Request experience
                </button>
              </Magnetic>
            </div>
          </div>
        </div>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="label fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 border border-white/15 bg-black/70 px-6 py-4 backdrop-blur-xl"
          >
            <span className="mr-3 inline-block h-[5px] w-[5px] rounded-full bg-racing align-middle" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* request experience */}
      <AnimatePresence>
        {modal !== "none" && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-6 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal("none")}
          >
            <motion.div
              className="carbon relative w-full max-w-lg border border-white/10 p-8 sm:p-12"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: 0.8, ease: EASE_OUT } }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="label absolute right-6 top-6 text-white/40 hover:text-bone" onClick={() => setModal("none")}>
                Close ✕
              </button>
              {modal === "request" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sound.tick();
                    setModal("sent");
                  }}
                >
                  <div className="label mb-5 text-racing">Private experience</div>
                  <h3 className="display text-5xl leading-[0.9]">
                    Meet the <span className="outline">{spec.name}</span>
                  </h3>
                  <p className="mt-5 text-sm font-light leading-relaxed text-white/55">A concierge will arrange a private viewing of your configuration, anywhere in the world.</p>
                  <input
                    required
                    type="email"
                    placeholder="YOUR EMAIL"
                    className="label mt-8 w-full border-b border-white/25 bg-transparent py-4 text-bone outline-none transition-colors focus:border-white"
                  />
                  <button className="btn btn-red mt-8" type="submit">
                    Send request
                  </button>
                </form>
              ) : (
                <div>
                  <div className="label mb-5 text-racing">Received</div>
                  <h3 className="display text-5xl leading-[0.9]">
                    We'll be <span className="outline">in touch.</span>
                  </h3>
                  <p className="mt-5 text-sm font-light leading-relaxed text-white/55">Your {spec.name} build — {fmtPrice(pr.total)} — has been sent to our concierge team.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Group({ title, selected, children }: { title: string; selected: { name: string; price: number }; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-4 text-white/40">{title}</div>
      <div className="flex flex-wrap gap-4">{children}</div>
      <div className="mt-7 flex items-baseline justify-between">
        <span className="display text-2xl">{selected.name}</span>
        <span className="label text-[0.58rem] text-white/45">
          <Money v={selected.price} />
        </span>
      </div>
    </div>
  );
}
