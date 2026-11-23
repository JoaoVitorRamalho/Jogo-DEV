"use client";

import { heightMeters } from "@/data/pokemon/heights";
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
  | "encounter"
  | "spotted"
  | "swoosh"
  | "hit"
  | "super"
  | "weak"
  | "faint"
  | "ball"
  | "shake"
  | "pop"
  | "catch"
  | "victory"
  | "discover"
  | "levelup"
  | "statUp"
  | "statDown"
  | "flee"
  | "heal"
  | "step";

// ---------------------------------------------------------------- música

let audio: HTMLAudioElement | null = null;
let context: AudioContext | null = null;
let unlocked = false;
let currentTrack = "";
let contextTrack = "title";
let ducked = false;
let fader: number | null = null;
/** Onde cada faixa parou: depois da batalha a música da rota continua de onde estava. */
const resumeAt = new Map<string, number>();

function musicVolume(): number {
  if (ducked) return 0;
  const { master, music } = useSettings.getState();
  return Math.min(1, Math.max(0, master * music));
}

function wanted(): string {
  const { trackId } = useSettings.getState();
  return trackId === "auto" ? contextTrack : trackId;
}

/** Leva o volume da música até `target` em `ms` (o HTMLAudio não tem rampa própria). */
function ramp(target: number, ms: number, done?: () => void): void {
  const el = audio;
  if (!el) return;
  if (fader !== null) window.clearInterval(fader);
  fader = null;
  const from = el.volume;
  if (ms <= 0 || Math.abs(from - target) < 0.005) {
    el.volume = target;
    done?.();
    return;
  }
  const start = performance.now();
  fader = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - start) / ms);
    el.volume = Math.min(1, Math.max(0, from + (target - from) * k));
    if (k < 1) return;
    if (fader !== null) window.clearInterval(fader);
    fader = null;
    done?.();
  }, 25);
}

function sync(): void {
  if (typeof window === "undefined") return;
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
  }
  const el = audio;
  const track = wanted();
  if (currentTrack !== track) {
    // A batalha entra seca, junto do susto; o resto troca com fade.
    const quick = track === "battle";
    const leaving = currentTrack;
    const swap = () => {
      if (leaving && leaving !== "battle" && Number.isFinite(el.currentTime)) resumeAt.set(leaving, el.currentTime);
      el.src = `/music/${track}.ogg`;
      el.volume = 0;
      const from = track === "battle" ? 0 : resumeAt.get(track) ?? 0;
      if (from > 0) el.addEventListener("loadedmetadata", () => (el.currentTime = from), { once: true });
      if (unlocked) void el.play().catch(() => undefined);
      ramp(musicVolume(), quick ? 120 : 700);
    };
    const audible = leaving !== "" && unlocked && !el.paused && el.volume > 0.01;
    currentTrack = track;
    if (audible) ramp(0, quick ? 70 : 320, swap);
    else swap();
    return;
  }
  if (fader === null) el.volume = musicVolume();
  if (unlocked && el.paused) void el.play().catch(() => undefined);
}

if (typeof window !== "undefined") {
  useSettings.subscribe(() => sync());
}

export function setContextTrack(track: string): void {
  if (track !== contextTrack) ducked = false;
  contextTrack = track;
  sync();
}

export function getContextTrack(): string {
  return contextTrack;
}

/** Abaixa a música até sumir (a fanfarra toca por cima). Volta sozinha quando a faixa troca. */
export function duckMusic(ms = 300): void {
  ducked = true;
  ramp(0, ms);
}

export function unlockAudio(): void {
  unlocked = true;
  ctx();
  sync();
}

// ---------------------------------------------------------------- sintetizador

/** Onda quadrada (pulso 50%), pulsos finos de console antigo, serra, triângulo e seno. */
type Wave = OscillatorType | "pulse25" | "pulse12";
type Tone = { f: number; t: number; d: number; wave?: Wave; to?: number; gain?: number; vib?: [rate: number, depth: number]; hold?: boolean };
type Hiss = { noise: [from: number, to?: number]; t: number; d: number; gain?: number; q?: number; filter?: BiquadFilterType; hold?: boolean };
type Note = Tone | Hiss;

const TONE = 0.075;
const NOISE = 0.5;

let bus: GainNode | null = null;
let hiss: AudioBuffer | null = null;
const pulses = new Map<number, PeriodicWave>();

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function sfxLevel(): number {
  const { master, sfx } = useSettings.getState();
  return Math.min(1, Math.max(0, master * sfx));
}

/** Tudo passa por um compressor: dá para ter golpe forte sem estourar o alto-falante. */
function output(c: AudioContext): AudioNode {
  if (bus) return bus;
  const squeeze = c.createDynamicsCompressor();
  squeeze.threshold.value = -16;
  squeeze.knee.value = 12;
  squeeze.ratio.value = 4;
  squeeze.attack.value = 0.002;
  squeeze.release.value = 0.2;
  squeeze.connect(c.destination);
  bus = c.createGain();
  bus.connect(squeeze);
  return bus;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (hiss) return hiss;
  hiss = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = hiss.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return hiss;
}

/** Pulso com largura `duty` (0,25 e 0,125 soam como os canais de som dos portáteis antigos). */
function pulse(c: AudioContext, duty: number): PeriodicWave {
  const cached = pulses.get(duty);
  if (cached) return cached;
  const size = 48;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  for (let k = 1; k < size; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    imag[k] = (2 * Math.sin(Math.PI * k * duty) ** 2) / (Math.PI * k);
  }
  const wave = c.createPeriodicWave(real, imag);
  pulses.set(duty, wave);
  return wave;
}

function setWave(c: AudioContext, osc: OscillatorNode, wave: Wave): void {
  if (wave === "pulse25") osc.setPeriodicWave(pulse(c, 0.25));
  else if (wave === "pulse12") osc.setPeriodicWave(pulse(c, 0.125));
  else osc.type = wave;
}

/** Ataque curto e queda exponencial; `hold` segura a nota (melodia) antes de soltar. */
function shape(param: AudioParam, at: number, d: number, peak: number, hold = false): void {
  const top = Math.max(0.0002, peak);
  param.setValueAtTime(0.0001, at);
  param.exponentialRampToValueAtTime(top, at + Math.min(0.006, d / 4));
  if (hold) param.setValueAtTime(top * 0.8, at + d * 0.7);
  param.exponentialRampToValueAtTime(0.0001, at + d);
}

function tone(c: AudioContext, out: AudioNode, note: Tone, at: number, level: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  setWave(c, osc, note.wave ?? "square");
  osc.frequency.setValueAtTime(note.f, at);
  if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, at + note.d);
  if (note.vib) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = note.vib[0];
    depth.gain.value = note.f * note.vib[1];
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(at);
    lfo.stop(at + note.d + 0.05);
  }
  shape(gain.gain, at, note.d, TONE * level * (note.gain ?? 1), note.hold);
  osc.connect(gain);
  gain.connect(out);
  osc.start(at);
  osc.stop(at + note.d + 0.03);
}

function noise(c: AudioContext, out: AudioNode, note: Hiss, at: number, level: number): void {
  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  source.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = note.filter ?? "bandpass";
  filter.Q.value = note.q ?? 1;
  filter.frequency.setValueAtTime(note.noise[0], at);
  if (note.noise[1]) filter.frequency.exponentialRampToValueAtTime(note.noise[1], at + note.d);
  const gain = c.createGain();
  shape(gain.gain, at, note.d, NOISE * level * (note.gain ?? 1), note.hold);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  source.start(at, Math.random() * 0.5);
  source.stop(at + note.d + 0.03);
}

function schedule(notes: Note[], volume = 1): void {
  const c = ctx();
  if (!c) return;
  const level = sfxLevel() * volume;
  if (level <= 0) return;
  const out = output(c);
  const start = c.currentTime + 0.005;
  for (const note of notes) {
    if ("noise" in note) noise(c, out, note, start + note.t, level);
    else tone(c, out, note, start + note.t, level);
  }
}

const PATTERNS: Record<Sfx, Note[]> = {
  confirm: [{ f: 660, t: 0, d: 0.07, wave: "pulse25", to: 990 }],
  cancel: [{ f: 330, t: 0, d: 0.09, wave: "pulse25", to: 220 }],
  cursor: [{ f: 1320, t: 0, d: 0.03, wave: "pulse12", gain: 0.45 }],
  door: [
    { noise: [900, 260], t: 0, d: 0.18, gain: 0.45, filter: "lowpass" },
    { f: 140, t: 0, d: 0.12, wave: "triangle" },
    { f: 110, t: 0.08, d: 0.14, wave: "triangle" },
  ],
  bump: [
    { f: 90, t: 0, d: 0.07, wave: "triangle", gain: 0.9 },
    { noise: [420], t: 0, d: 0.05, gain: 0.3, filter: "lowpass" },
  ],
  battle: [
    { f: 392, t: 0, d: 0.08, wave: "pulse25" },
    { f: 523, t: 0.08, d: 0.08, wave: "pulse25" },
    { f: 659, t: 0.16, d: 0.08, wave: "pulse25" },
    { f: 784, t: 0.24, d: 0.18, wave: "pulse25" },
  ],
  // Entrada de batalha: um vento que sobe e um arpejo nervoso por cima.
  encounter: [
    { noise: [300, 4200], t: 0, d: 0.55, gain: 0.55, q: 0.8 },
    { f: 196, t: 0, d: 0.12, wave: "sawtooth", gain: 0.7 },
    { f: 262, t: 0.09, d: 0.11, wave: "pulse25" },
    { f: 392, t: 0.18, d: 0.11, wave: "pulse25" },
    { f: 523, t: 0.27, d: 0.11, wave: "pulse25" },
    { f: 784, t: 0.36, d: 0.36, wave: "pulse25", vib: [9, 0.02], hold: true },
    { f: 392, t: 0.36, d: 0.36, wave: "triangle", gain: 1.2, hold: true },
  ],
  // Um treinador te viu.
  spotted: [
    { f: 1047, t: 0, d: 0.07, wave: "pulse25" },
    { f: 1568, t: 0.08, d: 0.2, wave: "pulse25", vib: [12, 0.015] },
  ],
  swoosh: [{ noise: [600, 2800], t: 0, d: 0.17, gain: 0.55, q: 1.4 }],
  hit: [
    { noise: [2400, 180], t: 0, d: 0.16, gain: 0.95, filter: "lowpass" },
    { f: 170, t: 0, d: 0.1, wave: "sawtooth", to: 55, gain: 0.8 },
  ],
  super: [
    { noise: [3400, 140], t: 0, d: 0.26, gain: 1.15, filter: "lowpass" },
    { f: 240, t: 0, d: 0.08, wave: "sawtooth", to: 80 },
    { f: 160, t: 0.07, d: 0.18, wave: "sawtooth", to: 40 },
  ],
  weak: [
    { noise: [1200, 300], t: 0, d: 0.09, gain: 0.45, filter: "lowpass" },
    { f: 150, t: 0, d: 0.08, wave: "triangle", to: 100, gain: 0.7 },
  ],
  faint: [
    { f: 520, t: 0, d: 0.5, wave: "triangle", to: 70 },
    { noise: [500, 80], t: 0.2, d: 0.4, gain: 0.5, filter: "lowpass" },
  ],
  ball: [
    { f: 500, t: 0, d: 0.2, wave: "triangle", to: 1400, gain: 0.7 },
    { noise: [1500, 4200], t: 0, d: 0.2, gain: 0.22 },
  ],
  shake: [
    { noise: [1800], t: 0, d: 0.045, gain: 0.6, q: 3 },
    { f: 260, t: 0, d: 0.05, wave: "triangle" },
  ],
  pop: [
    { noise: [3000, 800], t: 0, d: 0.12, gain: 0.55 },
    { f: 880, t: 0, d: 0.08, wave: "pulse25", to: 1760 },
    { f: 1568, t: 0.07, d: 0.08, wave: "pulse12", gain: 0.6 },
    { f: 2093, t: 0.13, d: 0.12, wave: "pulse12", gain: 0.5 },
  ],
  catch: [
    { noise: [2000], t: 0, d: 0.04, gain: 0.5, q: 3 },
    { f: 523, t: 0.05, d: 0.1, wave: "pulse25" },
    { f: 659, t: 0.15, d: 0.1, wave: "pulse25" },
    { f: 784, t: 0.25, d: 0.1, wave: "pulse25" },
    { f: 1047, t: 0.35, d: 0.32, wave: "pulse25", vib: [7, 0.012], hold: true },
    { f: 523, t: 0.35, d: 0.32, wave: "triangle", gain: 1.2, hold: true },
  ],
  victory: [
    { f: 523, t: 0, d: 0.12, wave: "pulse25" },
    { f: 523, t: 0.13, d: 0.12, wave: "pulse25" },
    { f: 523, t: 0.26, d: 0.12, wave: "pulse25" },
    { f: 698, t: 0.4, d: 0.35, wave: "pulse25", hold: true },
  ],
  discover: [
    { f: 784, t: 0, d: 0.08, wave: "pulse25" },
    { f: 1175, t: 0.09, d: 0.2, wave: "pulse25" },
  ],
  levelup: [
    { f: 659, t: 0, d: 0.08, wave: "pulse25" },
    { f: 784, t: 0.09, d: 0.08, wave: "pulse25" },
    { f: 988, t: 0.18, d: 0.08, wave: "pulse25" },
    { f: 1319, t: 0.27, d: 0.22, wave: "pulse25", hold: true },
  ],
  statUp: [
    { f: 392, t: 0, d: 0.32, wave: "pulse25", to: 1568, vib: [14, 0.02] },
    { f: 784, t: 0.05, d: 0.3, wave: "pulse12", to: 2093, gain: 0.5 },
  ],
  statDown: [{ f: 1200, t: 0, d: 0.32, wave: "pulse25", to: 300, vib: [10, 0.02] }],
  flee: [
    { noise: [800, 2400], t: 0, d: 0.25, gain: 0.4 },
    { f: 660, t: 0, d: 0.06, wave: "triangle" },
    { f: 494, t: 0.07, d: 0.06, wave: "triangle" },
    { f: 392, t: 0.14, d: 0.1, wave: "triangle" },
  ],
  heal: [
    { f: 784, t: 0, d: 0.1, wave: "triangle" },
    { f: 988, t: 0.12, d: 0.1, wave: "triangle" },
    { f: 1175, t: 0.24, d: 0.25, wave: "triangle" },
  ],
  step: [{ f: 70, t: 0, d: 0.03, wave: "triangle", gain: 0.25 }],
};

export function playSfx(kind: Sfx): void {
  schedule(PATTERNS[kind]);
}

// Fanfarra de vitória: melodia própria em dó maior (arpejo, resposta e nota longa).
const BEAT = 0.12;
const FANFARE: Note[] = [
  ...(
    [
      [392, 0, 1], [523, 1, 1], [659, 2, 1], [784, 3, 2],
      [659, 5, 1], [784, 6, 1], [880, 7, 2],
      [784, 9, 1], [880, 10, 1], [988, 11, 1], [1047, 12, 6],
    ] as const
  ).map(([f, at, len]): Note => ({ f, t: at * BEAT, d: len * BEAT * 0.94, wave: "pulse25", gain: 0.85, hold: true, vib: len >= 4 ? [6, 0.012] : undefined })),
  ...(
    [[659, 12, 6], [784, 12, 6]] as const
  ).map(([f, at, len]): Note => ({ f, t: at * BEAT, d: len * BEAT * 0.94, wave: "pulse12", gain: 0.35, hold: true })),
  ...(
    [[131, 0, 3], [196, 3, 2], [175, 5, 2], [220, 7, 2], [196, 9, 3], [131, 12, 6]] as const
  ).map(([f, at, len]): Note => ({ f, t: at * BEAT, d: len * BEAT * 0.94, wave: "triangle", gain: 1.5, hold: true })),
  ...[0, 3, 5, 7, 9, 12].map((at): Note => ({ noise: [6000], t: at * BEAT, d: 0.04, gain: 0.18, filter: "highpass" })),
];

/** Venceu: a música da batalha some e entra a fanfarra. */
export function playVictory(): void {
  duckMusic(250);
  schedule(FANFARE);
}

// ---------------------------------------------------------------- gritos dos Pokémon

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seeded(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Voice = { at: number; d: number; from: number; to: number; wave: Wave; growl: number; ratio: number; vib: [number, number]; rough: number; bright: number };

/** Uma sílaba do grito: oscilador com FM (rosnado), vibrato e um sopro de ruído. */
function syllable(c: AudioContext, out: AudioNode, v: Voice, level: number): void {
  const osc = c.createOscillator();
  setWave(c, osc, v.wave);
  osc.frequency.setValueAtTime(v.from, v.at);
  osc.frequency.exponentialRampToValueAtTime(v.to, v.at + v.d);

  const mod = c.createOscillator();
  const modDepth = c.createGain();
  mod.frequency.setValueAtTime(v.from * v.ratio, v.at);
  mod.frequency.exponentialRampToValueAtTime(v.to * v.ratio, v.at + v.d);
  modDepth.gain.value = v.from * v.growl;
  mod.connect(modDepth);
  modDepth.connect(osc.frequency);

  const lfo = c.createOscillator();
  const lfoDepth = c.createGain();
  lfo.frequency.value = v.vib[0];
  lfoDepth.gain.value = v.from * v.vib[1];
  lfo.connect(lfoDepth);
  lfoDepth.connect(osc.frequency);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = v.bright;
  filter.Q.value = 2;
  const gain = c.createGain();
  shape(gain.gain, v.at, v.d, TONE * 1.5 * level, true);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(out);

  const end = v.at + v.d + 0.05;
  for (const node of [osc, mod, lfo]) {
    node.start(v.at);
    node.stop(end);
  }

  if (v.rough > 0.05) {
    noise(c, out, { noise: [v.from * 2, v.to * 2], t: 0, d: v.d, gain: v.rough * 0.5, q: 2.5, hold: true }, v.at, level);
  }
}

/**
 * Grito do Pokémon, gerado na hora: cada espécie tem o seu (a semente é o nome) e o
 * tamanho real decide o tom (o pequeno é agudo, o grande é grave e rouco).
 * `faint` toca a versão cansada, mais grave e arrastada, de quando ele desmaia.
 */
export function playCry(speciesId: string, options: { faint?: boolean } = {}): void {
  const c = ctx();
  if (!c) return;
  const level = sfxLevel();
  if (level <= 0) return;
  const out = output(c);
  const random = seeded(hash(speciesId));
  const size = Math.min(1, Math.log2(1 + heightMeters(speciesId)) / Math.log2(6));
  const faint = Boolean(options.faint);
  const waves: Wave[] = ["square", "sawtooth", "pulse25", "pulse12", "triangle"];
  const wave = waves[Math.floor(random() * waves.length)];
  const growl = (size * 0.5 + random() * 0.25) * (faint ? 0.6 : 1);
  const ratio = [0.5, 1, 1.5, 2, 3][Math.floor(random() * 5)];
  const vib: [number, number] = [5 + random() * 22, 0.01 + random() * 0.05];
  const rough = size * 0.55 + random() * 0.25;
  const bright = 1800 + (1 - size) * 4200 + random() * 1200;
  const syllables = 2 + Math.floor(random() * 3);
  const stretch = (1 + size * 0.6) * (faint ? 1.7 : 1);
  let pitch = 1250 * Math.pow(0.32, size) * (0.85 + random() * 0.3) * (faint ? 0.7 : 1);
  let at = c.currentTime + 0.01;
  for (let i = 0; i < syllables; i++) {
    const d = (0.07 + random() * 0.15) * stretch;
    const last = i === syllables - 1;
    const to = pitch * (0.6 + random() * 0.9) * (faint && last ? 0.5 : 1);
    syllable(c, out, { at, d, from: pitch, to, wave, growl, ratio, vib, rough, bright }, level);
    at += d * (0.72 + random() * 0.2);
    pitch = Math.min(2400, Math.max(90, to * (0.9 + random() * 0.5)));
  }
}
