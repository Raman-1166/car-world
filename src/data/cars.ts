export type WheelDesign = "star" | "turbine" | "aero" | "split";
export type WingType = "none" | "duck" | "gt" | "tall";
export type TrimType = "carbon" | "satin" | "black" | "bronze";

export interface CarSpec {
  id: string;
  index: string;
  name: string;
  category: string;
  tagline: string;
  personality: string;
  hp: number;
  nm: number;
  sec: number;
  kmh: number;
  price: number;
  weight: string;
  drive: string;
  powertrain: string;
  color: string;
  rim: string;
  caliper: string;
  wheelDesign: WheelDesign;
  wing: WingType;
  lift: number;
  wheelR: number;
  cabinH: number;
  nose: number;
  roughness: number;
  clearcoat: number;
  metalness: number;
  ev?: boolean;
}

export const CARS: CarSpec[] = [
  {
    id: "apex",
    index: "01",
    name: "APEX",
    category: "Performance",
    tagline: "Pure velocity, distilled.",
    personality: "A track weapon with road manners. Carbon monocoque, 1,380 kg.",
    hp: 850,
    nm: 950,
    sec: 2.4,
    kmh: 340,
    price: 389000,
    weight: "1,380 KG",
    drive: "RWD",
    powertrain: "4.0 TWIN-TURBO V8 HYBRID",
    color: "#aeb1b7",
    rim: "#23252a",
    caliper: "#c1121f",
    wheelDesign: "star",
    wing: "gt",
    lift: 0,
    wheelR: 0.36,
    cabinH: 1,
    nose: 1,
    roughness: 0.26,
    clearcoat: 1,
    metalness: 0.85,
  },
  {
    id: "volt",
    index: "02",
    name: "VOLT",
    category: "Electric",
    tagline: "Silence, with consequences.",
    personality: "Tri-motor electric grand tourer. 780 km range, 18-minute charge.",
    hp: 1020,
    nm: 1280,
    sec: 2.6,
    kmh: 310,
    price: 274000,
    weight: "1,940 KG",
    drive: "AWD",
    powertrain: "TRI-MOTOR · 112 KWH",
    color: "#e6e7e9",
    rim: "#d3d5d9",
    caliper: "#8a8d93",
    wheelDesign: "aero",
    wing: "duck",
    lift: 0.02,
    wheelR: 0.37,
    cabinH: 1.04,
    nose: 1.25,
    roughness: 0.22,
    clearcoat: 1,
    metalness: 0.7,
    ev: true,
  },
  {
    id: "gtx",
    index: "03",
    name: "GT-X",
    category: "Grand Touring",
    tagline: "Continents, crossed in an evening.",
    personality: "Long-wheelbase fastback. Handbuilt interior, 720 km of effortless range.",
    hp: 710,
    nm: 820,
    sec: 3.1,
    kmh: 322,
    price: 312000,
    weight: "1,690 KG",
    drive: "AWD",
    powertrain: "5.2 V10 · 8-SPEED DCT",
    color: "#6f0e16",
    rim: "#c6c8cc",
    caliper: "#16171a",
    wheelDesign: "turbine",
    wing: "duck",
    lift: 0.01,
    wheelR: 0.37,
    cabinH: 1.1,
    nose: 1.15,
    roughness: 0.24,
    clearcoat: 1,
    metalness: 0.8,
  },
  {
    id: "noir",
    index: "04",
    name: "NOIR",
    category: "Limited Series",
    tagline: "Built for after dark.",
    personality: "Forty-nine examples. Gloss black, bronze details, no apologies.",
    hp: 920,
    nm: 1010,
    sec: 2.3,
    kmh: 352,
    price: 640000,
    weight: "1,320 KG",
    drive: "RWD",
    powertrain: "4.0 TWIN-TURBO V8 · TRACK",
    color: "#0b0b0c",
    rim: "#8a6a3b",
    caliper: "#8a6a3b",
    wheelDesign: "split",
    wing: "tall",
    lift: -0.01,
    wheelR: 0.37,
    cabinH: 0.94,
    nose: 0.9,
    roughness: 0.14,
    clearcoat: 1,
    metalness: 0.9,
  },
  {
    id: "terra",
    index: "05",
    name: "TERRA",
    category: "All-Terrain",
    tagline: "Where the road ends, we begin.",
    personality: "Adaptive air suspension, +140 mm lift. The only supercar with a horizon.",
    hp: 640,
    nm: 780,
    sec: 3.4,
    kmh: 290,
    price: 238000,
    weight: "1,820 KG",
    drive: "AWD",
    powertrain: "3.0 V6 HYBRID · ALL-TERRAIN",
    color: "#a39a84",
    rim: "#1a1b1e",
    caliper: "#c1121f",
    wheelDesign: "star",
    wing: "none",
    lift: 0.15,
    wheelR: 0.43,
    cabinH: 1.2,
    nose: 0.85,
    roughness: 0.62,
    clearcoat: 0.15,
    metalness: 0.4,
  },
];

export const getCar = (id: string) => CARS.find((c) => c.id === id) ?? CARS[0];

export const fmtPrice = (n: number) => "€ " + n.toLocaleString("en-US");

/* -------- Configurator options -------- */
export interface Opt {
  id: string;
  name: string;
  value: string;
  price: number;
}

export const BODY_COLORS: Opt[] = [
  { id: "silver", name: "Liquid Silver", value: "#aeb1b7", price: 0 },
  { id: "pearl", name: "Pearl White", value: "#e6e7e9", price: 2500 },
  { id: "noir", name: "Gloss Noir", value: "#0b0b0c", price: 3500 },
  { id: "titanium", name: "Titanium", value: "#565a61", price: 5500 },
  { id: "red", name: "Deep Racing Red", value: "#6f0e16", price: 6000 },
  { id: "blue", name: "Midnight Blue", value: "#0f1a30", price: 4500 },
  { id: "dune", name: "Dune", value: "#a39a84", price: 8000 },
];

export const WHEEL_DESIGNS: { id: WheelDesign; name: string; price: number }[] = [
  { id: "star", name: "Star", price: 0 },
  { id: "turbine", name: "Turbine", price: 3200 },
  { id: "aero", name: "Aero", price: 4800 },
  { id: "split", name: "Split", price: 3900 },
];

export const WHEEL_COLORS: Opt[] = [
  { id: "graphite", name: "Graphite", value: "#23252a", price: 0 },
  { id: "silver", name: "Silver", value: "#c6c8cc", price: 800 },
  { id: "black", name: "Satin Black", value: "#0c0c0d", price: 800 },
  { id: "bronze", name: "Bronze", value: "#8a6a3b", price: 1800 },
];

export const BRAKE_COLORS: Opt[] = [
  { id: "red", name: "Racing Red", value: "#c1121f", price: 0 },
  { id: "silver", name: "Silver", value: "#b5b8bd", price: 600 },
  { id: "gold", name: "Gold", value: "#c9a24b", price: 900 },
  { id: "black", name: "Carbon Black", value: "#17181a", price: 600 },
];

export const INTERIORS: Opt[] = [
  { id: "black", name: "Black Alcantara", value: "#141414", price: 0 },
  { id: "tan", name: "Tan Leather", value: "#8b5e3c", price: 3000 },
  { id: "ivory", name: "Ivory Nappa", value: "#d8d2c4", price: 3000 },
  { id: "crimson", name: "Crimson", value: "#6d0f1a", price: 3500 },
];

export const TRIMS: { id: TrimType; name: string; price: number; swatch: string }[] = [
  { id: "carbon", name: "Gloss Carbon", price: 0, swatch: "#101010" },
  { id: "satin", name: "Satin Silver", price: 2000, swatch: "#a9acb1" },
  { id: "black", name: "Matte Black", price: 1200, swatch: "#1b1b1c" },
  { id: "bronze", name: "Bronze", price: 2800, swatch: "#8a6a3b" },
];

export const SIGNATURES: Opt[] = [
  { id: "ice", name: "Ice White", value: "#e8f1ff", price: 0 },
  { id: "warm", name: "Warm White", value: "#ffe2b0", price: 0 },
  { id: "red", name: "Signal Red", value: "#ff3b3b", price: 1500 },
];

export interface Build {
  carId: string;
  body: string;
  wheelDesign: WheelDesign;
  wheelColor: string;
  brake: string;
  interior: string;
  trim: TrimType;
  signature: string;
}

export const defaultBuild = (carId: string): Build => {
  const c = getCar(carId);
  const body = BODY_COLORS.find((b) => b.value === c.color)?.id ?? "silver";
  const wc = WHEEL_COLORS.find((w) => w.value === c.rim)?.id ?? "graphite";
  const br = BRAKE_COLORS.find((b) => b.value === c.caliper)?.id ?? "red";
  return {
    carId,
    body,
    wheelDesign: c.wheelDesign,
    wheelColor: wc,
    brake: br,
    interior: "black",
    trim: "carbon",
    signature: "ice",
  };
};
