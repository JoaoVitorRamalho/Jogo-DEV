"use client";

import { useEffect, useRef } from "react";
import { type Appearance, appearanceKey } from "@/game/character/appearance";
import { FRAME_H, FRAME_W, renderSheet } from "@/game/character/compose";

const CYCLE = [0, 1, 0, 3];
const DIRECTIONS = [0, 3, 2, 1];

/** facing: 0 frente, 1 direita, 2 costas, 3 esquerda (linhas da folha). Sem facing, gira sozinho. */
export function CharacterPreview({
  appearance,
  scale = 5,
  walk = true,
  facing,
}: {
  appearance: Appearance;
  scale?: number;
  walk?: boolean;
  facing?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sheet = useRef<HTMLCanvasElement | null>(null);
  const key = appearanceKey(appearance);

  useEffect(() => {
    let alive = true;
    void renderSheet(appearance).then((result) => {
      if (alive) sheet.current = result;
    });
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const context = canvas.current?.getContext("2d");
      const source = sheet.current;
      if (context && source) {
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, FRAME_W * scale, FRAME_H * scale);
        const t = (now - start) / 1000;
        const row = facing !== undefined ? facing : walk ? DIRECTIONS[Math.floor(t / 2.4) % 4] : 0;
        const col = walk ? CYCLE[Math.floor(t * 6) % 4] : 0;
        context.drawImage(source, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W * scale, FRAME_H * scale);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [scale, walk, facing]);

  return <canvas ref={canvas} className="pixel char-preview" width={FRAME_W * scale} height={FRAME_H * scale} />;
}
