import type { AnimName, Direction } from "@/lib/character/types";
import { bounds } from "@/lib/story/control";

export const WORLD_W = 1600;
export const WORLD_H = 1200;

export const runtime = {
  x: WORLD_W / 2,
  y: WORLD_H / 2,
  vx: 0,
  vy: 0,
  direction: "down" as Direction,
  anim: "idle" as AnimName,
};

export function placeRuntime(x: number, y: number, direction: Direction): void {
  runtime.x = x;
  runtime.y = y;
  runtime.vx = 0;
  runtime.vy = 0;
  runtime.direction = direction;
  runtime.anim = "idle";
}

export function clampRuntime(): void {
  runtime.x = Math.min(bounds.w - 20, Math.max(20, runtime.x));
  runtime.y = Math.min(bounds.h - 16, Math.max(16, runtime.y));
}
