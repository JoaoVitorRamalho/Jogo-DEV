"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_DEADZONE,
  DEFAULT_KEYBOARD,
  DEFAULT_PAD,
  type KeyboardMap,
  type PadMap,
} from "@/lib/input/types";

type Settings = {
  keyboard: KeyboardMap;
  pad: PadMap;
  deadzone: number;
  master: number;
  music: number;
  sfx: number;
  brightness: number;
  trackId: string;
  setKeyboard: (keyboard: KeyboardMap) => void;
  setPad: (pad: PadMap) => void;
  setDeadzone: (deadzone: number) => void;
  setMaster: (master: number) => void;
  setMusic: (music: number) => void;
  setSfx: (sfx: number) => void;
  setBrightness: (brightness: number) => void;
  setTrackId: (trackId: string) => void;
  resetControls: () => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      keyboard: DEFAULT_KEYBOARD,
      pad: DEFAULT_PAD,
      deadzone: DEFAULT_DEADZONE,
      master: 0.8,
      music: 0.7,
      sfx: 0.8,
      brightness: 1,
      trackId: "auto",
      setKeyboard: (keyboard) => set({ keyboard }),
      setPad: (pad) => set({ pad }),
      setDeadzone: (deadzone) => set({ deadzone: clamp(deadzone, 0.05, 0.5) }),
      setMaster: (master) => set({ master: clamp(master, 0, 1) }),
      setMusic: (music) => set({ music: clamp(music, 0, 1) }),
      setSfx: (sfx) => set({ sfx: clamp(sfx, 0, 1) }),
      setBrightness: (brightness) => set({ brightness: clamp(brightness, 0.4, 1.4) }),
      setTrackId: (trackId) => set({ trackId }),
      resetControls: () =>
        set({
          keyboard: DEFAULT_KEYBOARD,
          pad: DEFAULT_PAD,
          deadzone: DEFAULT_DEADZONE,
        }),
    }),
    { name: "jornada-settings" },
  ),
);
