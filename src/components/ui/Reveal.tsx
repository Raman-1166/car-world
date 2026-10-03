import type { ReactNode } from "react";
import { motion } from "framer-motion";

export const EASE = [0.76, 0, 0.24, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Masked line reveal — text rises out of a clipped baseline. */
export function MaskLine({
  children,
  delay = 0,
  className = "",
  duration = 1.1,
  inView = true,
  show = true,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  duration?: number;
  inView?: boolean;
  show?: boolean;
}) {
  const common = {
    initial: { y: "112%", rotate: 2.5 },
    transition: { duration, delay, ease: EASE_OUT },
  };
  return (
    <span className={`block overflow-hidden pb-[0.06em] -mb-[0.06em] ${className}`}>
      {inView ? (
        <motion.span className="block origin-left" {...common} whileInView={{ y: 0, rotate: 0 }} viewport={{ once: true, margin: "-8% 0px" }}>
          {children}
        </motion.span>
      ) : (
        <motion.span className="block origin-left" {...common} animate={show ? { y: 0, rotate: 0 } : { y: "112%", rotate: 2.5 }}>
          {children}
        </motion.span>
      )}
    </span>
  );
}

export function FadeUp({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
