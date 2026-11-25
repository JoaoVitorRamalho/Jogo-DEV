import type { FieldMoveId, FieldObstacleKind } from "@/data/field/types";
import type { TypeId } from "@/data/pokemon/types";

export type HmItemId = "hm01" | "hm02" | "hm03" | "hm04" | "hm05" | "hm06" | "hm07" | "hm08";

export type HmDef = {
  id: HmItemId;
  number: number;
  fieldMove: FieldMoveId;
  /** Golpe que a HM ensina (id em data/pokemon/moves.ts). */
  battleMoveId: string;
  /** Tipos que aprendem. Sem a lista, qualquer Pokémon aprende. */
  learners?: TypeId[];
};

/**
 * As oito HMs. A HM é uma licença: ensinar não gasta o disco, e o golpe só vale no mapa se
 * alguém do time souber. Nome, ícone e descrição ficam no item (data/items.ts).
 */
export const HMS: Record<HmItemId, HmDef> = {
  hm01: { id: "hm01", number: 1, fieldMove: "cut", battleMoveId: "cut" },
  hm02: { id: "hm02", number: 2, fieldMove: "fly", battleMoveId: "fly", learners: ["flying"] },
  hm03: { id: "hm03", number: 3, fieldMove: "surf", battleMoveId: "surf", learners: ["water"] },
  hm04: { id: "hm04", number: 4, fieldMove: "strength", battleMoveId: "strength" },
  hm05: { id: "hm05", number: 5, fieldMove: "flash", battleMoveId: "flash" },
  hm06: { id: "hm06", number: 6, fieldMove: "rock_smash", battleMoveId: "rock_smash" },
  hm07: { id: "hm07", number: 7, fieldMove: "waterfall", battleMoveId: "waterfall", learners: ["water"] },
  hm08: { id: "hm08", number: 8, fieldMove: "dive", battleMoveId: "dive", learners: ["water"] },
};

export const FIELD_MOVE_FOR_OBSTACLE = {
  cut_bush: "cut",
  smash_rock: "rock_smash",
  push_boulder: "strength",
  surf_water: "surf",
  waterfall: "waterfall",
  flash_dark: "flash",
  dive_spot: "dive",
  defog_mist: "defog",
} as const satisfies Record<FieldObstacleKind, FieldMoveId>;
