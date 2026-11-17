"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ItemId } from "@/data/items";
import { type Appearance, type Direction, migrateAppearance } from "@/game/character/appearance";
import { defaultRng } from "@/game/core/rng";
import { type Mon, createMon, healFully } from "@/game/pokemon/mon";

export type GameState = {
  appearance: Appearance;
  map: string;
  x: number;
  y: number;
  dir: Direction;
  flags: Record<string, boolean>;
  party: Mon[];
  box: Mon[];
  bag: Partial<Record<ItemId, number>>;
  money: number;
  dex: { seen: string[]; caught: string[] };
  badges: string[];
  starter: string | null;
  rivalStarter: string | null;
  playTime: number;
  savedAt: number;
};

export const START = { map: "house_2f", x: 3, y: 4, dir: "down" as Direction };

export function freshState(appearance: Appearance): GameState {
  return {
    appearance,
    map: START.map,
    x: START.x,
    y: START.y,
    dir: START.dir,
    flags: {},
    party: [],
    box: [],
    bag: {},
    money: 300,
    dex: { seen: [], caught: [] },
    badges: [],
    starter: null,
    rivalStarter: null,
    playTime: 0,
    savedAt: 0,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type Store = {
  slot: GameState | null;
  live: GameState | null;
  newGame: (appearance: Appearance) => void;
  continueGame: () => boolean;
  save: () => void;
  update: (fn: (state: GameState) => void) => void;
  grantOnce: (flag: string, fn: (state: GameState) => void) => boolean;
  quit: () => void;
};

export const useGame = create<Store>()(
  persist(
    (set, get) => ({
      slot: null,
      live: null,
      newGame: (appearance) => {
        const state = freshState(appearance);
        state.savedAt = Date.now();
        set({ live: state, slot: clone(state) });
      },
      continueGame: () => {
        const slot = get().slot;
        if (!slot) return false;
        set({ live: clone(slot) });
        return true;
      },
      save: () => {
        const live = get().live;
        if (!live) return;
        const snapshot = clone(live);
        snapshot.savedAt = Date.now();
        set({ slot: snapshot, live: { ...live, savedAt: snapshot.savedAt } });
      },
      update: (fn) => {
        const live = get().live;
        if (!live) return;
        const next = clone(live);
        fn(next);
        set({ live: next });
      },
      grantOnce: (flag, fn) => {
        const live = get().live;
        if (!live || live.flags[flag]) return false;
        const next = clone(live);
        fn(next);
        next.flags[flag] = true;
        set({ live: next });
        return true;
      },
      quit: () => set({ live: null }),
    }),
    {
      name: "jornada-save",
      version: 2,
      partialize: (state) => ({ slot: state.slot }),
      migrate: (persisted, version) => {
        const data = (persisted ?? {}) as { slot?: Record<string, unknown> | null };
        if (version >= 2 || !data.slot) return { slot: (data.slot as GameState | null) ?? null };
        return { slot: migrateLegacy(data.slot) };
      },
    },
  ),
);

export function migrateLegacy(old: Record<string, unknown>): GameState {
  const appearance = migrateAppearance(old.appearance);
  const state = freshState(appearance);
  const story = (old.story ?? {}) as Record<string, unknown>;
  if (story.woke) state.flags.woke = true;
  if (story.motherBlessing) state.flags.talked_mother = true;
  if (story.choseStarter && typeof story.starter === "string") {
    state.flags.entered_lab = true;
    state.flags.got_starter = true;
    state.starter = story.starter;
    const mon = createMon(story.starter, 5, defaultRng, { metAt: "Vila Brisamar" });
    state.party.push(mon);
    state.dex.seen.push(story.starter);
    state.dex.caught.push(story.starter);
  }
  if (story.tutorialDone) {
    state.flags.rival_battle_done = true;
    state.flags.got_pokedex = true;
    state.bag.pokeball = 5;
    state.map = "brisamar";
    state.x = 26;
    state.y = 20;
  } else if (story.motherBlessing) {
    state.map = "house_1f";
    state.x = 6;
    state.y = 7;
    state.dir = "up";
  }
  if (story.routeSeen) state.flags.reached_route1 = true;
  return state;
}

export function live(): GameState {
  const state = useGame.getState().live;
  if (!state) throw new Error("Nenhum jogo em andamento.");
  return state;
}

export function giveItem(state: GameState, item: ItemId, count = 1): void {
  state.bag[item] = (state.bag[item] ?? 0) + count;
}

export function takeItem(state: GameState, item: ItemId, count = 1): boolean {
  const have = state.bag[item] ?? 0;
  if (have < count) return false;
  state.bag[item] = have - count;
  if (state.bag[item] === 0) delete state.bag[item];
  return true;
}

export function addMon(state: GameState, mon: Mon): "party" | "box" {
  markCaught(state, mon.species);
  if (state.party.length < 6) {
    state.party.push(mon);
    return "party";
  }
  state.box.push(mon);
  return "box";
}

export function markSeen(state: GameState, speciesId: string): void {
  if (!state.dex.seen.includes(speciesId)) state.dex.seen.push(speciesId);
}

export function markCaught(state: GameState, speciesId: string): void {
  markSeen(state, speciesId);
  if (!state.dex.caught.includes(speciesId)) state.dex.caught.push(speciesId);
}

export function healParty(state: GameState): void {
  for (const mon of state.party) healFully(mon);
}
