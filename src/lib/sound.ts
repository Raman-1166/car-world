import { useSyncExternalStore } from "react";

/**
 * Tiny WebAudio engine: low engine ambience + air bed, reactive to scroll velocity.
 * Never autoplays — only starts after an explicit user gesture.
 */
interface State {
  enabled: boolean;
  muted: boolean;
}

let state: State = { enabled: false, muted: false };
const subs = new Set<() => void>();
const emit = () => {
  state = { ...state };
  subs.forEach((s) => s());
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let osc1: OscillatorNode | null = null;
let osc2: OscillatorNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let engineGain: GainNode | null = null;
let raf = 0;
let lastY = 0;
let vel = 0;
let smoothVel = 0;

function noiseBuffer(c: AudioContext) {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02; // brown-ish noise
    d[i] = last * 3.5;
  }
  return buf;
}

function loop() {
  if (!ctx || !osc1 || !osc2 || !engineFilter || !engineGain) return;
  smoothVel += (vel - smoothVel) * 0.06;
  vel *= 0.92;
  const v = Math.min(1, smoothVel / 60);
  const t = ctx.currentTime;
  osc1.frequency.setTargetAtTime(38 + v * 70, t, 0.08);
  osc2.frequency.setTargetAtTime(57 + v * 105, t, 0.08);
  engineFilter.frequency.setTargetAtTime(170 + v * 700, t, 0.1);
  engineGain.gain.setTargetAtTime(0.05 + v * 0.1, t, 0.1);
  raf = requestAnimationFrame(loop);
}

function onScroll() {
  const y = window.scrollY;
  vel = Math.max(vel, Math.abs(y - lastY));
  lastY = y;
}

export const sound = {
  async enable() {
    if (state.enabled) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    await ctx.resume();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 180;
    engineFilter.Q.value = 4;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.05;
    osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = 38;
    osc2 = ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = 57;
    osc2.detune.value = 7;
    osc1.connect(engineFilter);
    osc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);

    // idle wobble
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.35;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(engineFilter.frequency);

    // air / room bed
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 520;
    bp.Q.value = 0.6;
    const ng = ctx.createGain();
    ng.gain.value = 0.16;
    src.connect(bp);
    bp.connect(ng);
    ng.connect(master);

    osc1.start();
    osc2.start();
    lfo.start();
    src.start();
    master.gain.setTargetAtTime(0.85, ctx.currentTime, 0.6);
    lastY = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    state.enabled = true;
    state.muted = false;
    emit();
    sound.tick(true);
  },
  toggleMute() {
    if (!ctx || !master) return;
    state.muted = !state.muted;
    master.gain.setTargetAtTime(state.muted ? 0 : 0.85, ctx.currentTime, 0.15);
    emit();
  },
  tick(soft = false) {
    if (!ctx || !master || state.muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(soft ? 880 : 1400, t);
    o.frequency.exponentialRampToValueAtTime(soft ? 440 : 520, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(soft ? 0.07 : 0.09, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.14);
  },
  whoosh() {
    if (!ctx || !master || state.muted) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.5);
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + 0.9);
  },
  stop() {
    cancelAnimationFrame(raf);
  },
};

export function useSound() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state,
  );
}
