import type { StatusId } from "@/data/pokemon/moves";

export type ItemId = "potion" | "super_potion" | "antidote" | "paralyze_heal" | "awakening" | "burn_heal" | "pokeball" | "greatball" | "rare_candy" | "infinite_potion";

export type ItemDef = {
  id: ItemId;
  name: string;
  pocket: "medicine" | "balls";
  price: number;
  icon: string;
  heal?: number;
  cures?: StatusId[];
  ball?: number;
  candy?: boolean;
  infinite?: boolean;
  description: string;
};

const list: ItemDef[] = [
  { id: "potion", name: "Poção", pocket: "medicine", price: 200, icon: "potion", heal: 20, description: "Recupera 20 PS de um Pokémon." },
  { id: "super_potion", name: "Superpoção", pocket: "medicine", price: 700, icon: "superpotion", heal: 50, description: "Recupera 50 PS de um Pokémon." },
  { id: "antidote", name: "Antídoto", pocket: "medicine", price: 100, icon: "antidote", cures: ["poison"], description: "Cura envenenamento." },
  { id: "paralyze_heal", name: "Antiparalisia", pocket: "medicine", price: 200, icon: "paralyze_heal", cures: ["paralysis"], description: "Cura paralisia." },
  { id: "awakening", name: "Despertar", pocket: "medicine", price: 250, icon: "awakening", cures: ["sleep"], description: "Acorda um Pokémon adormecido." },
  { id: "burn_heal", name: "Antiqueimadura", pocket: "medicine", price: 250, icon: "burn_heal", cures: ["burn"], description: "Cura queimaduras." },
  { id: "pokeball", name: "Pokébola", pocket: "balls", price: 200, icon: "ball", ball: 1, description: "Captura Pokémon selvagens." },
  { id: "greatball", name: "Grande Bola", pocket: "balls", price: 600, icon: "greatball", ball: 1.5, description: "Captura melhor que a Pokébola." },
  { id: "rare_candy", name: "Doce Raro", pocket: "medicine", price: 0, icon: "superpotion", candy: true, description: "Sobe 1 nível. Se chegar na evolução, ela acontece." },
  { id: "infinite_potion", name: "Poção Infinita", pocket: "medicine", price: 0, icon: "potion", heal: 999, infinite: true, description: "Recupera todos os PS e não acaba." },
];

export const ITEMS: Record<ItemId, ItemDef> = Object.fromEntries(list.map((item) => [item.id, item])) as Record<ItemId, ItemDef>;
