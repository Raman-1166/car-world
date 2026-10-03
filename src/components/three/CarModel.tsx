import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { CarSpec, TrimType, WheelDesign } from "../../data/cars";
import {
  buildBody,
  buildCabin,
  buildRoof,
  buildSplitter,
  buildTaillight,
  buildTire,
  halfWidthAt,
  makeProfiles,
  surfaceX,
} from "../../lib/carGeometry";
import { lerp } from "../../lib/utils";

export interface CarModelProps {
  spec: CarSpec;
  body?: string;
  rim?: string;
  caliper?: string;
  interior?: string;
  trim?: TrimType;
  wheelDesign?: WheelDesign;
  signature?: string;
  lights?: { current: number };
  explode?: { current: number };
  wingAngle?: number;
  spin?: number;
  glassOpacity?: number;
  quality?: "high" | "low";
  beams?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const WB_F = 1.4;
const WB_R = -1.38;
const TRACK = 0.87;
const TIRE_W = 0.29;

const TRIM_SET: Record<TrimType, { color: string; metalness: number; roughness: number }> = {
  carbon: { color: "#0c0c0d", metalness: 0.55, roughness: 0.32 },
  satin: { color: "#a9acb1", metalness: 0.95, roughness: 0.36 },
  black: { color: "#141415", metalness: 0.2, roughness: 0.7 },
  bronze: { color: "#8a6a3b", metalness: 1, roughness: 0.3 },
};

/* ------------------------------------------------------------------ */
/* Wheel                                                               */
/* ------------------------------------------------------------------ */
function spokeGeo(R: number, wi: number, wo: number, swirl: number, depth = 0.04) {
  const s = new THREE.Shape();
  s.moveTo(R * 0.08, -wi / 2);
  s.lineTo(R * 0.62, -wo / 2 + swirl);
  s.lineTo(R * 0.62, wo / 2 + swirl);
  s.lineTo(R * 0.08, wi / 2);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.006,
    bevelSegments: 1,
  });
}

interface WheelProps {
  R: number;
  design: WheelDesign;
  side: 1 | -1;
  position: [number, number, number];
  tire: THREE.BufferGeometry;
  rimMat: THREE.Material;
  caliperMat: THREE.Material;
  tireMat: THREE.Material;
  darkMat: THREE.Material;
  discMat: THREE.Material;
  spin: number;
  offsetRef: { x: number; z: number; y: number };
  hi: boolean;
}

function Wheel({ R, design, side, position, tire, rimMat, caliperMat, tireMat, darkMat, discMat, spin, offsetRef, hi }: WheelProps) {
  const root = useRef<THREE.Group>(null);
  const spinG = useRef<THREE.Group>(null);

  const spokes = useMemo(() => {
    const items: { geo: THREE.BufferGeometry; rot: number }[] = [];
    if (design === "star") {
      const g = spokeGeo(R, R * 0.2, R * 0.36, 0);
      for (let i = 0; i < 5; i++) items.push({ geo: g, rot: (i / 5) * Math.PI * 2 });
    } else if (design === "turbine") {
      const g = spokeGeo(R, R * 0.055, R * 0.09, R * 0.2, 0.03);
      for (let i = 0; i < 15; i++) items.push({ geo: g, rot: (i / 15) * Math.PI * 2 });
    } else if (design === "split") {
      const g = spokeGeo(R, R * 0.09, R * 0.15, 0, 0.035);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        items.push({ geo: g, rot: a - 0.13 }, { geo: g, rot: a + 0.13 });
      }
    }
    return items;
  }, [design, R]);

  useFrame((_, dt) => {
    if (spinG.current && spin) spinG.current.rotation.z -= spin * dt * side;
    if (root.current) {
      root.current.position.x = position[0] + offsetRef.x;
      root.current.position.y = position[1] + offsetRef.y;
      root.current.position.z = position[2] + side * offsetRef.z;
    }
  });

  const caliperAngle = 0.62;
  const seg = hi ? 40 : 24;

  return (
    <group ref={root} position={position} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      {/* brake assembly (does not spin) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.03]} material={discMat}>
        <cylinderGeometry args={[R * 0.52, R * 0.52, 0.035, seg]} />
      </mesh>
      <mesh
        position={[Math.cos(caliperAngle) * R * 0.43, Math.sin(caliperAngle) * R * 0.43, 0.07]}
        rotation={[0, 0, caliperAngle + Math.PI / 2]}
        material={caliperMat}
      >
        <boxGeometry args={[R * 0.56, R * 0.2, 0.085]} />
      </mesh>
      <mesh position={[0, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
        <cylinderGeometry args={[R * 0.6, R * 0.6, 0.02, seg]} />
      </mesh>

      <group ref={spinG}>
        <mesh geometry={tire} material={tireMat} />
        {/* barrel */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={rimMat}>
          <cylinderGeometry args={[R * 0.61, R * 0.61, TIRE_W * 0.82, seg, 1, true]} />
        </mesh>
        <mesh position={[0, 0, TIRE_W * 0.4]} material={rimMat}>
          <torusGeometry args={[R * 0.6, R * 0.03, 8, seg]} />
        </mesh>
        {spokes.map((s, i) => (
          <mesh key={i} geometry={s.geo} material={rimMat} rotation={[0, 0, s.rot]} position={[0, 0, 0.07]} />
        ))}
        {design === "aero" && (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.09]} material={rimMat}>
              <cylinderGeometry args={[R * 0.6, R * 0.58, 0.03, seg]} />
            </mesh>
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * R * 0.44, Math.sin(a) * R * 0.44, 0.108]}
                  rotation={[0, 0, a]}
                  material={darkMat}
                >
                  <boxGeometry args={[R * 0.17, R * 0.045, 0.012]} />
                </mesh>
              );
            })}
          </>
        )}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.115]} material={darkMat}>
          <cylinderGeometry args={[R * 0.1, R * 0.1, 0.03, 20]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Headlight beams                                                     */
/* ------------------------------------------------------------------ */
function Beam({ pos, side, lights, color }: { pos: [number, number, number]; side: number; lights: { current: number }; color: string }) {
  const ref = useRef<THREE.SpotLight>(null);
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    l.target.position.set(pos[0] + 9, 0, pos[2] * 0.9 + side * 0.6);
    l.parent?.add(l.target);
    return () => {
      l.parent?.remove(l.target);
    };
  }, [pos, side]);
  useFrame(() => {
    if (ref.current) ref.current.intensity = lights.current * 70;
  });
  return <spotLight ref={ref} position={pos} angle={0.42} penumbra={1} distance={16} decay={1.6} color={color} intensity={0} />;
}

/* ------------------------------------------------------------------ */
/* Car                                                                 */
/* ------------------------------------------------------------------ */
export function CarModel({
  spec,
  body,
  rim,
  caliper,
  interior,
  trim = "carbon",
  wheelDesign,
  signature = "#e8f1ff",
  lights,
  explode,
  wingAngle = 0.12,
  spin = 0,
  glassOpacity = 0.58,
  quality = "high",
  beams = true,
  position,
  rotation,
}: CarModelProps) {
  const hi = quality === "high";
  const R = spec.wheelR;
  const lightsRef = useMemo(() => lights ?? { current: 1 }, [lights]);

  const prof = useMemo(() => makeProfiles({ cabinH: spec.cabinH, nose: spec.nose }), [spec.cabinH, spec.nose]);

  const geo = useMemo(
    () => ({
      body: buildBody(prof, hi ? 64 : 40, hi ? 110 : 70),
      cabin: buildCabin(prof, hi ? 40 : 28, hi ? 60 : 40),
      roof: buildRoof(prof, hi ? 28 : 20, hi ? 40 : 28),
      splitter: buildSplitter(),
      tail: buildTaillight(prof, 0.74 + (spec.cabinH > 1 ? 0.02 : 0)),
      grille: buildTaillight(prof, 0.29, 0.4, 1, 0.045),
      tire: buildTire(R, TIRE_W),
    }),
    [prof, hi, R, spec.cabinH],
  );

  /* ---------- materials ---------- */
  const archF = useMemo(() => ({ value: new THREE.Vector3(WB_F, R - spec.lift, R + 0.075) }), [R, spec.lift]);
  const archR = useMemo(() => ({ value: new THREE.Vector3(WB_R, R - spec.lift, R + 0.075) }), [R, spec.lift]);

  const mats = useMemo(() => {
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: body ?? spec.color,
      metalness: spec.metalness,
      roughness: spec.roughness,
      clearcoat: spec.clearcoat,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.25,
      side: THREE.DoubleSide,
    });
    bodyMat.onBeforeCompile = (shader) => {
      shader.uniforms.uArchF = archF;
      shader.uniforms.uArchR = archR;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjNrm;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;\nvObjNrm = normal;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjNrm;\nuniform vec3 uArchF;\nuniform vec3 uArchR;",
        )
        .replace(
          "#include <clipping_planes_fragment>",
          `#include <clipping_planes_fragment>
          if (abs(vObjNrm.z) > 0.5) {
            if (length(vObjPos.xy - uArchF.xy) < uArchF.z || length(vObjPos.xy - uArchR.xy) < uArchR.z) discard;
          }`,
        )
        .replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\n if (!gl_FrontFacing) gl_FragColor = vec4(vec3(0.004), 1.0);",
        );
    };
    bodyMat.customProgramCacheKey = () => "carbody-arch-v1";

    const t = TRIM_SET[trim];
    const trimMat = new THREE.MeshPhysicalMaterial({
      color: t.color,
      metalness: t.metalness,
      roughness: t.roughness,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.1,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#06080b",
      metalness: 0.1,
      roughness: 0.03,
      transparent: true,
      opacity: 0.58,
      envMapIntensity: 2.4,
      clearcoat: 1,
      depthWrite: false,
    });
    const rimMat = new THREE.MeshStandardMaterial({ color: rim ?? spec.rim, metalness: 1, roughness: 0.24, envMapIntensity: 1.3, side: THREE.DoubleSide });
    const caliperMat = new THREE.MeshStandardMaterial({ color: caliper ?? spec.caliper, metalness: 0.3, roughness: 0.35 });
    const tireMat = new THREE.MeshStandardMaterial({ color: "#080808", metalness: 0, roughness: 0.82 });
    const darkMat = new THREE.MeshStandardMaterial({ color: "#060606", metalness: 0.4, roughness: 0.55 });
    const discMat = new THREE.MeshStandardMaterial({ color: "#6d7075", metalness: 1, roughness: 0.4 });
    const gloss = new THREE.MeshPhysicalMaterial({ color: "#050505", metalness: 0.6, roughness: 0.12, clearcoat: 1, envMapIntensity: 1.6 });
    const seat = new THREE.MeshStandardMaterial({ color: interior ?? "#141414", metalness: 0, roughness: 0.6 });
    const led = new THREE.MeshStandardMaterial({ color: "#0a0a0a", emissive: new THREE.Color(signature), emissiveIntensity: 0, roughness: 0.3 });
    const tail = new THREE.MeshStandardMaterial({ color: "#220000", emissive: new THREE.Color("#ff1414"), emissiveIntensity: 0 });
    const accent = new THREE.MeshStandardMaterial({ color: "#c1121f", emissive: new THREE.Color("#c1121f"), emissiveIntensity: 0.8 });
    return { bodyMat, trimMat, glass, rimMat, caliperMat, tireMat, darkMat, discMat, gloss, seat, led, tail, accent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec.id]);

  /* ---------- colour targets (smooth transitions) ---------- */
  const targets = useRef({
    body: new THREE.Color(),
    rim: new THREE.Color(),
    caliper: new THREE.Color(),
    seat: new THREE.Color(),
    trim: new THREE.Color(),
    sig: new THREE.Color(),
    trimM: 0.5,
    trimR: 0.3,
  });
  targets.current.body.set(body ?? spec.color);
  targets.current.rim.set(rim ?? spec.rim);
  targets.current.caliper.set(caliper ?? spec.caliper);
  targets.current.seat.set(interior ?? "#141414");
  targets.current.trim.set(TRIM_SET[trim].color);
  targets.current.sig.set(signature);
  targets.current.trimM = TRIM_SET[trim].metalness;
  targets.current.trimR = TRIM_SET[trim].roughness;

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
    },
    [geo],
  );
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  /* ---------- details: lights, intakes ---------- */
  const details = useMemo(() => {
    const yH = 0.45;
    const x0 = surfaceX(prof, 0.4, yH, 1);
    const x1 = surfaceX(prof, 0.8, yH, 1);
    const head = {
      x: (x0 + x1) / 2 + 0.004,
      y: yH,
      z: 0.6,
      dx: x1 - x0,
    };
    const yI = 0.4;
    const intakeX = -0.78;
    const intakeZ = halfWidthAt(prof, intakeX, yI);
    return { head, intakeX, intakeZ, yI };
  }, [prof]);

  /* ---------- frame loop ---------- */
  const bodyGroup = useRef<THREE.Group>(null);
  const wingPivot = useRef<THREE.Group>(null);
  const offset = useMemo(() => ({ x: 0, z: 0, y: 0 }), []);
  const rimDesign = wheelDesign ?? spec.wheelDesign;

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 6);
    const tg = targets.current;
    mats.bodyMat.color.lerp(tg.body, k);
    mats.rimMat.color.lerp(tg.rim, k);
    mats.caliperMat.color.lerp(tg.caliper, k);
    mats.seat.color.lerp(tg.seat, k);
    mats.trimMat.color.lerp(tg.trim, k);
    mats.trimMat.metalness = lerp(mats.trimMat.metalness, tg.trimM, k);
    mats.trimMat.roughness = lerp(mats.trimMat.roughness, tg.trimR, k);
    mats.led.emissive.lerp(tg.sig, k);
    mats.glass.opacity = lerp(mats.glass.opacity, glassOpacity, k);

    const l = lightsRef.current;
    mats.led.emissiveIntensity = l * 5.5;
    mats.tail.emissiveIntensity = l * 2.4;
    mats.accent.emissiveIntensity = 0.3 + l * 0.9;

    const e = explode?.current ?? 0;
    if (bodyGroup.current) bodyGroup.current.position.y = spec.lift + e * 1.9;
    offset.z = e * 1.15;
    offset.y = e * -0.05;
    offset.x = 0;
    if (wingPivot.current) wingPivot.current.rotation.z = lerp(wingPivot.current.rotation.z, wingAngle, k);
  });

  const hd = details.head;
  const wingY = spec.wing === "tall" ? 1.3 : spec.wing === "gt" ? 1.14 : 0.93;
  const wingChord = spec.wing === "duck" ? 0.3 : spec.wing === "tall" ? 0.5 : 0.42;
  const wingSpan = spec.wing === "duck" ? 1.35 : 1.62;
  const strutH = wingY - 0.88;

  return (
    <group position={position} rotation={rotation}>
      <group ref={bodyGroup} position={[0, spec.lift, 0]}>
        {/* shell */}
        <mesh geometry={geo.body} material={mats.bodyMat} />
        <mesh geometry={geo.cabin} material={mats.glass} renderOrder={2} />
        <mesh geometry={geo.roof} material={mats.bodyMat} />

        {/* splitter + accent */}
        <mesh geometry={geo.splitter} material={mats.trimMat} position={[0, 0.07, 0]} />
        <mesh position={[2.335, 0.08, 0]} material={mats.accent}>
          <boxGeometry args={[0.012, 0.012, 1.1]} />
        </mesh>

        {/* front intake */}
        <mesh geometry={geo.grille} material={mats.gloss} />
        {/* hood vents */}
        {[-0.28, 0.28].map((z) => (
          <mesh key={z} position={[1.12, 0.742, z]} rotation={[0, 0, -0.26]} material={mats.gloss}>
            <boxGeometry args={[0.46, 0.012, 0.2]} />
          </mesh>
        ))}

        {/* headlights + taillight */}
        {[1, -1].map((s) => {
          const yaw = Math.atan2(hd.dx, s * 0.4);
          return (
            <group key={s} position={[hd.x, hd.y, s * hd.z]} rotation={[0, yaw, 0]}>
              <mesh material={mats.gloss}>
                <boxGeometry args={[0.07, 0.055, 0.42]} />
              </mesh>
              <mesh position={[0.026, 0.004, 0]} material={mats.led}>
                <boxGeometry args={[0.03, 0.022, 0.38]} />
              </mesh>
              <mesh position={[0.024, -0.02, 0]} material={mats.led}>
                <boxGeometry args={[0.03, 0.008, 0.26]} />
              </mesh>
            </group>
          );
        })}
        <mesh geometry={geo.tail} material={mats.tail} />

        {/* side intakes */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[details.intakeX, details.yI, s * (details.intakeZ - 0.004)]} material={mats.gloss}>
            <boxGeometry args={[0.62, 0.15, 0.03]} />
          </mesh>
        ))}

        {/* mirrors */}
        {[1, -1].map((s) => (
          <group key={s} position={[0.62, 0.9, s * 0.72]}>
            <mesh material={mats.trimMat}>
              <boxGeometry args={[0.17, 0.065, 0.1]} />
            </mesh>
            <mesh position={[-0.02, -0.05, -s * 0.05]} material={mats.gloss}>
              <boxGeometry args={[0.05, 0.06, 0.04]} />
            </mesh>
          </group>
        ))}

        {/* diffuser */}
        <mesh position={[-1.95, 0.075, 0]} material={mats.trimMat}>
          <boxGeometry args={[0.7, 0.02, 1.5]} />
        </mesh>
        {[-0.52, -0.26, 0, 0.26, 0.52].map((z) => (
          <mesh key={z} position={[-2.0, 0.13, z]} material={mats.gloss}>
            <boxGeometry args={[0.6, 0.12, 0.014]} />
          </mesh>
        ))}

        {/* rear wing */}
        {spec.wing !== "none" && (
          <group position={[-2.06, 0, 0]}>
            {spec.wing !== "duck" &&
              [-0.5, 0.5].map((z) => (
                <mesh key={z} position={[0.02, 0.88 + strutH / 2, z]} material={mats.trimMat}>
                  <boxGeometry args={[0.07, strutH, 0.03]} />
                </mesh>
              ))}
            <group ref={wingPivot} position={[0, wingY, 0]}>
              <mesh material={mats.trimMat}>
                <boxGeometry args={[wingChord, 0.032, wingSpan]} />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[0, 0.03, s * (wingSpan / 2)]} material={mats.trimMat}>
                  <boxGeometry args={[wingChord + 0.04, 0.16, 0.018]} />
                </mesh>
              ))}
              {spec.wing === "tall" && (
                <mesh position={[-0.02, 0.1, 0]} rotation={[0, 0, 0.1]} material={mats.trimMat}>
                  <boxGeometry args={[wingChord * 0.6, 0.02, wingSpan * 0.96]} />
                </mesh>
              )}
            </group>
            {spec.wing === "duck" && (
              <mesh position={[0.1, 0.86, 0]} material={mats.trimMat}>
                <boxGeometry args={[0.2, 0.05, 0.4]} />
              </mesh>
            )}
          </group>
        )}

        {/* interior */}
        <group>
          {[0.34, -0.34].map((z) => (
            <group key={z} position={[-0.18, 0, z]}>
              <RoundedBox args={[0.58, 0.09, 0.42]} radius={0.035} smoothness={3} position={[0, 0.84, 0]} material={mats.seat} />
              <RoundedBox args={[0.1, 0.34, 0.42]} radius={0.035} smoothness={3} position={[-0.3, 0.98, 0]} rotation={[0, 0, 0.22]} material={mats.seat} />
              <RoundedBox args={[0.09, 0.12, 0.22]} radius={0.035} smoothness={3} position={[-0.35, 1.1, 0]} rotation={[0, 0, 0.22]} material={mats.seat} />
            </group>
          ))}
          <mesh position={[0.62, 0.9, 0]} material={mats.gloss}>
            <boxGeometry args={[0.3, 0.14, 1.2]} />
          </mesh>
          <mesh position={[0.4, 0.97, 0.34]} rotation={[0, 0, 1.0]} material={mats.gloss}>
            <torusGeometry args={[0.1, 0.014, 8, 24]} />
          </mesh>
          <mesh position={[0.14, 0.82, 0]} material={mats.gloss}>
            <boxGeometry args={[0.7, 0.14, 0.14]} />
          </mesh>
        </group>
      </group>

      {/* wheels */}
      {([1, -1] as const).map((s) =>
        [WB_F, WB_R].map((x) => (
          <Wheel
            key={`${s}${x}`}
            R={R}
            design={rimDesign}
            side={s}
            position={[x, R, s * TRACK]}
            tire={geo.tire}
            rimMat={mats.rimMat}
            caliperMat={mats.caliperMat}
            tireMat={mats.tireMat}
            darkMat={mats.darkMat}
            discMat={mats.discMat}
            spin={spin}
            offsetRef={offset}
            hi={hi}
          />
        )),
      )}

      {beams && hi && (
        <>
          <Beam pos={[hd.x + 0.05, hd.y + spec.lift, hd.z]} side={1} lights={lightsRef} color={signature} />
          <Beam pos={[hd.x + 0.05, hd.y + spec.lift, -hd.z]} side={-1} lights={lightsRef} color={signature} />
        </>
      )}
    </group>
  );
}

export const CAR_BOUNDS = { length: 4.5, width: 2.0, height: 1.2 };
