"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, Sparkles } from "@react-three/drei";
import type { Mood } from "@/lib/types";

type StageProps = {
  mood: Mood;
  energyRef: React.RefObject<number>;
};

function dampTo(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// Placeholder primitive-built Tai. The generated GLB will replace the body of
// this component; the animation rig (mood + energy driving the refs) stays.
function NirmalaAvatar({ mood, energyRef }: StageProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const eyes = useRef<THREE.Group>(null);
  const coin = useRef<THREE.Mesh>(null);
  const talk = useRef(0);

  useFrame((state, delta) => {
    if (!root.current || !head.current || !body.current) return;
    const t = state.clock.elapsedTime;

    // Word pulses decay into a smoothed "talk" amplitude.
    energyRef.current = (energyRef.current ?? 0) * Math.exp(-3.2 * delta);
    talk.current = dampTo(talk.current, energyRef.current, 10, delta);

    // Idle base: breathing + slow sway.
    body.current.scale.y = 1 + 0.012 * Math.sin(t * 1.7);
    root.current.rotation.z = 0.018 * Math.sin(t * 0.5);
    root.current.position.y = 0.01 * Math.sin(t * 0.9);

    // Mood targets for the head.
    let targetTilt = 0.06 * Math.sin(t * 0.4); // idle: slow considering tilt
    let targetYaw = 0.16 * Math.sin(t * 0.3); // idle: looking around the room
    let targetPitch = 0;
    if (mood === "thinking") {
      targetTilt = 0.16;
      targetYaw = 0.25;
      targetPitch = -0.12; // gazing up, consulting the fiscal heavens
    } else if (mood === "speaking") {
      targetTilt = 0.02 * Math.sin(t * 2);
      targetYaw = 0.05 * Math.sin(t * 1.1);
      targetPitch = 0.02 + 0.05 * Math.sin(t * 13) * talk.current; // emphatic bob
    }
    head.current.rotation.z = dampTo(head.current.rotation.z, targetTilt, 6, delta);
    head.current.rotation.y = dampTo(head.current.rotation.y, targetYaw, 6, delta);
    head.current.rotation.x = dampTo(head.current.rotation.x, targetPitch, 8, delta);

    // Mouth flap.
    if (mouth.current) {
      const open = mood === "speaking" ? 0.3 + 2.2 * talk.current : 0.3;
      mouth.current.scale.y = dampTo(mouth.current.scale.y, Math.min(open, 2.2), 18, delta);
    }

    // Periodic blink.
    if (eyes.current) {
      const cycle = t % 3.7;
      const blink = cycle < 0.12 ? 0.12 : 1;
      eyes.current.scale.y = dampTo(eyes.current.scale.y, blink, 30, delta);
    }

    // Thinking coin: spins into existence while she deliberates.
    if (coin.current) {
      const show = mood === "thinking" ? 1 : 0;
      const s = dampTo(coin.current.scale.x, show, 8, delta);
      coin.current.scale.setScalar(Math.max(s, 0.0001));
      coin.current.rotation.y += delta * 4;
      coin.current.position.y = 2.05 + 0.05 * Math.sin(t * 3);
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        {/* Sari silhouette + gold border */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <coneGeometry args={[0.55, 1.24, 48]} />
          <meshStandardMaterial color="#B3255E" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.028, 16, 64]} />
          <meshStandardMaterial color="#D4A94A" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Pallu drape */}
        <mesh position={[-0.16, 1.02, 0.1]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.17, 0.85, 0.09]} />
          <meshStandardMaterial color="#8E1D4B" roughness={0.6} />
        </mesh>
        {/* Shoulders */}
        <mesh position={[0, 1.24, 0]}>
          <sphereGeometry args={[0.26, 32, 16]} />
          <meshStandardMaterial color="#9E2052" roughness={0.6} />
        </mesh>

        {/* The bahi-khata: red ledger with gold emblem, held at chest */}
        <group position={[0, 1.05, 0.36]} rotation={[-0.3, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.36, 0.27, 0.055]} />
            <meshStandardMaterial color="#9E2B25" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <cylinderGeometry args={[0.055, 0.055, 0.012, 24]} />
            <meshStandardMaterial color="#D4A94A" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.135, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.36, 0.06, 0.02]} />
            <meshStandardMaterial color="#D4A94A" metalness={0.7} roughness={0.35} />
          </mesh>
          {/* Hands */}
          <mesh position={[-0.21, -0.05, 0]}>
            <sphereGeometry args={[0.052, 16, 12]} />
            <meshStandardMaterial color="#C68863" roughness={0.7} />
          </mesh>
          <mesh position={[0.21, -0.05, 0]}>
            <sphereGeometry args={[0.052, 16, 12]} />
            <meshStandardMaterial color="#C68863" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* Head */}
      <group ref={head} position={[0, 1.56, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.24, 48, 32]} />
          <meshStandardMaterial color="#C68863" roughness={0.65} />
        </mesh>
        {/* Hair + bun */}
        <mesh position={[0, 0.05, -0.05]} scale={[1.03, 0.98, 1]}>
          <sphereGeometry args={[0.245, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color="#524C55" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.1, -0.23]}>
          <sphereGeometry args={[0.095, 24, 16]} />
          <meshStandardMaterial color="#4A4450" roughness={0.85} />
        </mesh>
        {/* Eyes */}
        <group ref={eyes}>
          <mesh position={[-0.085, 0.02, 0.21]}>
            <sphereGeometry args={[0.023, 16, 12]} />
            <meshStandardMaterial color="#1C1C1E" roughness={0.3} />
          </mesh>
          <mesh position={[0.085, 0.02, 0.21]}>
            <sphereGeometry args={[0.023, 16, 12]} />
            <meshStandardMaterial color="#1C1C1E" roughness={0.3} />
          </mesh>
        </group>
        {/* Glasses */}
        <mesh position={[-0.085, 0.02, 0.225]}>
          <torusGeometry args={[0.058, 0.008, 12, 32]} />
          <meshStandardMaterial color="#2E2C33" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.085, 0.02, 0.225]}>
          <torusGeometry args={[0.058, 0.008, 12, 32]} />
          <meshStandardMaterial color="#2E2C33" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.025, 0.228]}>
          <boxGeometry args={[0.06, 0.012, 0.012]} />
          <meshStandardMaterial color="#2E2C33" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Bindi */}
        <mesh position={[0, 0.1, 0.232]}>
          <sphereGeometry args={[0.013, 12, 8]} />
          <meshStandardMaterial color="#A61B1B" roughness={0.4} />
        </mesh>
        {/* Mouth */}
        <mesh ref={mouth} position={[0, -0.095, 0.215]}>
          <boxGeometry args={[0.085, 0.045, 0.028]} />
          <meshStandardMaterial color="#6E2430" roughness={0.5} />
        </mesh>
        {/* Earrings */}
        <mesh position={[-0.235, -0.05, 0.02]}>
          <sphereGeometry args={[0.022, 12, 8]} />
          <meshStandardMaterial color="#D4A94A" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.235, -0.05, 0.02]}>
          <sphereGeometry args={[0.022, 12, 8]} />
          <meshStandardMaterial color="#D4A94A" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Deliberation coin */}
      <mesh ref={coin} position={[0.42, 2.05, 0]} rotation={[Math.PI / 2.3, 0, 0]} scale={0.0001}>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 32]} />
        <meshStandardMaterial color="#E3B54C" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Podium */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.12, 48]} />
        <meshStandardMaterial color="#152028" roughness={0.8} />
      </mesh>
    </group>
  );
}

export default function NirmalaStage({ mood, energyRef }: StageProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 3.4], fov: 34 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      <ambientLight intensity={0.45} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.7} color="#FFE3BC" castShadow />
      <pointLight position={[-2.5, 2, -1.5]} intensity={12} color="#2E8C63" />
      <pointLight position={[0, 3, -2.5]} intensity={8} color="#D98CB0" />

      <NirmalaAvatar mood={mood} energyRef={energyRef} />

      <Sparkles count={45} scale={[3.2, 2.6, 3.2]} position={[0, 1.4, 0]} size={2.2} speed={0.3} opacity={0.35} color="#E8C776" />
      <ContactShadows position={[0, -0.01, 0]} opacity={0.55} scale={7} blur={2.6} far={2.5} />

      <OrbitControls
        target={[0, 1.15, 0]}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.85}
        minAzimuthAngle={-0.7}
        maxAzimuthAngle={0.7}
      />
    </Canvas>
  );
}
