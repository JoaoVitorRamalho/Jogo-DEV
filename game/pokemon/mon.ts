import { type StatusId, move } from "@/data/pokemon/moves";
import { type Growth, type Stats, species } from "@/data/pokemon/species";
import { type Rng, randInt } from "@/game/core/rng";

export type MoveSlot = { id: string; pp: number };

export type Mon = {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  exp: number;
  ivs: Stats;
  hp: number;
  status: StatusId | null;
  sleepTurns: number;
  moves: MoveSlot[];
  ball?: string;
  metAt?: string;
};

export const MAX_LEVEL = 100;

export function expForLevel(growth: Growth, level: number): number {
  const n = Math.max(1, Math.min(MAX_LEVEL, level));
  if (n === 1) return 0;
  switch (growth) {
    case "fast":
      return Math.floor((4 * n ** 3) / 5);
    case "medium_fast":
      return n ** 3;
    case "medium_slow":
      return Math.max(0, Math.floor((6 / 5) * n ** 3 - 15 * n ** 2 + 100 * n - 140));
    case "slow":
      return Math.floor((5 * n ** 3) / 4);
  }
}

export function statsOf(mon: Pick<Mon, "species" | "level" | "ivs">): Stats {
  const base = species(mon.species).base;
  const calc = (b: number, iv: number) => Math.floor(((2 * b + iv) * mon.level) / 100) + 5;
  return {
    hp: Math.floor(((2 * base.hp + mon.ivs.hp) * mon.level) / 100) + mon.level + 10,
    atk: calc(base.atk, mon.ivs.atk),
    def: calc(base.def, mon.ivs.def),
    spa: calc(base.spa, mon.ivs.spa),
    spd: calc(base.spd, mon.ivs.spd),
    spe: calc(base.spe, mon.ivs.spe),
  };
}

export function maxHp(mon: Mon): number {
  return statsOf(mon).hp;
}

export function displayName(mon: Mon): string {
  return mon.nickname || species(mon.species).name;
}

export function movesAtLevel(speciesId: string, level: number): string[] {
  const learned: string[] = [];
  for (const [at, id] of species(speciesId).learnset) {
    if (at > level) continue;
    const index = learned.indexOf(id);
    if (index >= 0) learned.splice(index, 1);
    learned.push(id);
  }
  return learned.slice(-4);
}

let counter = 0;

export function newUid(rng: Rng): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`;
}

export function createMon(speciesId: string, level: number, rng: Rng, options: { perfect?: boolean; metAt?: string } = {}): Mon {
  const def = species(speciesId);
  const iv = () => (options.perfect ? 31 : randInt(rng, 0, 31));
  const mon: Mon = {
    uid: newUid(rng),
    species: def.id,
    level,
    exp: expForLevel(def.growth, level),
    ivs: { hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv() },
    hp: 1,
    status: null,
    sleepTurns: 0,
    moves: movesAtLevel(def.id, level).map((id) => ({ id, pp: move(id).pp })),
    metAt: options.metAt,
  };
  mon.hp = maxHp(mon);
  return mon;
}

export function healFully(mon: Mon): void {
  mon.hp = maxHp(mon);
  mon.status = null;
  mon.sleepTurns = 0;
  for (const slot of mon.moves) slot.pp = move(slot.id).pp;
}

export type LevelResult = { level: number; learned: string[]; pending: string[] };

export function grantLevel(mon: Mon): LevelResult | null {
  if (mon.level >= MAX_LEVEL) return null;
  const need = expForLevel(species(mon.species).growth, mon.level + 1) - mon.exp;
  return addExp(mon, Math.max(1, need))[0] ?? null;
}

export function addExp(mon: Mon, amount: number): LevelResult[] {
  const def = species(mon.species);
  const results: LevelResult[] = [];
  mon.exp += amount;
  while (mon.level < MAX_LEVEL && mon.exp >= expForLevel(def.growth, mon.level + 1)) {
    const before = maxHp(mon);
    mon.level += 1;
    const after = maxHp(mon);
    if (mon.hp > 0) mon.hp = Math.min(after, mon.hp + (after - before));
    const result: LevelResult = { level: mon.level, learned: [], pending: [] };
    for (const [at, id] of species(mon.species).learnset) {
      if (at !== mon.level || mon.moves.some((slot) => slot.id === id)) continue;
      if (mon.moves.length < 4) {
        mon.moves.push({ id, pp: move(id).pp });
        result.learned.push(id);
      } else {
        result.pending.push(id);
      }
    }
    results.push(result);
  }
  return results;
}

export function learnMove(mon: Mon, moveId: string, replaceIndex: number | null): boolean {
  if (mon.moves.some((slot) => slot.id === moveId)) return false;
  if (replaceIndex === null) {
    if (mon.moves.length >= 4) return false;
    mon.moves.push({ id: moveId, pp: move(moveId).pp });
    return true;
  }
  if (replaceIndex < 0 || replaceIndex >= mon.moves.length) return false;
  mon.moves[replaceIndex] = { id: moveId, pp: move(moveId).pp };
  return true;
}

export function pendingEvolution(mon: Mon): string | null {
  const evolution = species(mon.species).evolution;
  if (!evolution || mon.level < evolution.level || mon.hp <= 0) return null;
  return evolution.into;
}

export function evolve(mon: Mon, into: string): void {
  const ratio = mon.hp / maxHp(mon);
  mon.species = into;
  mon.hp = Math.max(1, Math.round(maxHp(mon) * ratio));
}

export function expYield(foe: Mon, trainer: boolean): number {
  const base = species(foe.species).baseExp;
  return Math.max(1, Math.floor(((base * foe.level) / 7) * (trainer ? 1.5 : 1)));
}

export function expProgress(mon: Mon): number {
  const growth = species(mon.species).growth;
  const start = expForLevel(growth, mon.level);
  const next = expForLevel(growth, mon.level + 1);
  if (next <= start) return 1;
  return Math.max(0, Math.min(1, (mon.exp - start) / (next - start)));
}
