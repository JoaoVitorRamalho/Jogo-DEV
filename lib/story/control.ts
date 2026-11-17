import type { InputFrame } from "@/lib/input/types";

export const bounds = { w: 1600, h: 1200 };

export const play = {
  locked: false,
  doorLock: 0,
  blocked: (_x: number, _y: number) => false,
  onFrame: null as null | ((input: InputFrame) => void),
  onInteract: null as null | (() => void),
};
