"use client";

import { create } from "zustand";
import type { Line, StarterId } from "@/lib/story/types";

export type Choice = {
  title: string;
  options: { id: StarterId; label: string }[];
  index: number;
};

export type Battle = {
  rivalId: StarterId;
  playerHp: number;
  rivalHp: number;
};

type Scene = {
  lines: Line[];
  index: number;
  onDone: (() => void) | null;
  choice: Choice | null;
  battle: Battle | null;
  say: (lines: Line[], onDone?: () => void) => void;
  advance: () => void;
  setChoice: (choice: Choice | null) => void;
  setBattle: (battle: Battle | null) => void;
  moveChoice: (delta: number) => void;
  closeAll: () => void;
};

export const useScene = create<Scene>((set, get) => ({
  lines: [],
  index: 0,
  onDone: null,
  choice: null,
  battle: null,
  say: (lines, onDone) => set({ lines, index: 0, onDone: onDone ?? null, choice: null }),
  advance: () => {
    const { lines, index, onDone } = get();
    if (index < lines.length - 1) {
      set({ index: index + 1 });
      return;
    }
    set({ lines: [], index: 0, onDone: null });
    onDone?.();
  },
  setChoice: (choice) => set({ choice, lines: [], index: 0, onDone: null }),
  setBattle: (battle) => set({ battle }),
  moveChoice: (delta) => {
    const choice = get().choice;
    if (!choice) return;
    const count = choice.options.length;
    set({
      choice: {
        ...choice,
        index: (choice.index + delta + count) % count,
      },
    });
  },
  closeAll: () => set({ lines: [], index: 0, onDone: null, choice: null, battle: null }),
}));
