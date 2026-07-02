"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import type { ChartPoint } from "@/lib/types";
import { fmtUnit, titleCls } from "./theme";

type CoinStacks3DProps = { title: string; unit?: string; data: ChartPoint[] };

type Coin = {
  x: number;
  z: number;
  y: number; // resting height
  startY: number; // spawn height (off-frame, above)
  delay: number;
  rotY: number;
  alt: boolean;
};

const COIN_H = 0.09;
const COIN_R = 0.32;
const MAX_COINS = 12;
const SPACING = 0.78;

// Deterministic per-index jitter — no Math.random in render.
function jitter(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildCoins(data: ChartPoint[]): { coins: Coin[]; halfWidth: number } {
  const maxV = Math.max(0, ...data.map((d) => d.value));
  const coins: Coin[] = [];
  data.forEach((d, si) => {
    const cx = (si - (data.length - 1) / 2) * SPACING;
    const count = maxV > 0 ? Math.max(1, Math.round((Math.max(0, d.value) / maxV) * MAX_COINS)) : 1;
    for (let k = 0; k < count; k++) {
      const j = si * MAX_COINS + k;
      coins.push({
        x: cx + (jitter(j) - 0.5) * 0.05,
        z: (jitter(j + 57) - 0.5) * 0.05,
        y: COIN_H / 2 + k * (COIN_H + 0.006),
        startY: 4 + jitter(j + 91),
        delay: 0.15 + si * 0.14 + k * 0.055,
        rotY: jitter(j + 13) * Math.PI,
        alt: k % 2 === 1,
      });
    }
  });
  return { coins, halfWidth: (Math.max(data.length - 1, 0) / 2) * SPACING };
}

function CoinScene({ coins, halfWidth }: { coins: Coin[]; halfWidth: number }) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  const { geo, matA, matB } = useMemo(
    () => ({
      geo: new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_H, 28),
      matA: new THREE.MeshStandardMaterial({ color: "#E8B84B", metalness: 0.85, roughness: 0.25 }),
      matB: new THREE.MeshStandardMaterial({ color: "#D4A94A", metalness: 0.85, roughness: 0.3 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      matA.dispose();
      matB.dispose();
    },
    [geo, matA, matB],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) group.current.rotation.y = t * 0.16;
    for (let i = 0; i < coins.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const c = coins[i];
      const lt = t - c.delay;
      if (lt <= 0) {
        m.position.y = c.startY;
        continue;
      }
      // Critically damped drop — spring-ish settle, no through-floor bounce.
      const p = 1 - Math.exp(-7 * lt) * (1 + 7 * lt);
      m.position.y = c.startY + (c.y - c.startY) * p;
    }
  });

  return (
    <group ref={group}>
      {coins.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={geo}
          material={c.alt ? matB : matA}
          position={[c.x, c.startY, c.z]}
          rotation={[0, c.rotY, 0]}
        />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[halfWidth + 1.6, 48]} />
        <meshStandardMaterial color="#10141B" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
}

export default function CoinStacks3D({ title, unit, data }: CoinStacks3DProps) {
  const { coins, halfWidth } = useMemo(() => buildCoins(data), [data]);
  const camZ = Math.max(4.6, halfWidth * 2.2 + 3.2);

  // WebGL contexts are a scarce per-tab resource (~8–16; the oldest gets
  // evicted, killing the main stage). Hold one only while this block is on
  // screen — scrolling back replays the coin drop, which is a feature.
  const holder = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = holder.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "60px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="w-full min-w-0 rounded-xl border border-white/10 bg-black/40 p-3">
      <p className={titleCls}>{title}</p>
      {data.length === 0 ? (
        <p className="text-[11px] text-white/35">No data.</p>
      ) : (
        <>
          <div ref={holder} className="h-[200px] w-full overflow-hidden rounded-lg">
            {inView && (
            <Canvas
              dpr={[1, 1.5]}
              camera={{ position: [0, 2.3, camZ], fov: 34 }}
              gl={{ antialias: true, alpha: true }}
              onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}
            >
              <ambientLight intensity={0.55} color="#FFF2DC" />
              <directionalLight position={[3, 6, 4]} intensity={1.6} color="#FFE3BC" />
              <pointLight position={[-3.5, 1.6, -2.5]} intensity={7} color="#E5484D" />
              <Suspense fallback={null}>
                {/* Procedural env (no network) so the metallic gold has something to reflect */}
                <Environment resolution={64} frames={1}>
                  <mesh position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[12, 12]} />
                    <meshBasicMaterial color="#8A6B35" side={THREE.DoubleSide} />
                  </mesh>
                  <mesh position={[-5, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <planeGeometry args={[10, 6]} />
                    <meshBasicMaterial color="#3D2F1B" side={THREE.DoubleSide} />
                  </mesh>
                  <mesh position={[5, 1, 0]} rotation={[0, -Math.PI / 2, 0]}>
                    <planeGeometry args={[10, 6]} />
                    <meshBasicMaterial color="#57241F" side={THREE.DoubleSide} />
                  </mesh>
                </Environment>
                <CoinScene coins={coins} halfWidth={halfWidth} />
              </Suspense>
            </Canvas>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
            {data.map((d, i) => (
              <span key={`${d.label}-${i}`} className="text-[10px] text-white/50">
                {d.label}{" "}
                <span className="font-medium tabular-nums text-white/85">{fmtUnit(d.value, unit)}</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
