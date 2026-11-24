import type { ItemId } from "@/data/items";
import type { TypeId } from "@/data/pokemon/types";

type Stats = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };

const s = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): Stats => ({ hp, atk, def, spa, spd, spe });

/** Definição de Mega Evolução (só batalha; história dá as pedras mais tarde). */
export type MegaDef = {
  /** id da espécie em batalha (ex.: venusaur_mega) */
  id: string;
  name: string;
  /** espécie base (ex.: venusaur) */
  baseSpecies: string;
  stone: ItemId;
  sprite: string;
  pokeapiId: number;
  types: TypeId[];
  baseStats: Stats;
  dex: number;
  category: string;
  description: string;
  learnset: [number, string][];
  kind?: "bond";
};

export const MEGA_STONE_ITEMS: ItemId[] = [
  "venusaurite",
  "charizardite_x",
  "charizardite_y",
  "blazikenite",
  "garchompite",
];

export const MEGA_DEFS: MegaDef[] = [
  {
    id: "venusaur_mega",
    name: "Venusaur Mega",
    baseSpecies: "venusaur",
    stone: "venusaurite",
    sprite: "venusaur_mega",
    pokeapiId: 10033,
    types: ["grass", "poison"],
    dex: 3,
    category: "Semente",
    baseStats: s(80, 100, 123, 122, 120, 80),
    learnset: [[0, "earthquake"], [1, "vine_whip"], [13, "razor_leaf"], [28, "giga_drain"]],
    description: "A flor nas costas cresce e supõe energia suficiente para sustentar a mega forma.",
  },
  {
    id: "charizard_mega_x",
    name: "Charizard Mega X",
    baseSpecies: "charizard",
    stone: "charizardite_x",
    sprite: "charizard_mega_x",
    pokeapiId: 10034,
    types: ["fire", "dragon"],
    dex: 6,
    category: "Chama",
    baseStats: s(78, 130, 111, 130, 85, 100),
    learnset: [[0, "dragon_claw"], [1, "flamethrower"], [1, "wing_attack"]],
    description: "As chamas viram azul e o corpo ganha escamas negras de dragão.",
  },
  {
    id: "charizard_mega_y",
    name: "Charizard Mega Y",
    baseSpecies: "charizard",
    stone: "charizardite_y",
    sprite: "charizard_mega_y",
    pokeapiId: 10035,
    types: ["fire", "flying"],
    dex: 6,
    category: "Chama",
    baseStats: s(78, 104, 78, 159, 115, 100),
    learnset: [[0, "heat_wave"], [1, "flamethrower"], [1, "wing_attack"]],
    description: "Asas enormes e poder especial altíssimo.",
  },
  {
    id: "blaziken_mega",
    name: "Blaziken Mega",
    baseSpecies: "blaziken",
    stone: "blazikenite",
    sprite: "blaziken_mega",
    pokeapiId: 10050,
    types: ["fire", "fighting"],
    dex: 257,
    category: "Chama",
    baseStats: s(80, 160, 80, 130, 80, 100),
    learnset: [[0, "flare_blitz"], [1, "blaze_kick"], [1, "close_combat"]],
    description: "Chamas jorram dos pulsos; cada chute queima o ar.",
  },
  {
    id: "garchomp_mega",
    name: "Garchomp Mega",
    baseSpecies: "garchomp",
    stone: "garchompite",
    sprite: "garchomp_mega",
    pokeapiId: 10058,
    types: ["dragon", "ground"],
    dex: 445,
    category: "Mach",
    baseStats: s(108, 170, 115, 120, 95, 92),
    learnset: [[0, "earthquake"], [1, "dragon_claw"], [1, "crunch"]],
    description: "Placas extras; voa como um jato a jato.",
  },
  {
    id: "greninja_ash",
    kind: "bond",
    name: "Greninja Ash",
    baseSpecies: "greninja",
    stone: "greninja_ash",
    sprite: "greninja_ash",
    pokeapiId: 10117,
    types: ["water", "dark"],
    dex: 658,
    category: "Ninja",
    baseStats: s(72, 145, 67, 153, 71, 132),
    learnset: [[0, "water_shuriken"], [1, "dark_pulse"], [1, "surf"]],
    description: "Forma rara ligada ao vínculo total com o treinador. (Evento futuro em Asteria.)",
  },
];

export const MEGA_BY_BASE: Record<string, MegaDef[]> = MEGA_DEFS.reduce<Record<string, MegaDef[]>>((acc, m) => {
  (acc[m.baseSpecies] ??= []).push(m);
  return acc;
}, {});

export const MEGA_SPRITE_KEYS = [...new Set(MEGA_DEFS.map((m) => m.sprite))];

export function megaFormsFor(baseId: string): MegaDef[] {
  return MEGA_BY_BASE[baseId] ?? [];
}

export function megaFromStone(baseId: string, stone: ItemId): MegaDef | null {
  return MEGA_DEFS.find((m) => m.baseSpecies === baseId && m.stone === stone) ?? null;
}

/** Espécie usada para status, tipos e sprite em batalha. */
export function battleSpeciesId(mon: { species: string; battleForm?: string }): string {
  return mon.battleForm ?? mon.species;
}

export function availableMegas(
  mon: { species: string; battleForm?: string; uid: string; hp: number },
  bag: Partial<Record<ItemId, number>>,
  megaUsed: Record<string, boolean>,
): MegaDef[] {
  if (mon.hp <= 0 || mon.battleForm || Object.values(megaUsed).some(Boolean)) return [];
  return megaFormsFor(mon.species).filter((m) => (bag[m.stone] ?? 0) > 0);
}
