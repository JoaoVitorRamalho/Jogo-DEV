import type { GameState } from "@/game/state/store";

export type StorageResult = "ok" | "invalid" | "party_full" | "last_mon" | "last_healthy";

function valid(index: number, length: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < length;
}

export function withdrawMon(state: GameState, boxIndex: number): StorageResult {
  if (!valid(boxIndex, state.box.length)) return "invalid";
  if (state.party.length >= 6) return "party_full";
  state.party.push(state.box.splice(boxIndex, 1)[0]);
  return "ok";
}

export function depositMon(state: GameState, partyIndex: number): StorageResult {
  if (!valid(partyIndex, state.party.length)) return "invalid";
  if (state.party.length <= 1) return "last_mon";
  if (!state.party.some((mon, index) => index !== partyIndex && mon.hp > 0)) return "last_healthy";
  state.box.push(state.party.splice(partyIndex, 1)[0]);
  return "ok";
}

export function exchangeMon(state: GameState, partyIndex: number, boxIndex: number): StorageResult {
  if (!valid(partyIndex, state.party.length) || !valid(boxIndex, state.box.length)) return "invalid";
  if (state.box[boxIndex].hp <= 0 && !state.party.some((mon, index) => index !== partyIndex && mon.hp > 0)) return "last_healthy";
  [state.party[partyIndex], state.box[boxIndex]] = [state.box[boxIndex], state.party[partyIndex]];
  return "ok";
}
