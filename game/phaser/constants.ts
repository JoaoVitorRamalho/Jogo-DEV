import { species } from "@/data/pokemon/species";

export const VIEW_W = 240;
export const VIEW_H = 160;
export const TILE = 16;

export const MAP_KEYS = ["brisamar", "house_1f", "house_2f", "neighbor", "lab", "clinic", "route1", "clearing", "forest", "ferruria", "ferruria_lab"] as const;
export const MON_SPRITES = ["torchic", "bulbasaur", "froakie", "wurmple", "starly", "gible", "mew", "giratina"] as const;

/** Arquivo de sprite da espécie: usa o próprio id se houver arte dele em MON_SPRITES, senão a arte da linha evolutiva. */
export function spriteOf(id: string): string {
  return (MON_SPRITES as readonly string[]).includes(id) ? id : species(id).sprite;
}

export const EXTRA_FIRST_GID = 2441;
export const TALL_GRASS_GID = EXTRA_FIRST_GID + 4;
export const TALL_GRASS_TOP_FRAME = 5;
export const BALL_FRAME = 14;

export function monTexture(sprite: string, available: (key: string) => boolean, back = false): string {
  const key = back ? `mon_${sprite}_back` : `mon_${sprite}`;
  if (available(key)) return key;
  const front = `mon_${sprite}`;
  return available(front) ? front : "mon_unknown";
}
