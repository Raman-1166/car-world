import { AnimatePresence, motion } from "framer-motion";
import { sound, useSound } from "../../lib/sound";

function Bars({ active }: { active: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0.6, 1, 0.45, 0.8].map((d, i) => (
        <span
          key={i}
          className="w-[2px] origin-bottom bg-current"
          style={{
            height: "100%",
            transform: active ? undefined : "scaleY(0.25)",
            animation: active ? `eq ${0.7 + d * 0.6}s ease-in-out ${i * 0.1}s infinite` : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function SoundControl({ visible }: { visible: boolean }) {
  const { enabled, muted } = useSound();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-5 left-5 z-[60] flex items-center gap-4 text-bone sm:bottom-7 sm:left-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {!enabled ? (
            <button
              onClick={() => sound.enable()}
              className="label group flex items-center gap-3 border border-white/15 bg-black/30 px-4 py-3 backdrop-blur-md transition-colors duration-500 hover:border-white/50"
              aria-label="Enable sound experience"
            >
              <Bars active={false} />
              <span className="hidden sm:inline">Sound experience</span>
              <span className="sm:hidden">Sound</span>
            </button>
          ) : (
            <div className="label flex items-center gap-4 border border-white/15 bg-black/30 px-4 py-3 backdrop-blur-md">
              <Bars active={!muted} />
              <span className="text-white/60">{muted ? "Muted" : "Sound on"}</span>
              <button
                onClick={() => {
                  sound.toggleMute();
                }}
                className="link-line text-bone"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
