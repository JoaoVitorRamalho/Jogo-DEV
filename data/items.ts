import type { StatusId } from "@/data/pokemon/moves";

export type ItemId = "potion" | "super_potion" | "antidote" | "paralyze_heal" | "awakening" | "burn_heal" | "pokeball" | "greatball";

export type ItemDef = {
  id: ItemId;
  name: string;
  pocket: "medicine" | "balls";
  price: number;
  icon: string;
  heal?: number;
  cures?: StatusId[];
  ball?: number;
  description: string;
};

const list: ItemDef[] = [
  { id: "potion", name: "Poção", pocket: "medicine", price: 200, icon: "potion", heal: 20, description: "Recupera 20 PS de um Pokémon." },
  { id: "super_potion", name: "Superpoção", pocket: "medicine", price: 700, icon: "superpotion", heal: 50, description: "Recupera 50 PS de um Pokémon." },
  { id: "antidote", name: "Antídoto", pocket: "medicine", price: 100, icon: "antidote", cures: ["poison"], description: "Cura envenenamento." },
  { id: "paralyze_heal", name: "Antiparalisia", pocket: "medicine", price: 200, icon: "antidote", cures: ["paralysis"], description: "Cura paralisia." },
  { id: "awakening", name: "Despertar", pocket: "medicine", price: 250, icon: "antidote", cures: ["sleep"], description: "Acorda um Pokémon adormecido." },
  { id: "burn_heal", name: "Antiqueimadura", pocket: "medicine", price: 250, icon: "antidote", cures: ["burn"], description: "Cura queimaduras." },
  { id: "pokeball", name: "Pokébola", pocket: "balls", price: 200, icon: "ball", ball: 1, description: "Captura Pokémon selvagens." },
  { id: "greatball", name: "Grande Bola", pocket: "balls", price: 600, icon: "greatball", ball: 1.5, description: "Captura melhor que a Pokébola." },
];

export const ITEMS: Record<ItemId, ItemDef> = Object.fromEntries(list.map((item) => [item.id, item])) as Record<ItemId, ItemDef>;
