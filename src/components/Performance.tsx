import { useEffect, useRef } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import { CarSilhouette } from "./ui/CarSilhouette";
import { EASE_OUT, MaskLine } from "./ui/Reveal";

function Counter({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const c = animate(0, to, {
      duration: 2.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = v.toFixed(decimals);
      },
    });
    return () => c.stop();
  }, [inView, to, decimals]);
  return <span ref={ref}>{(0).toFixed(decimals)}</span>;
}

interface Stat {
  to: number;
  dec?: number;
  label: string;
  unit?: string;
  level: number;
  span: string;
  offset: string;
}

const STATS: Stat[] = [
  { to: 850, label: "Horsepower", unit: "HP", level: 0.85, span: "lg:col-span-7", offset: "" },
  { to: 340, label: "Top speed", unit: "KM/H", level: 0.85, span: "lg:col-span-5", offset: "lg:mt-[14vh]" },
  { to: 2.4, dec: 1, label: "0—100 km/h", unit: "SEC", level: 0.92, span: "lg:col-span-5", offset: "" },
  { to: 950, label: "Torque", unit: "NM", level: 0.79, span: "lg:col-span-7", offset: "lg:mt-[10vh]" },
];

function Blueprint() {
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
      <g stroke="rgba(236,235,231,0.05)" strokeWidth="1">
        {Array.from({ length: 17 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="900" />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 100} x2="1600" y2={i * 100} />
        ))}
      </g>
      <g stroke="rgba(236,235,231,0.1)">
        <circle cx="1180" cy="450" r="330" />
        <circle cx="1180" cy="450" r="250" strokeDasharray="2 8" />
        <circle cx="1180" cy="450" r="120" />
        <line x1="760" y1="450" x2="1600" y2="450" />
        <line x1="1180" y1="60" x2="1180" y2="840" />
      </g>
      <CarSilhouette x={330} y={230} width={1100} height={316} stroke="rgba(236,235,231,0.17)" strokeWidth={0.8} />
      {/* dimension lines */}
      <g stroke="rgba(236,235,231,0.2)" fill="rgba(236,235,231,0.3)" fontSize="11" fontFamily="Inter, sans-serif" letterSpacing="3">
        <line x1="371" y1="610" x2="1394" y2="610" />
        <line x1="371" y1="600" x2="371" y2="620" />
        <line x1="1394" y1="600" x2="1394" y2="620" />
        <text x="830" y="634" stroke="none">
          4,512 MM
        </text>
        <line x1="310" y1="293" x2="310" y2="538" />
        <line x1="300" y1="293" x2="320" y2="293" />
        <line x1="300" y1="538" x2="320" y2="538" />
        <text x="270" y="430" stroke="none" transform="rotate(-90 270 430)">
          1,168 MM
        </text>
        <text x="1060" y="130" stroke="none">
          CD 0.27
        </text>
      </g>
    </svg>
  );
}

function PowerCurve() {
  return (
    <svg viewBox="0 0 420 140" className="w-full max-w-[26rem]" fill="none" aria-hidden>
      <g stroke="rgba(236,235,231,0.1)">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="0" y1={10 + i * 30} x2="420" y2={10 + i * 30} />
        ))}
      </g>
      <motion.path
        d="M0 125 C 60 110, 90 60, 150 40 S 270 14, 330 24 S 400 60, 420 78"
        stroke="#ecebe7"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2.4, ease: EASE_OUT }}
      />
      <motion.path
        d="M0 100 C 70 30, 110 24, 170 26 S 290 40, 350 80 S 400 112, 420 118"
        stroke="#c1121f"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 2.4, delay: 0.3, ease: EASE_OUT }}
      />
    </svg>
  );
}

export function Performance() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const bgX = useTransform(scrollYProgress, [0, 1], ["2%", "-3%"]);

  return (
    <section id="performance" ref={ref} className="relative overflow-hidden bg-ink px-6 py-[22vh] sm:px-[6vw]">
      <motion.div style={{ y: bgY, x: bgX }} className="pointer-events-none absolute -inset-[8%] opacity-90">
        <Blueprint />
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      <div className="relative">
        <div className="label mb-10 flex items-center gap-4 text-white/50">
          <span className="mono-num text-racing">04</span>
          <span className="h-px w-12 bg-white/25" />
          <span>Performance</span>
        </div>
        <h2 className="display display-lg">
          <MaskLine>NUMBERS</MaskLine>
          <MaskLine delay={0.12}>
            <span className="outline">THAT MOVE.</span>
          </MaskLine>
        </h2>

        <div className="mt-[14vh] grid grid-cols-1 gap-x-16 gap-y-20 lg:grid-cols-12">
          {STATS.map((s, i) => (
            <div key={s.label} className={`${s.span} ${s.offset}`}>
              <div className="mb-5 flex items-center justify-between border-t border-white/15 pt-4">
                <span className="label text-white/50">{s.label}</span>
                <span className="mono-num text-xs text-white/30">0{i + 1}</span>
              </div>
              <div className="flex items-end gap-4">
                <div className="mono-num text-[clamp(6.5rem,20vw,21rem)] leading-[0.8] tracking-[-0.03em]">
                  <Counter to={s.to} decimals={s.dec} />
                </div>
                <div className="label pb-[0.6em] text-racing">{s.unit}</div>
              </div>
              <div className="mt-8 h-px w-full max-w-md bg-white/12">
                <motion.div
                  className="h-full origin-left bg-racing"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: s.level }}
                  viewport={{ once: true }}
                  transition={{ duration: 2.2, delay: 0.2, ease: EASE_OUT }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-[16vh] flex flex-col items-start justify-between gap-10 border-t border-white/12 pt-8 lg:flex-row lg:items-end">
          <div className="w-full max-w-md">
            <PowerCurve />
            <div className="label mt-3 flex gap-8 text-[0.58rem] text-white/45">
              <span className="flex items-center gap-2">
                <span className="h-px w-5 bg-bone" /> Power
              </span>
              <span className="flex items-center gap-2">
                <span className="h-px w-5 bg-racing" /> Torque
              </span>
              <span className="ml-auto">0 — 9,000 RPM</span>
            </div>
          </div>
          <p className="max-w-xs text-sm font-light leading-relaxed text-white/50">
            Hybrid-assisted torque fill removes the lag. 950 Nm arrives at 2,500 rpm and stays until the redline.
          </p>
        </div>
      </div>
    </section>
  );
}
