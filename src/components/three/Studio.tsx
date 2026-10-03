import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * Moves an object tree onto layer 1 so drei's ContactShadows (which renders the whole scene
 * with a depth override on layer 0) ignores haze planes, line ribbons, arrows, etc.
 */
export function useShadowExempt(ref: RefObject<import("three").Object3D | null>) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.layers.enable(1);
    ref.current?.traverse((o) => o.layers.set(1));
  });
}

/** Procedural studio reflections — no network HDRI required. */
export function StudioEnv({ cool = false, warm = 1 }: { cool?: boolean; warm?: number }) {
  const key = cool ? "#cfe0ff" : "#ffffff";
  const rim = cool ? "#8fb4ff" : "#ffffff";
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#020202"]} />
      {/* overhead soft-box */}
      <Lightformer form="rect" intensity={2.4 * warm} color={key} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[16, 5, 1]} />
      {/* long strips — give the body those luxurious highlight lines */}
      <Lightformer form="rect" intensity={3.4} color={rim} position={[-8, 2.5, 3]} rotation-y={Math.PI / 2} scale={[1.2, 9, 1]} />
      <Lightformer form="rect" intensity={3.4} color={rim} position={[8, 2.5, -3]} rotation-y={-Math.PI / 2} scale={[1.2, 9, 1]} />
      <Lightformer form="rect" intensity={1.4} color={key} position={[0, 3, -10]} scale={[18, 3, 1]} />
      <Lightformer form="rect" intensity={0.8} color={key} position={[3, 1.5, 10]} rotation-y={Math.PI} scale={[8, 1.2, 1]} />
      {/* faint red kicker */}
      <Lightformer form="rect" intensity={cool ? 0.2 : 2.2} color="#c1121f" position={[-4, 0.6, -8]} scale={[10, 0.5, 1]} />
      <Lightformer form="ring" intensity={1.2} color={key} position={[0, 5, 6]} rotation-x={Math.PI / 2.4} scale={3} />
    </Environment>
  );
}

export function ReflectFloor({
  quality = "high",
  color = "#070707",
  y = 0,
  mix = 55,
}: {
  quality?: "high" | "low";
  color?: string;
  y?: number;
  mix?: number;
}) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
      <planeGeometry args={[120, 120]} />
      {quality === "high" ? (
        <MeshReflectorMaterial
          blur={[300, 90]}
          resolution={768}
          mixBlur={1}
          mixStrength={mix}
          mixContrast={1.1}
          roughness={1}
          depthScale={1.1}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.35}
          color={color}
          metalness={0.55}
        />
      ) : (
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.6} />
      )}
    </mesh>
  );
}

function makeFogTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.28)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Slow drifting ground haze — cheap volumetric feel. */
export function GroundFog({ count = 5, opacity = 0.085, tint = "#c9ccd2" }: { count?: number; opacity?: number; tint?: string }) {
  const tex = useMemo(makeFogTexture, []);
  const group = useRef<THREE.Group>(null);
  const items = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        x: Math.sin(i * 2.1) * 4.5,
        z: Math.cos(i * 1.7) * 4.5,
        y: 0.12 + i * 0.08,
        s: 9 + (i % 3) * 3,
        r: i * 1.3,
        sp: (i % 2 ? 1 : -1) * (0.015 + i * 0.004),
      })),
    [count],
  );
  useShadowExempt(group);
  useFrame((_, dt) => {
    group.current?.children.forEach((m, i) => {
      m.rotation.z += items[i].sp * dt;
    });
  });
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x, it.y, it.z]} rotation={[-Math.PI / 2, 0, it.r]}>
          <planeGeometry args={[it.s, it.s]} />
          <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} color={tint} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

export function Dust({ count = 70, opacity = 0.35 }: { count?: number; opacity?: number }) {
  return <Sparkles count={count} scale={[14, 5, 14]} position={[0, 2.4, 0]} size={1.5} speed={0.16} opacity={opacity} color="#ffffff" noise={0.4} />;
}

/** Ring of dim vertical light slits for studio depth / parallax. */
export function StudioSlits({ radius = 17, count = 9, intensity = 0.16 }: { radius?: number; count?: number; intensity?: number }) {
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.3;
        const red = i === 2;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, 3.2, Math.sin(a) * radius]} rotation-y={-a + Math.PI / 2}>
            <planeGeometry args={[red ? 0.5 : 0.22, red ? 1.2 : 8]} />
            <meshBasicMaterial color={red ? "#c1121f" : "#ffffff"} transparent opacity={red ? 0.5 : intensity} toneMapped={false} fog={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}
