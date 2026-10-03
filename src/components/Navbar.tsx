import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Magnetic } from "./ui/Magnetic";
import { EASE, EASE_OUT } from "./ui/Reveal";
import { CARS } from "../data/cars";
import { scrollToTarget } from "../lib/scroll";
import { sound } from "../lib/sound";

const LINKS = [
  { id: "collection", label: "Collection" },
  { id: "configurator", label: "Configurator" },
  { id: "performance", label: "Performance" },
  { id: "technology", label: "Technology" },
];

export function go(id: string) {
  scrollToTarget("#" + id, 0, 2.6);
}

export function Navbar({ visible, onSearch, onMenu }: { visible: boolean; onSearch: () => void; onMenu: () => void }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 60);
    let cur = "";
    for (const l of LINKS) {
      const el = document.getElementById(l.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.45 && r.bottom > window.innerHeight * 0.45) cur = l.id;
    }
    setActive((a) => (a === cur ? a : cur));
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-[80]"
      initial={{ y: "-100%", opacity: 0 }}
      animate={visible ? { y: 0, opacity: 1 } : { y: "-100%", opacity: 0 }}
      transition={{ duration: 1.3, ease: EASE_OUT, delay: visible ? 1.2 : 0 }}
    >
      <div
        className={`flex items-center justify-between px-6 transition-all duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] sm:px-[3.2vw] ${
          scrolled ? "border-b border-white/[0.07] bg-black/45 py-3 backdrop-blur-2xl" : "border-b border-transparent bg-transparent py-6 backdrop-blur-0"
        }`}
      >
        {/* logo */}
        <button onClick={() => scrollToTarget(0, 0, 2.4)} className="display flex flex-col text-left text-[1.15rem] leading-[0.82] tracking-[0.04em]" aria-label="Car World — top">
          <span>CAR</span>
          <span className="text-white/55">WORLD</span>
        </button>

        {/* links */}
        <nav className={`hidden items-center transition-all duration-700 lg:flex ${scrolled ? "gap-9" : "gap-12"}`}>
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                sound.tick(true);
                go(l.id);
              }}
              data-active={active === l.id}
              className={`label link-line transition-colors duration-500 ${active === l.id ? "text-bone" : "text-white/60 hover:text-bone"}`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* actions */}
        <div className="flex items-center gap-7">
          <button onClick={onSearch} className="label link-line hidden text-white/70 hover:text-bone sm:block">
            Search
          </button>
          <Magnetic strength={0.35}>
            <button onClick={onMenu} className="label group flex items-center gap-3 text-bone" aria-label="Open menu">
              Menu
              <span className="flex flex-col gap-[5px]">
                <span className="block h-px w-6 bg-current transition-all duration-500 group-hover:w-4" />
                <span className="block h-px w-4 bg-current transition-all duration-500 group-hover:w-6" />
              </span>
            </button>
          </Magnetic>
        </div>
      </div>
    </motion.header>
  );
}

/* ------------------------------------------------------------------ */
const MENU_ITEMS = [
  { id: "collection", label: "Collection" },
  { id: "configurator", label: "Configurator" },
  { id: "performance", label: "Performance" },
  { id: "technology", label: "Technology" },
  { id: "electric", label: "Electric" },
  { id: "aerodynamics", label: "Aerodynamics" },
];

export function MenuOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="carbon fixed inset-0 z-[150] flex flex-col justify-between px-6 py-7 sm:px-[3.2vw]"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)", transition: { duration: 1, ease: EASE } }}
          exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 0.8, ease: EASE } }}
        >
          <div className="flex items-center justify-between">
            <span className="label text-white/40">Navigation</span>
            <button onClick={onClose} className="label link-line">
              Close ✕
            </button>
          </div>
          <nav className="flex flex-col">
            {MENU_ITEMS.map((m, i) => (
              <div key={m.id} className="overflow-hidden border-b border-white/10">
                <motion.button
                  initial={{ y: "100%" }}
                  animate={{ y: 0, transition: { duration: 0.9, delay: 0.25 + i * 0.06, ease: EASE_OUT } }}
                  exit={{ y: "100%", transition: { duration: 0.4 } }}
                  onClick={() => {
                    sound.tick();
                    onClose();
                    window.setTimeout(() => go(m.id), 700);
                  }}
                  className="group flex w-full items-baseline gap-6 py-2 text-left sm:py-3"
                >
                  <span className="mono-num w-8 text-sm text-white/35 transition-colors group-hover:text-racing">0{i + 1}</span>
                  <span className="display text-[clamp(2.6rem,8vw,7rem)] transition-transform duration-700 [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:translate-x-6">{m.label}</span>
                </motion.button>
              </div>
            ))}
          </nav>
          <div className="label flex justify-between text-white/35">
            <span>Car World © 2026</span>
            <span>The future has a shape.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SearchOverlay({ open, onClose, onOpenCar }: { open: boolean; onClose: () => void; onOpenCar: (id: string) => void }) {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) return;
    setQ("");
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  const res = CARS.filter((c) => (c.name + c.category + c.powertrain).toLowerCase().includes(q.toLowerCase()));
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] bg-black/85 px-6 py-7 backdrop-blur-2xl sm:px-[6vw]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.6 } }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <div className="flex justify-end">
            <button onClick={onClose} className="label link-line">
              Close ✕
            </button>
          </div>
          <div className="mx-auto mt-[12vh] max-w-4xl">
            <div className="label mb-5 text-white/40">Search the collection</div>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="APEX, ELECTRIC, V8…"
              className="display w-full border-b border-white/25 bg-transparent pb-4 text-[clamp(2.6rem,8vw,6.5rem)] text-bone outline-none focus:border-white"
            />
            <div className="mt-10">
              {res.length === 0 && <div className="label text-white/35">No vehicles found</div>}
              {res.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.6, ease: EASE_OUT } }}
                  onClick={() => {
                    onClose();
                    window.setTimeout(() => onOpenCar(c.id), 500);
                  }}
                  className="group flex w-full items-center justify-between border-b border-white/10 py-4 text-left"
                >
                  <span className="flex items-baseline gap-6">
                    <span className="mono-num text-sm text-white/35">{c.index}</span>
                    <span className="display text-4xl transition-transform duration-500 group-hover:translate-x-3 sm:text-5xl">{c.name}</span>
                  </span>
                  <span className="label hidden text-white/40 sm:block">{c.category}</span>
                  <span className="mono-num text-white/70">{c.hp} HP</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
