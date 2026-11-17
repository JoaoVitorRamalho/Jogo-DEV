"use client";

import { Canvas } from "@react-three/fiber";
import { NoToneMapping } from "three";
import { Character } from "@/components/game/Character";
import type { Appearance, Catalog } from "@/lib/character/types";

export function Portrait({
  catalog,
  appearance,
  mode,
}: {
  catalog: Catalog;
  appearance: Appearance;
  mode: "idle" | "demo";
}) {
  return (
    <div className="portrait">
      <Canvas
        orthographic
        dpr={1}
        gl={{ antialias: false, alpha: true }}
        camera={{ position: [0, 36, 80], zoom: 3, near: 0.1, far: 200 }}
        onCreated={({ camera, gl }) => {
          gl.toneMapping = NoToneMapping;
          camera.lookAt(0, 36, 0);
        }}
      >
        <Character catalog={catalog} appearance={appearance} mode={mode} />
      </Canvas>
    </div>
  );
}
