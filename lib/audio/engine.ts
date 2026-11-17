"use client";

import { useSettings } from "@/lib/settings/store";

export const TRACKS = [
  { id: "auto", label: "Automática (por área)" },
  { id: "title", label: "Tema de abertura" },
  { id: "town", label: "Cidade" },
  { id: "dungeon", label: "Masmorra" },
  { id: "streets", label: "Ruas" },
  { id: "battle", label: "Batalha" },
] as const;

export type Sfx =
  | "confirm"
  | "cancel"
  | "cursor"
  | "door"
  | "bump"
  | "battle"
  | "hit"
  | "super"
  | "weak"
  | "faint"
  | "ball"
  | "catch"
  | "victory"
  | "discover"
  | "levelup"
  | "heal"
  | "step";

let audio: HTMLAudioElement | null = null;
let context: AudioContext | null = null;
let unlocked = false;
let currentTrack = "";
let contextTrack = "title";

function volume(): number {
  const { master, music } = useSettings.getState();
  return Math.min(1, Math.max(0, master * music));
}

function wanted(): string {
  const { trackId } = useSettings.getState();
  return trackId === "auto" ? contextTrack : trackId;
}

function sync(): void {
  if (typeof window === "undefined") return;
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
  }
  audio.volume = volume();
  const track = wanted();
  if (currentTrack !== track) {
    currentTrack = track;
    audio.src = `/music/${track}.ogg`;
    if (unlocked) void audio.play().catch(() => undefined);
  } else if (unlocked && audio.paused) {
    void audio.play().catch(() => undefined);
  }
}

if (typeof window !== "undefined") {
  useSettings.subscribe(() => sync());
}

export function setContextTrack(track: string): void {
  contextTrack = track;
  sync();
}

export function getContextTrack(): string {
  return contextTrack;
}

export function unlockAudio(): void {
  unlocked = true;
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  sync();
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; slide?: number; gain?: number };

const PATTERNS: Record<Sfx, Note[]> = {
  confirm: [{ f: 520, t: 0, d: 0.08, slide: 780 }],
  cancel: [{ f: 260, t: 0, d: 0.1, slide: 180 }],
  cursor: [{ f: 880, t: 0, d: 0.03, gain: 0.5 }],
  door: [{ f: 140, t: 0, d: 0.12, type: "triangle" }, { f: 110, t: 0.08, d: 0.12, type: "triangle" }],
  bump: [{ f: 90, t: 0, d: 0.06, type: "triangle", gain: 0.8 }],
  battle: [
    { f: 392, t: 0, d: 0.08 },
    { f: 523, t: 0.08, d: 0.08 },
    { f: 659, t: 0.16, d: 0.08 },
    { f: 784, t: 0.24, d: 0.18 },
  ],
  hit: [{ f: 180, t: 0, d: 0.1, type: "sawtooth", slide: 60 }],
  super: [{ f: 240, t: 0, d: 0.06, type: "sawtooth", slide: 80 }, { f: 160, t: 0.06, d: 0.12, type: "sawtooth", slide: 40 }],
  weak: [{ f: 140, t: 0, d: 0.08, type: "triangle", slide: 90, gain: 0.7 }],
  faint: [{ f: 440, t: 0, d: 0.45, type: "triangle", slide: 80 }],
  ball: [{ f: 660, t: 0, d: 0.05 }, { f: 440, t: 0.18, d: 0.05 }],
  catch: [
    { f: 523, t: 0, d: 0.1 },
    { f: 659, t: 0.1, d: 0.1 },
    { f: 784, t: 0.2, d: 0.1 },
    { f: 1046, t: 0.3, d: 0.25 },
  ],
  victory: [
    { f: 523, t: 0, d: 0.12 },
    { f: 523, t: 0.13, d: 0.12 },
    { f: 523, t: 0.26, d: 0.12 },
    { f: 698, t: 0.4, d: 0.35 },
  ],
  discover: [{ f: 784, t: 0, d: 0.08 }, { f: 1175, t: 0.09, d: 0.2 }],
  levelup: [
    { f: 659, t: 0, d: 0.08 },
    { f: 784, t: 0.09, d: 0.08 },
    { f: 988, t: 0.18, d: 0.08 },
    { f: 1319, t: 0.27, d: 0.2 },
  ],
  heal: [
    { f: 784, t: 0, d: 0.1, type: "triangle" },
    { f: 988, t: 0.12, d: 0.1, type: "triangle" },
    { f: 1175, t: 0.24, d: 0.25, type: "triangle" },
  ],
  step: [{ f: 70, t: 0, d: 0.03, type: "triangle", gain: 0.25 }],
};

export function playSfx(kind: Sfx): void {
  if (typeof window === "undefined") return;
  const { master, sfx } = useSettings.getState();
  const level = master * sfx;
  if (level <= 0) return;
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  const start = context.currentTime;
  for (const note of PATTERNS[kind]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = start + note.t;
    oscillator.type = note.type ?? "square";
    oscillator.frequency.setValueAtTime(note.f, at);
    if (note.slide) oscillator.frequency.linearRampToValueAtTime(note.slide, at + note.d);
    gain.gain.setValueAtTime(0.045 * level * (note.gain ?? 1), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + note.d);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + note.d + 0.02);
  }
}
