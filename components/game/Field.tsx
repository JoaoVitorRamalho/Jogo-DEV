"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { NoToneMapping } from "three";
import type { OrthographicCamera } from "three";
import { Character } from "@/components/game/Character";
import type { Catalog } from "@/lib/character/types";
import { placeRuntime, runtime } from "@/lib/game/runtime";
import { useSave } from "@/lib/save/store";
import { doorBlocked, faceGate, moveTo, talkTo, wakeIfNeeded } from "@/lib/story/chapter";
import { bounds, play } from "@/lib/story/control";
import { useScene } from "@/lib/story/scene";
import { freshStory } from "@/lib/story/types";
import { MAPS, TILE, collides, drawMap, drawNpcTexture, npcsFor, portalAt, tileAt, tileCenter } from "@/lib/story/world";

function FollowCamera() {
  const { camera, size } = useThree();
  useFrame(() => {
    const cam = camera as OrthographicCamera;
    const zoom = Math.max(2, Math.min(4, Math.floor(size.height / 280)));
    if (cam.zoom !== zoom) {
      cam.zoom = zoom;
      cam.updateProjectionMatrix();
    }
    const x = Math.round(runtime.x);
    const y = Math.round(runtime.y + 36);
    cam.position.set(x, y, 100);
    cam.lookAt(x, y, 0);
  });
  return null;
}

function StoryScene({ mapId }: { mapId: keyof typeof MAPS }) {
  const chose = useSave((state) => state.slot?.story?.choseStarter ?? false);
  const tutorial = useSave((state) => state.slot?.story?.tutorialDone ?? false);
  const map = MAPS[mapId];
  const texture = useMemo(() => drawMap(map), [map]);
  const npcs = useMemo(
    () => npcsFor(useSave.getState().slot?.story ?? freshStory()),
    [mapId, chose, tutorial],
  );
  const portraits = useMemo(() => npcs.map((npc) => ({ npc, texture: drawNpcTexture(npc) })), [npcs]);

  useEffect(() => {
    bounds.w = map.cols * TILE;
    bounds.h = map.rows * TILE;
    play.blocked = (x, y) => collides(map, x, y, useSave.getState().slot?.story ?? freshStory());
    play.onInteract = () => {
      const current = useSave.getState().slot?.story ?? freshStory();
      const world = MAPS[current.map];
      const step = TILE * 0.9;
      const dx = runtime.direction === "left" ? -step : runtime.direction === "right" ? step : 0;
      const dy = runtime.direction === "up" ? step : runtime.direction === "down" ? -step : 0;
      const ahead = tileAt(world, runtime.x + dx, runtime.y + dy);
      if (ahead === "G" && !current.tutorialDone) {
        faceGate();
        return;
      }
      const near = npcsFor(current).find((npc) => {
        const dx = npc.x - runtime.x;
        const dy = npc.y - runtime.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 36) return true;
        if (dist > 64) return false;
        if (runtime.direction === "up") return dy > -8;
        if (runtime.direction === "down") return dy < 8;
        if (runtime.direction === "right") return dx > -8;
        return dx < 8;
      });
      if (near) talkTo(near.id);
    };
    return () => {
      play.onInteract = null;
    };
  }, [chose, map, tutorial]);

  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => portraits.forEach((entry) => entry.texture.dispose()), [portraits]);

  return (
    <>
      <mesh position={[map.cols * TILE * 0.5, map.rows * TILE * 0.5, -50]}>
        <planeGeometry args={[map.cols * TILE, map.rows * TILE]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {portraits.map(({ npc, texture: npcTexture }) => (
        <mesh key={npc.id} position={[npc.x, npc.y + 16, -npc.y * 0.001]}>
          <planeGeometry args={[32, 40]} />
          <meshBasicMaterial map={npcTexture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function Travel() {
  const cooling = useRef(0);
  useFrame((_, dt) => {
    cooling.current = Math.max(0, cooling.current - dt);
    play.doorLock = Math.max(0, play.doorLock - dt);
    const scene = useScene.getState();
    const busy = scene.lines.length > 0 || scene.choice !== null || scene.battle !== null;
    if (busy || cooling.current > 0 || play.doorLock > 0) return;
    const slot = useSave.getState().slot;
    const story = slot?.story;
    if (!story) return;
    const map = MAPS[story.map];
    const cell = tileAt(map, runtime.x, runtime.y);
    if (story.map === "house" && cell === "1" && !story.motherBlessing) {
      const back = tileCenter(7, 9, map.rows);
      placeRuntime(back.x, back.y, "up");
      cooling.current = 0.4;
      doorBlocked();
      return;
    }
    const portal = portalAt(map, runtime.x, runtime.y, story);
    if (!portal) return;
    cooling.current = 0.5;
    moveTo(portal.map, portal.col, portal.row, portal.direction);
  });
  return null;
}

export function Field({ catalog }: { catalog: Catalog }) {
  const appearance = useSave((state) => state.slot?.appearance ?? null);
  const mapId = useSave((state) => state.slot?.story?.map ?? "house");

  useEffect(() => {
    const slot = useSave.getState().slot;
    if (!slot) return;
    if (!slot.story) {
      const story = freshStory();
      const spot = tileCenter(7, 9, MAPS.house.rows);
      useSave.getState().write({ ...slot, story, x: spot.x, y: spot.y, direction: "up" });
      placeRuntime(spot.x, spot.y, "up");
    } else {
      const map = MAPS[slot.story.map];
      bounds.w = map.cols * TILE;
      bounds.h = map.rows * TILE;
      placeRuntime(slot.x, slot.y, slot.direction);
    }
    wakeIfNeeded();
  }, []);

  if (!appearance) return null;
  return (
    <div className="stage">
      <Canvas
        orthographic
        dpr={1}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [200, 200, 100], zoom: 3, near: 0.1, far: 400 }}
        onCreated={({ gl }) => {
          gl.toneMapping = NoToneMapping;
        }}
      >
        <color attach="background" args={["#17351c"]} />
        <StoryScene mapId={mapId} />
        <Character catalog={catalog} appearance={appearance} mode="play" />
        <FollowCamera />
        <Travel />
      </Canvas>
    </div>
  );
}
