import * as THREE from "three";

/** Smooth 1D Hermite spline through ascending [x, y] knots. */
export function spline(pts: [number, number][]) {
  const n = pts.length;
  const m = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    return (b[1] - a[1]) / (b[0] - a[0] || 1);
  });
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1];
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (x > pts[i + 1][0]) i++;
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = x1 - x0;
    const t = (x - x0) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * y0 +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * y1 +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

export interface CarShapeParams {
  cabinH: number; // roof height multiplier
  nose: number; // nose length multiplier
}

export const L = 4.5;
export const BODY_N = 2.6;
export const CABIN_N = 2.3;

const sgnPow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

export function makeProfiles(sp: CarShapeParams) {
  const top = spline([
    [-2.25, 0.8],
    [-2.0, 0.89],
    [-1.5, 0.92],
    [-0.8, 0.86],
    [0.2, 0.82],
    [0.9, 0.77],
    [1.5, 0.62],
    [2.0, 0.5],
    [2.25, 0.4],
  ]);
  const bot = spline([
    [-2.25, 0.3],
    [-1.9, 0.18],
    [-1.2, 0.12],
    [1.2, 0.12],
    [2.0, 0.14],
    [2.25, 0.22],
  ]);
  const hw = spline([
    [-2.25, 0.84],
    [-1.8, 0.95],
    [-1.0, 0.98],
    [0.0, 0.98],
    [1.0, 0.96],
    [1.5, 0.92],
    [2.0, 0.8],
    [2.25, 0.62],
  ]);
  const rN = 0.7 * sp.nose;
  const rR = 0.42;
  const cap = (x: number) => {
    let s = 1;
    const df = L / 2 - x;
    const dr = x + L / 2;
    if (df < rN) s *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - df / rN, 2)));
    if (dr < rR) s *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - dr / rR, 2)));
    return Math.max(s, 0.012);
  };

  const cabTop = spline([
    [-1.6, 0.84],
    [-1.2, 0.97],
    [-0.6, 1.08],
    [0.0, 1.12],
    [0.5, 1.07],
    [1.0, 0.86],
  ]);
  const cabTopS = (x: number) => 0.84 + (cabTop(x) - 0.84) * sp.cabinH;
  const cabHw = spline([
    [-1.6, 0.5],
    [-1.0, 0.64],
    [0.0, 0.68],
    [0.6, 0.64],
    [1.0, 0.56],
  ]);
  const cabCap = (x: number, x0: number, x1: number, r: number) => {
    const a = x - x0;
    const b = x1 - x;
    let s = 1;
    if (a < r) s *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - a / r, 2)));
    if (b < r) s *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - b / r, 2)));
    return Math.max(s, 0.012);
  };
  return { top, bot, hw, cap, cabTop: cabTopS, cabHw, cabCap };
}

export type Profiles = ReturnType<typeof makeProfiles>;

interface LoftOpts {
  x0: number;
  x1: number;
  nx: number;
  ns: number;
  n: number;
  at: (x: number) => { hw: number; top: number; bot: number; hs: number };
}

function loft({ x0, x1, nx, ns, n, at }: LoftOpts) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const t = i / nx;
    const x = x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    const s = at(x);
    const cy = (s.top + s.bot) / 2;
    const hh = Math.max(((s.top - s.bot) / 2) * s.hs, 0.004);
    for (let j = 0; j < ns; j++) {
      const a = (j / ns) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      pos.push(x, cy + hh * sgnPow(sa, 2 / n), s.hw * sgnPow(ca, 2 / n));
    }
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ns; j++) {
      const a = i * ns + j;
      const b = i * ns + ((j + 1) % ns);
      const c = (i + 1) * ns + j;
      const d = (i + 1) * ns + ((j + 1) % ns);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildBody(p: Profiles, ns = 64, nx = 110) {
  return loft({
    x0: -L / 2,
    x1: L / 2,
    nx,
    ns,
    n: BODY_N,
    at: (x) => {
      const c = p.cap(x);
      return { hw: p.hw(x) * c, top: p.top(x), bot: p.bot(x), hs: Math.pow(c, 0.7) };
    },
  });
}

export function buildCabin(p: Profiles, ns = 40, nx = 60) {
  const x0 = -1.6;
  const x1 = 1.0;
  return loft({
    x0,
    x1,
    nx,
    ns,
    n: CABIN_N,
    at: (x) => {
      const c = p.cabCap(x, x0, x1, 0.55);
      return { hw: p.cabHw(x) * c, top: p.cabTop(x), bot: 0.66, hs: Math.pow(c, 0.8) };
    },
  });
}

export function buildRoof(p: Profiles, ns = 28, nx = 40) {
  const x0 = -1.3;
  const x1 = 0.45;
  return loft({
    x0,
    x1,
    nx,
    ns,
    n: 2.4,
    at: (x) => {
      const c = p.cabCap(x, x0, x1, 0.4);
      const t = p.cabTop(x) + 0.008;
      return { hw: p.cabHw(x) * 0.66 * c, top: t, bot: t - 0.16, hs: 1 };
    },
  });
}

/** Half-width of the body envelope at a given (x, y) — used to flush-mount details. */
export function halfWidthAt(p: Profiles, x: number, y: number) {
  const c = p.cap(x);
  const hwx = p.hw(x) * c;
  const top = p.top(x);
  const bot = p.bot(x);
  const cy = (top + bot) / 2;
  const hh = Math.max(((top - bot) / 2) * Math.pow(c, 0.7), 0.004);
  const r = Math.abs(y - cy) / hh;
  if (r >= 1) return 0;
  return hwx * Math.pow(1 - Math.pow(r, BODY_N), 1 / BODY_N);
}

/** Find x on the front (dir=1) or rear (dir=-1) where the body is `z` wide at height `y`. */
export function surfaceX(p: Profiles, z: number, y: number, dir: 1 | -1) {
  if (dir === 1) {
    for (let x = L / 2; x > -L / 2; x -= 0.004) if (halfWidthAt(p, x, y) >= z) return x;
  } else {
    for (let x = -L / 2; x < L / 2; x += 0.004) if (halfWidthAt(p, x, y) >= z) return x;
  }
  return 0;
}

/** A tube hugging the nose (dir=1) or tail (dir=-1) surface at height y — taillight bar, intake slot. */
export function buildTaillight(p: Profiles, y: number, span = 0.66, dir: 1 | -1 = -1, radius = 0.017) {
  const pts: THREE.Vector3[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const z = -span + (2 * span * i) / steps;
    const x = surfaceX(p, Math.abs(z) + 0.01, y, dir) + 0.004 * dir;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 40, radius, 6, false);
}

export function buildSplitter() {
  const s = new THREE.Shape();
  const pts: [number, number][] = [
    [1.55, -0.8],
    [2.05, -0.88],
    [2.28, -0.62],
    [2.34, -0.3],
    [2.34, 0.3],
    [2.28, 0.62],
    [2.05, 0.88],
    [1.55, 0.8],
  ];
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

export function buildTire(R: number, w: number) {
  const pts: THREE.Vector2[] = [];
  const h = w / 2;
  const prof: [number, number][] = [
    [R * 0.6, -h],
    [R * 0.78, -h * 1.02],
    [R * 0.93, -h * 0.86],
    [R * 0.99, -h * 0.5],
    [R, -h * 0.2],
    [R, h * 0.2],
    [R * 0.99, h * 0.5],
    [R * 0.93, h * 0.86],
    [R * 0.78, h * 1.02],
    [R * 0.6, h],
  ];
  prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const g = new THREE.LatheGeometry(pts, 56);
  g.rotateX(Math.PI / 2);
  return g;
}
