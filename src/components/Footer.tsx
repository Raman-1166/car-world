import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MaskLine } from "./ui/Reveal";
import { go } from "./Navbar";
import { scrollToTarget } from "../lib/scroll";
import { sound } from "../lib/sound";

const Icon = ({ d, label, href = "#" }: { d: string; label: string; href?: string }) => (
  <a href={href} aria-label={label} onClick={(e) => e.preventDefault()} className="group flex h-11 w-11 items-center justify-center border border-white/15 transition-colors duration-500 hover:border-white/60">
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-none stroke-current text-white/60 transition-colors group-hover:text-bone" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  </a>
);

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const dot = useTransform(scrollYProgress, [0.2, 1], ["0%", "100%"]);
  const bigX = useTransform(scrollYProgress, [0, 1], ["-4%", "2%"]);

  return (
    <footer id="contact" ref={ref} className="relative overflow-hidden bg-ink px-6 pb-8 pt-[22vh] sm:px-[3.2vw]">
      <motion.div style={{ x: bigX }} className="display text-[clamp(4.4rem,19.5vw,25rem)] leading-[0.8] tracking-[-0.02em]">
        <MaskLine>KEEP</MaskLine>
        <MaskLine delay={0.12}>
          <span className="outline">MOVING</span>
          <span className="text-racing">.</span>
        </MaskLine>
      </motion.div>

      {/* road */}
      <div className="relative mt-16 h-px w-full bg-white/12 sm:mt-24">
        <motion.span className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-racing shadow-[0_0_14px_rgba(193,18,31,0.9)]" style={{ left: dot }} />
        <div className="absolute inset-y-0 left-0 w-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.35)_0_14px,transparent_14px_44px)] opacity-30" />
      </div>

      <div className="mt-14 grid gap-14 sm:mt-20 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="display text-5xl leading-[0.84]">
            CAR
            <br />
            <span className="text-white/50">WORLD</span>
          </div>
          <p className="mt-6 max-w-xs text-[0.82rem] font-light leading-relaxed text-white/45">Hand-built in limited numbers. Engineered without compromise. Delivered to the places the road forgot.</p>
        </div>

        <nav className="flex flex-col gap-4 lg:col-span-4">
          <span className="label mb-2 text-white/30">Navigate</span>
          {[
            ["Collection", () => go("collection")],
            ["Configurator", () => go("configurator")],
            ["Technology", () => go("technology")],
          ].map(([l, fn]) => (
            <button
              key={l as string}
              onClick={() => {
                sound.tick(true);
                (fn as () => void)();
              }}
              className="label link-line w-fit text-white/80 hover:text-bone"
            >
              {l as string}
            </button>
          ))}
          <a href="mailto:concierge@carworld.example" className="label link-line w-fit text-white/80 hover:text-bone">
            Contact
          </a>
        </nav>

        <div className="lg:col-span-3 lg:justify-self-end">
          <span className="label mb-5 block text-white/30">Follow</span>
          <div className="flex gap-3">
            <Icon label="Instagram" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5v.01" />
            <Icon label="YouTube" d="M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm7 1.5v5l4.5-2.5z" />
            <Icon label="X" d="M4 4l16 16M20 4L4 20" />
            <Icon label="LinkedIn" d="M4 9v11M4 4.5v.01M9 20v-7a3 3 0 0 1 6 0v7M9 9v11" />
          </div>
        </div>
      </div>

      <div className="label mt-20 flex flex-col justify-between gap-4 border-t border-white/10 pt-6 text-[0.58rem] text-white/30 sm:flex-row">
        <span>© 2026 Car World. A concept experience.</span>
        <button onClick={() => scrollToTarget(0, 0, 3)} className="link-line w-fit hover:text-bone">
          Back to top ↑
        </button>
      </div>
    </footer>
  );
}
