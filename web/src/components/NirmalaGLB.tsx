"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import type { Emotion, Mood } from "@/lib/types";

const MODEL_URL = "/models/nirmala.glb";
const TARGET_HEIGHT = 1.75;
const MODEL_ROTATION_Y = 0; // tweak if the generated mesh faces sideways

type Props = {
  mood: Mood;
  emotion: Emotion;
  energyRef: React.RefObject<number>;
};

function dampTo(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// Likeness GLB (unrigged single mesh): mood/emotion animate whole-body
// transforms — squash-stretch talk, lean-in scolding, gleeful tax bounce.
export default function NirmalaGLB({ mood, emotion, energyRef }: Props) {
  const root = useRef<THREE.Group>(null);
  const figure = useRef<THREE.Group>(null);
  const coin = useRef<THREE.Mesh>(null);
  const finger = useRef<THREE.Group>(null);
  const baton = useRef<THREE.Group>(null);
  const angryLight = useRef<THREE.PointLight>(null);
  const talk = useRef(0);
  const fx = useRef({ angry: 0, baton: 0, tax: 0 });

  const { scene } = useGLTF(MODEL_URL);

  // Auto-fit: scale to TARGET_HEIGHT, center on x/z, feet on the floor.
  const fitted = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        const mesh = obj as THREE.Mesh;
        if (!mesh.geometry.hasAttribute("normal")) {
          mesh.geometry.computeVertexNormals(); // TRELLIS ships no normals → flat banding
        }
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material && "metalness" in material) {
          // trimesh exports metallicFactor=1 → renders black under punctual lights
          material.metalness = 0;
          material.roughness = 0.85;
        }
      }
    });
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = TARGET_HEIGHT / (size.y || 1);
    clone.scale.setScalar(scale);
    const scaled = new THREE.Box3().setFromObject(clone);
    const center = scaled.getCenter(new THREE.Vector3());
    clone.position.x -= center.x;
    clone.position.z -= center.z;
    clone.position.y -= scaled.min.y;
    clone.rotation.y = MODEL_ROTATION_Y;
    return clone;
  }, [scene]);

  useFrame((state, delta) => {
    if (!root.current || !figure.current) return;
    const t = state.clock.elapsedTime;

    energyRef.current = (energyRef.current ?? 0) * Math.exp(-3.2 * delta);
    talk.current = dampTo(talk.current, energyRef.current, 10, delta);

    fx.current.angry = dampTo(fx.current.angry, emotion === "angry" ? 1 : 0, 5, delta);
    fx.current.baton = dampTo(fx.current.baton, emotion === "baton" ? 1 : 0, 5, delta);
    fx.current.tax = dampTo(fx.current.tax, emotion === "tax" ? 1 : 0, 5, delta);
    const { angry, baton: lathi, tax } = fx.current;

    // Idle sway + breathing; talk = squash-stretch pulse; tax = happy bounce.
    const breathe = 0.008 * Math.sin(t * 1.7);
    const bulge = breathe + talk.current * 0.06;
    figure.current.scale.set(1 - bulge * 0.5, 1 + bulge, 1 - bulge * 0.5);
    root.current.rotation.z = 0.015 * Math.sin(t * 0.5) + Math.sin(t * 7) * 0.05 * tax;
    root.current.position.y = 0.01 * Math.sin(t * 0.9) + 0.03 * Math.abs(Math.sin(t * 8)) * tax;
    root.current.position.x = Math.sin(t * 47) * 0.012 * lathi;

    // Mood posture for the whole figure.
    let targetPitch = 0;
    let targetYaw = 0.1 * Math.sin(t * 0.3);
    if (mood === "thinking") {
      targetPitch = -0.07; // lean back, consulting the fiscal heavens
      targetYaw = 0.18;
    } else if (mood === "speaking") {
      targetPitch = 0.03 + 0.04 * Math.sin(t * 12) * talk.current; // emphatic nod
      targetYaw = 0.06 * Math.sin(t * 1.1);
    }
    // Scolding lean-in and lathi stance override.
    targetPitch += 0.1 * angry + 0.14 * lathi;
    figure.current.rotation.x = dampTo(figure.current.rotation.x, targetPitch, 7, delta);
    figure.current.rotation.y = dampTo(figure.current.rotation.y, targetYaw + MODEL_ROTATION_Y, 6, delta) + Math.sin(t * 22) * 0.07 * angry;

    if (coin.current) {
      const show = mood === "thinking" ? 1 : 0;
      const s = dampTo(coin.current.scale.x, show, 8, delta);
      coin.current.scale.setScalar(Math.max(s, 0.0001));
      coin.current.rotation.y += delta * 4;
      coin.current.position.y = 2.0 + 0.05 * Math.sin(t * 3);
    }
    if (finger.current) {
      finger.current.scale.setScalar(Math.max(angry, 0.0001));
      finger.current.rotation.z = -0.2 + Math.sin(t * 16) * 0.45 * angry;
    }
    if (baton.current) {
      baton.current.scale.setScalar(Math.max(lathi, 0.0001));
      baton.current.rotation.z = -1.1 + ((Math.sin(t * 9) + 1) / 2) * 0.9 * lathi;
    }
    if (angryLight.current) {
      angryLight.current.intensity = 26 * angry;
    }
  });

  return (
    <group ref={root}>
      <pointLight ref={angryLight} position={[0, 1.6, 1.6]} intensity={0} color="#E5484D" />

      <group ref={figure}>
        <primitive object={fitted} />

        {/* Anime-emote layer: instantly-readable facial expression without a
            face rig — anchored beside the head, billboarded via Html */}
        {emotion === "angry" && (
          <Html position={[0.28, 1.68, 0.2]} center distanceFactor={3.2} zIndexRange={[10, 0]}>
            <span className="emote-pop" style={{ fontSize: 40 }}>💢</span>
          </Html>
        )}
        {emotion === "tax" && (
          <Html position={[0.3, 1.66, 0.2]} center distanceFactor={3.2} zIndexRange={[10, 0]}>
            <span className="emote-pop" style={{ fontSize: 38 }}>🤑</span>
          </Html>
        )}
        {emotion === "baton" && (
          <Html position={[-0.28, 1.68, 0.2]} center distanceFactor={3.2} zIndexRange={[10, 0]}>
            <span className="emote-pop" style={{ fontSize: 38 }}>😤</span>
          </Html>
        )}
        {mood === "thinking" && emotion === "neutral" && (
          <Html position={[-0.3, 1.74, 0.15]} center distanceFactor={3.2} zIndexRange={[10, 0]}>
            <span className="emote-pop" style={{ fontSize: 32 }}>🤔</span>
          </Html>
        )}
      </group>

      {/* Wagging finger — appears when someone is being naughty */}
      <group ref={finger} position={[0.27, 1.18, 0.24]} scale={0.0001}>
        <mesh rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.013, 0.016, 0.15, 12]} />
          <meshStandardMaterial color="#C68863" roughness={0.7} />
        </mesh>
        <mesh position={[0.015, 0.085, 0]}>
          <sphereGeometry args={[0.016, 12, 8]} />
          <meshStandardMaterial color="#C68863" roughness={0.7} />
        </mesh>
      </group>

      {/* The lathi — GST-compliant */}
      <group ref={baton} position={[0.55, 1.0, 0.18]} scale={0.0001}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.035, 0.04, 0.72, 12]} />
          <meshStandardMaterial color="#7A4A21" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.1, 12]} />
          <meshStandardMaterial color="#3E2712" roughness={0.7} />
        </mesh>
      </group>

      {/* Deliberation coin */}
      <mesh ref={coin} position={[0.45, 2.0, 0]} rotation={[Math.PI / 2.3, 0, 0]} scale={0.0001}>
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

export function preloadNirmalaGLB() {
  useGLTF.preload(MODEL_URL);
}
