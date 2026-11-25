import type { TypeId } from "@/data/pokemon/types";

/**
 * TMs ainda não existem no jogo. Quando entrarem, o ícone é o disco do tipo do golpe, desenhado por
 * scripts/build_field_tiles.py: `public/assets/ui/items/disc/tm_<tipo>.png`.
 */
export function tmIcon(type: TypeId): string {
  return `disc/tm_${type}`;
}
