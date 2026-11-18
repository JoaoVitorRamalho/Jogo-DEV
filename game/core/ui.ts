"use client";

import { create } from "zustand";
import type { BattleConfig, Outcome } from "@/game/battle/engine";

export type Line = { speaker?: string; text: string };

export type DialogRequest = { lines: Line[]; index: number; resolve: () => void };
export type ChoiceRequest = { prompt?: Line; options: string[]; index: number; cancel: number | null; preview?: string; resolve: (index: number) => void };
export type BattleRequest = { config: BattleConfig; resolve: (outcome: Outcome) => void };
export type EvolutionRequest = { from: string; to: string; resolve: () => void };
export type DemoMon = { name: string; level: number; hp: number; max: number; status?: string };
export type DemoHud = { title: string; foe: DemoMon | null; mine: DemoMon | null };
export type Panel = null | "pause" | "party" | "bag" | "dex" | "quests" | "save" | "card" | "options";

type Ui = {
  lastLine: Line | null;
  dialog: DialogRequest | null;
  choice: ChoiceRequest | null;
  battle: BattleRequest | null;
  evolution: EvolutionRequest | null;
  demo: DemoHud | null;
  panel: Panel;
  toast: string | null;
  hint: string | null;
  fade: number;
  locked: number;
  setPanel: (panel: Panel) => void;
  setHint: (hint: string | null) => void;
  showToast: (text: string) => void;
};

export const useUi = create<Ui>((set) => ({
  lastLine: null,
  dialog: null,
  choice: null,
  battle: null,
  evolution: null,
  demo: null,
  panel: null,
  toast: null,
  hint: null,
  fade: 0,
  locked: 0,
  setPanel: (panel) => set({ panel }),
  setHint: (hint) => set({ hint }),
  showToast: (text) => {
    set({ toast: text });
    window.setTimeout(() => {
      if (useUi.getState().toast === text) set({ toast: null });
    }, 2200);
  },
}));

export function worldBusy(): boolean {
  const ui = useUi.getState();
  return Boolean(ui.dialog || ui.choice || ui.battle || ui.evolution || ui.demo || ui.panel || ui.locked > 0);
}

export function say(lines: Line[] | string, speaker?: string): Promise<void> {
  const list = typeof lines === "string" ? [{ speaker, text: lines }] : lines;
  if (list.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    useUi.setState({ dialog: { lines: list, index: 0, resolve } });
  });
}

export function ask(options: string[], prompt?: Line, cancel: number | null = null, preview?: string): Promise<number> {
  const context = prompt ?? useUi.getState().lastLine ?? undefined;
  return new Promise((resolve) => {
    useUi.setState({ choice: { options, index: 0, prompt: context, cancel, preview, resolve } });
  }).then((index) => {
    useUi.setState({ lastLine: null });
    return index as number;
  });
}

export function battle(config: BattleConfig): Promise<Outcome> {
  return new Promise((resolve) => {
    useUi.setState({ battle: { config, resolve } });
  });
}

export async function lock<T>(run: () => Promise<T>): Promise<T> {
  useUi.setState((state) => ({ locked: state.locked + 1 }));
  try {
    return await run();
  } finally {
    useUi.setState((state) => ({ locked: Math.max(0, state.locked - 1) }));
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Toca a cena de evolução (espécie de origem → destino) e resolve quando ela termina. */
export function playEvolution(from: string, to: string): Promise<void> {
  return new Promise((resolve) => {
    useUi.setState({ evolution: { from, to, resolve } });
  });
}
