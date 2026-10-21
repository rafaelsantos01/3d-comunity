"use client";
import { Bounds, ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { BufferGeometry } from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { BBox } from "@/lib/geometria/bbox";

interface Props {
  base: ArrayBuffer | null;
  letras: ArrayBuffer | null;
  corBase: string;
  corLetras: string;
  emPe: boolean;
  caixa: BBox | null;
}

function useGeometria(buf: ArrayBuffer | null): BufferGeometry | null {
  return useMemo(() => {
    if (!buf) return null;
    const g = new STLLoader().parse(buf);
    g.computeVertexNormals();
    return g;
  }, [buf]);
}

function Peca({ geometria, cor }: { geometria: BufferGeometry | null; cor: string }) {
  if (!geometria) return null;
  return (
    <mesh geometry={geometria} castShadow receiveShadow>
      <meshStandardMaterial color={cor} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

/**
 * OpenSCAD é Z-up e o three é Y-up. "Deitado": gira -90° em X (a placa fica sobre a mesa).
 * "Em pé": as coordenadas do OpenSCAD já são a orientação em pé no three (texto para cima).
 * Depois translada para o mínimo da bounding box encostar no chão (y = 0) e centraliza.
 */
export default function Previa3D({ base, letras, corBase, corLetras, emPe, caixa }: Props) {
  const gBase = useGeometria(base);
  const gLetras = useGeometria(letras);
  const c = caixa ?? { min: [0, 0, 0], max: [0, 0, 0] };
  const cx = (c.min[0] + c.max[0]) / 2;
  const cy = (c.min[1] + c.max[1]) / 2;
  const cz = (c.min[2] + c.max[2]) / 2;
  const posicao: [number, number, number] = emPe ? [-cx, -c.min[1], -cz] : [-cx, -c.min[2], cy];
  const tamanho = Math.max(c.max[0] - c.min[0], c.max[1] - c.min[1], 50);

  return (
    <div role="img" aria-label="Prévia 3D do letreiro (arraste para girar, role para aproximar)" className="h-full w-full">
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, tamanho * 0.6, tamanho * 1.2], fov: 40, near: 1, far: 10000 }}>
      <color attach="background" args={["#e9edf3"]} />
      <hemisphereLight args={["#ffffff", "#b9a88f", 0.9]} />
      <directionalLight position={[tamanho, tamanho * 2, tamanho]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
      <Bounds key={`${emPe}`} fit clip margin={1.3}>
        <group position={posicao}>
          <group rotation={[emPe ? 0 : -Math.PI / 2, 0, 0]}>
            <Peca geometria={gBase} cor={corBase} />
            <Peca geometria={gLetras} cor={corLetras} />
          </group>
        </group>
      </Bounds>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[tamanho * 8, tamanho * 8]} />
        <meshStandardMaterial color="#d8c8ae" roughness={0.9} />
      </mesh>
      <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={tamanho * 3} blur={2.4} far={tamanho} />
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
    </div>
  );
}
