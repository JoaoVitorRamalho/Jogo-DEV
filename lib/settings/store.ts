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

/** Velocidade das falas: multiplica as letras por segundo de cada caixa de texto. */
export const TEXT_SPEEDS = [
  { label: "Lento", factor: 0.6 },
  { label: "Normal", factor: 1 },
  { label: "Rápido", factor: 1.9 },
  { label: "Instantâneo", factor: 1000 },
] as const;

type Settings = {
  keyboard: KeyboardMap;
  pad: PadMap;
  deadzone: number;
  master: number;
  music: number;
  sfx: number;
  brightness: number;
  trackId: string;
  textSpeed: number;
  follower: boolean;
  setKeyboard: (keyboard: KeyboardMap) => void;
  setPad: (pad: PadMap) => void;
  setDeadzone: (deadzone: number) => void;
  setMaster: (master: number) => void;
  setMusic: (music: number) => void;
  setSfx: (sfx: number) => void;
  setBrightness: (brightness: number) => void;
  setTrackId: (trackId: string) => void;
  setTextSpeed: (textSpeed: number) => void;
  setFollower: (follower: boolean) => void;
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
      textSpeed: 1,
      follower: true,
      setKeyboard: (keyboard) => set({ keyboard }),
      setPad: (pad) => set({ pad }),
      setDeadzone: (deadzone) => set({ deadzone: clamp(deadzone, 0.05, 0.5) }),
      setMaster: (master) => set({ master: clamp(master, 0, 1) }),
      setMusic: (music) => set({ music: clamp(music, 0, 1) }),
      setSfx: (sfx) => set({ sfx: clamp(sfx, 0, 1) }),
      setBrightness: (brightness) => set({ brightness: clamp(brightness, 0.4, 1.4) }),
      setTrackId: (trackId) => set({ trackId }),
      setTextSpeed: (textSpeed) => set({ textSpeed: clamp(Math.round(textSpeed), 0, TEXT_SPEEDS.length - 1) }),
      setFollower: (follower) => set({ follower }),
      resetControls: () =>
        set({
          keyboard: DEFAULT_KEYBOARD,
          pad: DEFAULT_PAD,
          deadzone: DEFAULT_DEADZONE,
        }),
    }),
    {
      name: "jornada-settings",
      version: 1,
      migrate: (persisted) => {
        const settings = persisted as Partial<Settings>;
        const keys = settings.keyboard;
        // Atualiza o padrão antigo também em instalações que já salvaram opções.
        if (keys?.run[0] === "ShiftLeft" && keys.run[1] === "ShiftRight") {
          return { ...settings, keyboard: { ...keys, run: DEFAULT_KEYBOARD.run } };
        }
        return settings;
      },
    },
  ),
);
