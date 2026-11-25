import { ITEMS } from "@/data/items";
import { MOVES } from "@/data/pokemon/moves";
import { SPECIES } from "@/data/pokemon/species";
import { migrateAppearance } from "@/game/character/appearance";
import { MAP_KEYS } from "@/game/phaser/constants";
import type { GameState } from "@/game/state/store";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function amount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validMon(value: unknown): boolean {
  if (!object(value) || typeof value.uid !== "string" || typeof value.species !== "string" || !Object.hasOwn(SPECIES, value.species)) return false;
  if (!amount(value.level) || value.level < 1 || value.level > 100 || !amount(value.exp) || !amount(value.hp) || !amount(value.sleepTurns)) return false;
  if (value.status !== null && !["burn", "poison", "paralysis", "sleep", "freeze"].includes(value.status as string)) return false;
  const ivs = value.ivs;
  if (!object(ivs) || !["hp", "atk", "def", "spa", "spd", "spe"].every((key) => amount(ivs[key]) && Number(ivs[key]) <= 31)) return false;
  return Array.isArray(value.moves) && value.moves.length <= 4 && value.moves.every((slot) => object(slot) && typeof slot.id === "string" && Object.hasOwn(MOVES, slot.id) && amount(slot.pp));
}

/** Aceita a exportação do menu e o registro original jornada-save do navegador. */
export function parseSaveFile(text: string): GameState {
  const payload: unknown = JSON.parse(text);
  if (!object(payload) || payload.version !== 2 || !object(payload.state) || !object(payload.state.slot)) {
    throw new Error("Este arquivo não é um save compatível da Jornada.");
  }
  const slot = payload.state.slot;
  if (
    typeof slot.map !== "string" || !MAP_KEYS.some((map) => map === slot.map) || !amount(slot.x) || !amount(slot.y) ||
    !["up", "down", "left", "right"].includes(slot.dir as string) || !object(slot.appearance) ||
    !object(slot.flags) || !Object.values(slot.flags).every((flag) => typeof flag === "boolean") ||
    !Array.isArray(slot.party) || slot.party.length > 6 || !slot.party.every(validMon) ||
    !Array.isArray(slot.box) || !slot.box.every(validMon) ||
    !object(slot.bag) || !Object.entries(slot.bag).every(([id, count]) => Object.hasOwn(ITEMS, id) && amount(count)) ||
    !amount(slot.money) || !amount(slot.playTime) || !amount(slot.savedAt) || !strings(slot.badges) ||
    !object(slot.dex) || !strings(slot.dex.seen) || !strings(slot.dex.caught) ||
    !(slot.starter === null || typeof slot.starter === "string") || !(slot.rivalStarter === null || typeof slot.rivalStarter === "string")
  ) throw new Error("O arquivo está incompleto ou contém dados inválidos. O save atual foi preservado.");
  return { ...slot, appearance: migrateAppearance(slot.appearance) } as GameState;
}

export function serializeSave(state: GameState): string {
  return JSON.stringify({ state: { slot: state }, version: 2 }, null, 2);
}
