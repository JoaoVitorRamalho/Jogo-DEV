"use client";

import { useSettings } from "@/lib/settings/store";

export const TRACKS = [
  { id: "title", label: "Tema de abertura" },
  { id: "town", label: "Cidade" },
  { id: "dungeon", label: "Masmorra" },
  { id: "streets", label: "Ruas" },
  { id: "battle", label: "Batalha" },
] as const;

let audio: HTMLAudioElement | null = null;
let context: AudioContext | null = null;
let unlocked = false;
let currentTrack = "";

function volume(): number {
  const { master, music } = useSettings.getState();
  return Math.min(1, Math.max(0, master * music));
}

function sync(): void {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
  }
  const { trackId } = useSettings.getState();
  audio.volume = volume();
  if (currentTrack !== trackId) {
    currentTrack = trackId;
    audio.src = `/music/${trackId}.ogg`;
    if (unlocked) void audio.play().catch(() => undefined);
  } else if (unlocked && audio.paused) {
    void audio.play().catch(() => undefined);
  }
}

if (typeof window !== "undefined") {
  useSettings.subscribe(() => sync());
}

export function unlockAudio(): void {
  unlocked = true;
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  sync();
}

export function playSfx(kind: "confirm" | "cancel"): void {
  const { master, sfx } = useSettings.getState();
  const level = master * sfx;
  if (level <= 0) return;
  if (!context) context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(kind === "confirm" ? 520 : 196, now);
  if (kind === "confirm") oscillator.frequency.linearRampToValueAtTime(780, now + 0.08);
  gain.gain.setValueAtTime(0.045 * level, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.13);
}
