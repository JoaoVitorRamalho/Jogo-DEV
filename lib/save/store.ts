"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appearance, Direction } from "@/lib/character/types";
import type { StoryState } from "@/lib/story/types";

export type SaveSlot = {
  appearance: Appearance;
  x: number;
  y: number;
  direction: Direction;
  story?: StoryState;
};

type SaveState = {
  slot: SaveSlot | null;
  write: (slot: SaveSlot) => void;
};

export const useSave = create<SaveState>()(
  persist(
    (set) => ({
      slot: null,
      write: (slot) => set({ slot }),
    }),
    { name: "jornada-save" },
  ),
);
