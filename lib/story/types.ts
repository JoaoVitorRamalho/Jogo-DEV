import type { Direction } from "@/lib/character/types";

export type MapId = "house" | "brisamar" | "lab" | "route";

export type StarterId = "torchic" | "bulbasaur" | "froakie";

export type StoryState = {
  map: MapId;
  woke: boolean;
  motherBlessing: boolean;
  choseStarter: boolean;
  starter: StarterId | null;
  tutorialDone: boolean;
  routeSeen: boolean;
};

export type Line = {
  speaker: string;
  text: string;
};

export type Spawn = {
  map: MapId;
  col: number;
  row: number;
  direction: Direction;
};

export const STARTERS: Record<
  StarterId,
  { name: string; kind: string; move: string; tint: string }
> = {
  torchic: { name: "Torchic", kind: "Fogo", move: "Brasa", tint: "#e25822" },
  bulbasaur: { name: "Bulbasaur", kind: "Planta", move: "Chicote de Vinha", tint: "#5b9a4a" },
  froakie: { name: "Froakie", kind: "Água", move: "Bolha", tint: "#4aa3d8" },
};

export function rivalOf(starter: StarterId): StarterId {
  if (starter === "torchic") return "froakie";
  if (starter === "bulbasaur") return "torchic";
  return "bulbasaur";
}

export function advantageLine(starter: StarterId): string {
  if (starter === "torchic") return "Água contra fogo. Ele deixou você ver a diferença.";
  if (starter === "bulbasaur") return "Planta contra fogo. O seu aguentou o calor.";
  return "Água contra planta. Froakie não recuou.";
}

export function freshStory(): StoryState {
  return {
    map: "house",
    woke: false,
    motherBlessing: false,
    choseStarter: false,
    starter: null,
    tutorialDone: false,
    routeSeen: false,
  };
}
