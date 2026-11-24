import type { StatusId } from "@/data/pokemon/moves";

export type ItemId =
  | "potion"
  | "super_potion"
  | "antidote"
  | "paralyze_heal"
  | "awakening"
  | "burn_heal"
  | "pokeball"
  | "greatball"
  | "rare_candy"
  | "infinite_potion"
  | "venusaurite"
  | "charizardite_x"
  | "charizardite_y"
  | "blazikenite"
  | "garchompite"
  | "greninja_ash";

export type ItemDef = {
  id: ItemId;
  name: string;
  pocket: "medicine" | "balls" | "training" | "mega";
  price: number;
  icon: string;
  heal?: number;
  cures?: StatusId[];
  ball?: number;
  candy?: boolean;
  infinite?: boolean;
  mega?: boolean;
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
  { id: "rare_candy", name: "Doce Raro", pocket: "training", price: 0, icon: "rare_candy", candy: true, description: "Sobe 1 nível fora de batalha. Se chegar na evolução, ela acontece." },
  { id: "infinite_potion", name: "Poção Infinita", pocket: "medicine", price: 0, icon: "potion", heal: 999, infinite: true, description: "Recupera todos os PS e não acaba." },
  { id: "venusaurite", name: "Venusaurita", pocket: "mega", price: 0, icon: "venusaurite", mega: true, description: "Faz Venusaur mega evoluir em batalha." },
  { id: "charizardite_x", name: "Charizardita X", pocket: "mega", price: 0, icon: "charizardite_x", mega: true, description: "Mega Evolução X de Charizard." },
  { id: "charizardite_y", name: "Charizardita Y", pocket: "mega", price: 0, icon: "charizardite_y", mega: true, description: "Mega Evolução Y de Charizard." },
  { id: "blazikenite", name: "Blazikenita", pocket: "mega", price: 0, icon: "blazikenite", mega: true, description: "Faz Blaziken mega evoluir em batalha." },
  { id: "garchompite", name: "Garchompita", pocket: "mega", price: 0, icon: "garchompite", mega: true, description: "Faz Garchomp mega evoluir em batalha." },
  {
    id: "greninja_ash",
    name: "Cristal Ash",
    pocket: "training",
    price: 0,
    icon: "greninja_ash",
    description: "Concede Laço de Batalha e libera a opção manual Forma Ash para Greninja durante a batalha.",
  },
];

export const ITEMS: Record<ItemId, ItemDef> = Object.fromEntries(list.map((item) => [item.id, item])) as Record<ItemId, ItemDef>;

export function canUseInBattle(id: ItemId, kind: "wild" | "trainer"): boolean {
  const item = ITEMS[id];
  return Boolean(!item.candy && (item.heal || item.cures?.length || (kind === "wild" && item.ball)));
}
