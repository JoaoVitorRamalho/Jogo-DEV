import { SPECIES, species } from "@/data/pokemon/species";

export const VIEW_W = 240;
export const VIEW_H = 160;
export const TILE = 16;

/** Folhas de tiles carregadas no boot; o nome é o mesmo no Tiled e na textura. */
export const TILESET_KEYS = ["overworld", "inner", "extra", "kenney_town", "kenney_extra", "cave_entrance", "cave_interior"] as const;

export const MAP_KEYS = ["brisamar", "house_1f", "house_2f", "neighbor", "lab", "clinic", "route1", "clearing", "forest", "route2", "ferruria", "ferruria_lab", "ferruria_center", "ferruria_gym", "ferruria_mart", "ferruria_house", "route3", "echo_grove", "echo_cave", "verdelume", "verdelume_center", "verdelume_mart", "verdelume_gym", "verdelume_house", "art_lab"] as const;
export const MON_SPRITES = [...new Set(Object.values(SPECIES).map((mon) => mon.sprite))];

const LOADED_SPRITES = new Set<string>(MON_SPRITES);

/** Chave do PNG em public/assets/sprites/pokemon (PokeAPI frente/costas). */
export function spriteOf(id: string): string {
  if (LOADED_SPRITES.has(id)) return id;
  const fromSpecies = species(id).sprite;
  if (LOADED_SPRITES.has(fromSpecies)) return fromSpecies;
  return fromSpecies;
}

export const EXTRA_FIRST_GID = 2441;
export const TALL_GRASS_GID = EXTRA_FIRST_GID + 4;
export const TALL_GRASS_TOP_FRAME = 5;
export const BALL_FRAME = 14;
/** Frames do extra.png usados como "NPC" de um tile só (esfera, teia, casulo). */
export const TILE_SPRITE_FRAME = { ball: BALL_FRAME, web: 16, lever_off: 17, lever_on: 18 } as const;
/** Frames do kenney_tiny_town.png usados do mesmo jeito (a cerca que abre no Dojo de Verdelume). */
export const KENNEY_SPRITE_FRAME = { fence: 81 } as const;
export type TileSpriteId = keyof typeof TILE_SPRITE_FRAME | keyof typeof KENNEY_SPRITE_FRAME;

/** Textura e frame de um "NPC" de um tile só. */
export function tileSpriteFrame(sprite: TileSpriteId): { key: "extra_sheet" | "kenney_sheet"; frame: number } {
  if (sprite in KENNEY_SPRITE_FRAME) return { key: "kenney_sheet", frame: KENNEY_SPRITE_FRAME[sprite as keyof typeof KENNEY_SPRITE_FRAME] };
  return { key: "extra_sheet", frame: TILE_SPRITE_FRAME[sprite as keyof typeof TILE_SPRITE_FRAME] };
}

export function monTexture(sprite: string, available: (key: string) => boolean, back = false): string {
  const key = back ? `mon_${sprite}_back` : `mon_${sprite}`;
  if (available(key)) return key;
  const front = `mon_${sprite}`;
  return available(front) ? front : "mon_unknown";
}
