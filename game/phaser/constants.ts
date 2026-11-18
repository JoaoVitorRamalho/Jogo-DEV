export const VIEW_W = 240;
export const VIEW_H = 160;
export const TILE = 16;

export const MAP_KEYS = ["brisamar", "house_1f", "house_2f", "neighbor", "lab", "route1"] as const;
export const MON_SPRITES = ["torchic", "bulbasaur", "froakie", "wurmple", "starly", "gible", "mew", "giratina"] as const;

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
