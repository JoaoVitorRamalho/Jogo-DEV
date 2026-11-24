import type { ItemId } from "@/data/items";
import { abilityOf } from "@/data/pokemon/abilities";
import type { Rng } from "@/game/core/rng";
import type { Mon } from "@/game/pokemon/mon";

export function collectPickup(party: Mon[], rng: Rng): { uid: string; item: ItemId }[] {
  const found: { uid: string; item: ItemId }[] = [];
  for (const mon of party) {
    if (mon.heldItem || abilityOf(mon).id !== "pickup" || rng() >= 0.1) continue;
    // Itens do catálogo atual, distribuídos por faixa de nível.
    const pool: ItemId[] = mon.level < 11 ? ["potion", "antidote", "super_potion"] : mon.level < 31 ? ["super_potion", "greatball", "awakening"] : ["super_potion", "greatball", "rare_candy"];
    mon.heldItem = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    found.push({ uid: mon.uid, item: mon.heldItem });
  }
  return found;
}
