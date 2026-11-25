import type { ItemId } from "@/data/items";
import type { FieldMoveId } from "@/data/field/types";
import { FIELD_MOVE_FOR_OBSTACLE, HMS, type HmDef, type HmItemId } from "@/data/field/hms";
import { PLAYABLE_KINDS, type FieldGate } from "@/data/field/obstacles";
import { flyDestinations } from "@/data/field/fly";
import { type Mon, typesOf } from "@/game/pokemon/mon";

type Bag = Partial<Record<ItemId, number>>;
type Flags = Readonly<Record<string, boolean | undefined>>;

const HM_FOR_MOVE = Object.fromEntries(Object.values(HMS).map((hm) => [hm.fieldMove, hm.id])) as Partial<
  Record<FieldMoveId, HmItemId>
>;

export function isHm(id: string): id is HmItemId {
  return Object.hasOwn(HMS, id);
}

export function hmItemForMove(move: FieldMoveId): HmItemId | null {
  return HM_FOR_MOVE[move] ?? null;
}

export function hmDefFromItem(id: string): HmDef | null {
  return isHm(id) ? HMS[id] : null;
}

export function ownsHm(bag: Bag, move: FieldMoveId): boolean {
  const hm = HM_FOR_MOVE[move];
  return hm ? (bag[hm] ?? 0) > 0 : false;
}

/** HMs que estão na mochila, em ordem de número. */
export function listOwnedHms(bag: Bag): HmItemId[] {
  return (Object.keys(HMS) as HmItemId[]).filter((id) => (bag[id] ?? 0) > 0);
}

/** Quem do time usa o golpe no mapa: o primeiro que sabe, de preferência de pé. */
export function fieldUser(party: Mon[], move: FieldMoveId): Mon | null {
  const hm = HM_FOR_MOVE[move];
  const need = hm ? HMS[hm].battleMoveId : move;
  const knows = party.filter((mon) => mon.moves.some((slot) => slot.id === need));
  return knows.find((mon) => mon.hp > 0) ?? knows[0] ?? null;
}

export function partyKnowsFieldMove(party: Mon[], move: FieldMoveId): boolean {
  return fieldUser(party, move) !== null;
}

export type FieldFail = "no_hm" | "no_pokemon_move" | "already_cleared" | "not_ready" | "no_fly_destinations";
export type FieldCheck = { ok: true; user: Mon } | { ok: false; code: FieldFail };

/** Pode limpar este obstáculo agora? Precisa da HM na mochila e de alguém do time com o golpe. */
export function canUseFieldOnGate(gate: FieldGate, flags: Flags, bag: Bag, party: Mon[]): FieldCheck {
  if (flags[gate.clearedFlag]) return { ok: false, code: "already_cleared" };
  if (!PLAYABLE_KINDS.has(gate.kind)) return { ok: false, code: "not_ready" };
  const move = FIELD_MOVE_FOR_OBSTACLE[gate.kind];
  if (!ownsHm(bag, move)) return { ok: false, code: "no_hm" };
  const user = fieldUser(party, move);
  return user ? { ok: true, user } : { ok: false, code: "no_pokemon_move" };
}

/** Pode abrir o mapa de Voo? HM02 na mochila, Voo no time e ao menos uma cidade liberada. */
export function canOpenFlyMap(flags: Flags, bag: Bag, party: Mon[]): FieldCheck {
  if (!ownsHm(bag, "fly")) return { ok: false, code: "no_hm" };
  const user = fieldUser(party, "fly");
  if (!user) return { ok: false, code: "no_pokemon_move" };
  if (flyDestinations(flags).length === 0) return { ok: false, code: "no_fly_destinations" };
  return { ok: true, user };
}

export type LearnCheck = "ok" | "knows" | "cant";

/** Este Pokémon aprende o golpe da HM? Voo pede tipo Voador; Surfe, Cascata e Mergulho, tipo Água. */
export function canLearnHm(mon: Mon, hm: HmItemId): LearnCheck {
  const def = HMS[hm];
  if (mon.moves.some((slot) => slot.id === def.battleMoveId)) return "knows";
  if (def.learners && !typesOf(mon).some((type) => def.learners?.includes(type))) return "cant";
  return "ok";
}
