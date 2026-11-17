"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, NearestFilter, SRGBColorSpace } from "three";
import type { Mesh } from "three";
import { blitFrame, compose, type Sheet } from "@/lib/character/composite";
import type { AnimName, Appearance, Catalog, Direction } from "@/lib/character/types";
import { DIR_ROW } from "@/lib/character/types";
import { playSfx } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { clampRuntime, runtime } from "@/lib/game/runtime";
import { sampleInput } from "@/lib/input/engine";
import { play } from "@/lib/story/control";
import { useScene } from "@/lib/story/scene";
import { useSave } from "@/lib/save/store";

const DEMO_DIRS: Direction[] = ["down", "left", "up", "right"];

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

export function Character({
  catalog,
  appearance,
  mode,
}: {
  catalog: Catalog;
  appearance: Appearance;
  mode: "idle" | "demo" | "play";
}) {
  const mesh = useRef<Mesh>(null);
  const sheets = useRef<Partial<Record<AnimName, Sheet>>>({});
  const appearanceKey = JSON.stringify({ ...appearance, name: "" });
  const frameCanvas = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    return canvas;
  }, []);
  const texture = useMemo(() => {
    const map = new CanvasTexture(frameCanvas);
    map.magFilter = NearestFilter;
    map.minFilter = NearestFilter;
    map.generateMipmaps = false;
    map.colorSpace = SRGBColorSpace;
    return map;
  }, [frameCanvas]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const next: Partial<Record<AnimName, Sheet>> = {};
      for (const anim of ["idle", "walk", "run"] as const) {
        next[anim] = await compose(catalog, JSON.parse(appearanceKey) as Appearance, anim);
      }
      if (!alive) return;
      sheets.current = next;
    })();
    return () => {
      alive = false;
    };
  }, [appearanceKey, catalog]);

  const clock = useRef({ time: 0, index: 0, demo: 0, step: 0, saved: 0 });

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const state = clock.current;
    let anim: AnimName = "idle";
    let direction: Direction = "down";
    let x = 0;
    let y = 0;

    if (mode === "play") {
      const input = sampleInput();
      const scene = useScene.getState();
      const busy = scene.lines.length > 0 || scene.choice !== null || scene.battle !== null;
      if (busy) {
        runtime.vx = 0;
        runtime.vy = 0;
        runtime.anim = "idle";
        play.onFrame?.(input);
      } else {
        const running = input.held.run;
        const maxSpeed = running ? 168 : 102;
        const step = 820 * dt;
        runtime.vx = approach(runtime.vx, input.axes.x * maxSpeed, step);
        runtime.vy = approach(runtime.vy, input.axes.y * maxSpeed, step);
        const nextX = runtime.x + runtime.vx * dt;
        const nextY = runtime.y + runtime.vy * dt;
        if (!play.blocked(nextX, runtime.y)) runtime.x = nextX;
        else runtime.vx = 0;
        if (!play.blocked(runtime.x, nextY)) runtime.y = nextY;
        else runtime.vy = 0;
        clampRuntime();
        const speed = Math.hypot(runtime.vx, runtime.vy);
        if (speed > 10) {
          runtime.direction =
            Math.abs(runtime.vx) > Math.abs(runtime.vy)
              ? runtime.vx > 0
                ? "right"
                : "left"
              : runtime.vy > 0
                ? "up"
                : "down";
        }
        runtime.anim = speed < 12 ? "idle" : running ? "run" : "walk";
        if (input.pressed.confirm) play.onInteract?.();
        state.saved += dt;
        if (input.pressed.menu || state.saved > 1.2) {
          const slot = useSave.getState().slot;
          if (slot) {
            useSave.getState().write({
              ...slot,
              x: runtime.x,
              y: runtime.y,
              direction: runtime.direction,
            });
          }
          state.saved = 0;
          if (input.pressed.menu) {
            playSfx("cancel");
            useSession.getState().setScreen("title");
            return;
          }
        }
      }
      anim = runtime.anim;
      direction = runtime.direction;
      x = runtime.x;
      y = runtime.y;
    } else if (mode === "demo") {
      state.demo += dt;
      if (state.demo > 0.9) {
        state.demo = 0;
        state.step = (state.step + 1) % DEMO_DIRS.length;
      }
      direction = DEMO_DIRS[state.step];
      anim = "walk";
    }

    const sheet = sheets.current[anim] ?? sheets.current.idle;
    if (!sheet) return;
    const cycle = catalog.animations[anim].cycle.filter((frame) => frame < sheet.columns);
    const frames = cycle.length > 0 ? cycle : [0];
    state.time += dt;
    const frameTime = 1 / catalog.animations[anim].fps;
    while (state.time >= frameTime) {
      state.time -= frameTime;
      state.index = (state.index + 1) % frames.length;
    }
    blitFrame(sheet, frames[state.index] ?? 0, DIR_ROW[direction], frameCanvas);
    texture.needsUpdate = true;
    if (mesh.current) {
      mesh.current.position.set(Math.round(x), Math.round(y + 32), mode === "play" ? -y * 0.001 : 1);
    }
  });

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh ref={mesh} position={[0, 32, 1]}>
      <planeGeometry args={[64, 64]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
