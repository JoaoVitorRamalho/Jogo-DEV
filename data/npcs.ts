import { type Appearance, defaultAppearance } from "@/game/character/appearance";

export type TileSprite = "ball" | "web" | "lever_off" | "lever_on";
export type NpcLook = { name: string; appearance?: Appearance; sprite?: TileSprite };

const gaelLook: Appearance = { ...defaultAppearance("male"), hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "red", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "white", extra: "none", skin: "amber", shoesColor: "white" };
const worker: Appearance = { ...defaultAppearance("male"), hairStyle: "buzz", hairColor: "dark_brown", top: "jacket", topColor: "charcoal", bottom: "pants", bottomColor: "black", headwear: "cap", headwearColor: "yellow", extra: "none", skin: "bronze", shoes: "boots", shoesColor: "black" };
const coraLook: Appearance = { ...defaultAppearance("female"), hairStyle: "twintails", hairColor: "green", top: "jacket", topColor: "forest", bottom: "shorts", bottomColor: "tan", headwear: "hat", headwearColor: "tan", extra: "backpack", extraColor: "brown", skin: "olive", shoes: "boots", shoesColor: "brown" };

const male = defaultAppearance("male");
const female = defaultAppearance("female");

export const NPCS: Record<string, NpcLook> = {
  mother: {
    name: "Mãe",
    appearance: { ...female, hairStyle: "long", hairColor: "chestnut", top: "longsleeve", topColor: "tan", bottom: "skirt", bottomColor: "brown", extra: "none", shoesColor: "brown" },
  },
  lira: {
    name: "Prof. Dário",
    appearance: { ...female, hairStyle: "bob", hairColor: "green", top: "longsleeve", topColor: "white", bottom: "pants", bottomColor: "gray", extra: "glasses", shoesColor: "charcoal", skin: "amber" },
  },
  ren_lab: {
    name: "Ren",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "blue", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "red", extra: "none", skin: "amber", shoesColor: "red" },
  },
  ren_gate: {
    name: "Ren",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "blue", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "red", extra: "none", skin: "amber", shoesColor: "red" },
  },
  ren_route1: {
    name: "Ren",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "blue", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "red", extra: "none", skin: "amber", shoesColor: "red" },
  },
  fisher: {
    name: "Pescador Davi",
    appearance: { ...male, hairStyle: "short", hairColor: "gray", top: "tank", topColor: "sky", bottom: "shorts", bottomColor: "tan", headwear: "hat", headwearColor: "tan", extra: "none", skin: "bronze" },
  },
  girl: {
    name: "Bia",
    appearance: { ...female, hairStyle: "twintails", hairColor: "blonde", top: "dress", topColor: "yellow", extra: "none", shoesColor: "pink" },
  },
  elder: {
    name: "Seu Otávio",
    appearance: { ...male, hairStyle: "buzz", hairColor: "white", top: "longsleeve", topColor: "brown", bottom: "pants", bottomColor: "tan", extra: "none", skin: "taupe" },
  },
  shopkeeper: {
    name: "Dona Marta",
    appearance: { ...female, hairStyle: "bun", hairColor: "dark_brown", top: "tshirt", topColor: "white", bottom: "skirt", bottomColor: "red", extra: "scarf", extraColor: "red", skin: "brown" },
  },
  kid: {
    name: "Tico",
    appearance: { ...male, hairStyle: "buzz", hairColor: "black", top: "tshirt", topColor: "orange", bottom: "shorts", bottomColor: "blue", extra: "none", skin: "black" },
  },
  neighbor: {
    name: "Dona Célia",
    appearance: { ...female, hairStyle: "bun", hairColor: "gray", top: "longsleeve", topColor: "purple", bottom: "skirt", bottomColor: "charcoal", extra: "glasses", skin: "light" },
  },
  gael: {
    name: "Gael",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "red", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "white", extra: "none", skin: "amber", shoesColor: "white" },
  },
  gael_clearing: {
    name: "Gael",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "red", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "white", extra: "none", skin: "amber", shoesColor: "white" },
  },
  doctor: {
    name: "Médico",
    appearance: { ...male, hairStyle: "short", hairColor: "gray", top: "longsleeve", topColor: "white", bottom: "pants", bottomColor: "navy", extra: "glasses", skin: "light", shoesColor: "charcoal" },
  },
  mother_clinic: {
    name: "Mãe",
    appearance: { ...female, hairStyle: "long", hairColor: "chestnut", top: "longsleeve", topColor: "tan", bottom: "skirt", bottomColor: "brown", extra: "none", shoesColor: "brown" },
  },
  mother_town: {
    name: "Mãe",
    appearance: { ...female, hairStyle: "long", hairColor: "chestnut", top: "longsleeve", topColor: "tan", bottom: "skirt", bottomColor: "brown", extra: "none", shoesColor: "brown" },
  },
  gael_route: {
    name: "Gael",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "red", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "white", extra: "none", skin: "amber", shoesColor: "white" },
  },
  gael_lab: {
    name: "Gael",
    appearance: { ...male, hairStyle: "spiky", hairColor: "black", top: "jacket", topColor: "red", bottom: "pants", bottomColor: "navy", headwear: "cap", headwearColor: "white", extra: "none", skin: "amber", shoesColor: "white" },
  },
  mother_lake: {
    name: "Mãe",
    appearance: { ...female, hairStyle: "long", hairColor: "chestnut", top: "longsleeve", topColor: "tan", bottom: "skirt", bottomColor: "brown", extra: "none", shoesColor: "brown" },
  },
  celina: {
    name: "Profª Celina",
    appearance: { ...female, hairStyle: "bob", hairColor: "black", top: "longsleeve", topColor: "white", bottom: "pants", bottomColor: "navy", extra: "glasses", shoesColor: "charcoal", skin: "olive" },
  },
  bia_forest: {
    name: "Escoteira Bia",
    appearance: { ...female, hairStyle: "twintails", hairColor: "chestnut", top: "tshirt", topColor: "green", bottom: "shorts", bottomColor: "brown", extra: "backpack", extraColor: "tan", shoesColor: "brown" },
  },
  ravi: {
    name: "Aprendiz Ravi",
    appearance: { ...male, hairStyle: "short", hairColor: "black", top: "tshirt", topColor: "sky", bottom: "shorts", bottomColor: "navy", extra: "none", skin: "brown" },
  },
  lost_kid: {
    name: "Criança",
    appearance: { ...female, hairStyle: "short", hairColor: "blonde", top: "dress", topColor: "pink", extra: "none", shoesColor: "white", skin: "light" },
  },
  ferruria_local: {
    name: "Morador",
    appearance: { ...male, hairStyle: "short", hairColor: "chestnut", top: "tshirt", topColor: "forest", bottom: "pants", bottomColor: "brown", extra: "none", skin: "olive" },
  },
  ferruria_trainer: {
    name: "Treinadora",
    appearance: { ...female, hairStyle: "ponytail", hairColor: "redhead", top: "jacket", topColor: "orange", bottom: "pants", bottomColor: "black", extra: "none", skin: "amber" },
  },
  youngster: {
    name: "Jovem Teo",
    appearance: { ...male, hairStyle: "short", hairColor: "light_brown", top: "tshirt", topColor: "yellow", bottom: "shorts", bottomColor: "green", headwear: "cap", headwearColor: "yellow", extra: "none" },
  },
  hiker: {
    name: "Guarda Florestal Nuno",
    appearance: { ...male, hairStyle: "short", hairColor: "chestnut", top: "jacket", topColor: "forest", bottom: "pants", bottomColor: "brown", headwear: "hat", headwearColor: "forest", extra: "backpack", extraColor: "tan", skin: "olive", shoes: "boots", shoesColor: "brown" },
  },
  item_potion: { name: "Item", sprite: "ball" },
  lab_ball_torchic: { name: "Pokébola", sprite: "ball" },
  lab_ball_bulbasaur: { name: "Pokébola", sprite: "ball" },
  lab_ball_froakie: { name: "Pokébola", sprite: "ball" },
  // capítulo 2: Ferrúria
  gael_ferruria: { name: "Gael", appearance: gaelLook },
  gael_gym: { name: "Gael", appearance: gaelLook },
  worker_a: { name: "Operário", appearance: worker },
  worker_b: { name: "Operário", appearance: { ...worker, skin: "taupe", hairColor: "black" } },
  gym_guard: {
    name: "Guia do Ginásio",
    appearance: { ...male, hairStyle: "short", hairColor: "gray", top: "longsleeve", topColor: "green", bottom: "pants", bottomColor: "tan", extra: "glasses", skin: "light" },
  },
  gym_guide: {
    name: "Guia do Ginásio",
    appearance: { ...male, hairStyle: "short", hairColor: "gray", top: "longsleeve", topColor: "green", bottom: "pants", bottomColor: "tan", extra: "glasses", skin: "light" },
  },
  ferruria_shop: {
    name: "Seu Joca",
    appearance: { ...male, hairStyle: "bun", hairColor: "white", top: "tshirt", topColor: "orange", bottom: "pants", bottomColor: "brown", extra: "none", skin: "brown" },
  },
  nurse: {
    name: "Enfermeira Íris",
    appearance: { ...female, hairStyle: "bun", hairColor: "pink", top: "dress", topColor: "white", bottom: "skirt", bottomColor: "white", headwear: "none", extra: "none", skin: "light", shoesColor: "white" },
  },
  center_visitor: {
    name: "Viajante",
    appearance: { ...female, hairStyle: "afro", hairColor: "black", top: "hoodie", topColor: "sky", bottom: "pants", bottomColor: "navy", extra: "backpack", extraColor: "teal", skin: "brown" },
  },
  cora: { name: "Líder Cora", appearance: coraLook },
  cora_forest: { name: "Cora", appearance: coraLook },
  thomas_researcher: {
    name: "Pesquisador",
    appearance: { ...male, hairStyle: "fringe", hairColor: "platinum", top: "longsleeve", topColor: "white", bottom: "pants", bottomColor: "charcoal", extra: "glasses", skin: "light", shoesColor: "black" },
  },
  gym_trainer_1: {
    name: "Aprendiz Lia",
    appearance: { ...female, hairStyle: "ponytail", hairColor: "blonde", top: "tshirt", topColor: "green", bottom: "shorts", bottomColor: "brown", headwear: "cap", headwearColor: "green", extra: "none" },
  },
  gym_trainer_2: {
    name: "Aprendiz Tomé",
    appearance: { ...male, hairStyle: "afro", hairColor: "dark_brown", top: "tank", topColor: "yellow", bottom: "shorts", bottomColor: "green", extra: "none", skin: "bronze" },
  },
  web_a_1: { name: "Teia", sprite: "web" },
  web_a_2: { name: "Teia", sprite: "web" },
  web_b_1: { name: "Teia", sprite: "web" },
  web_b_3: { name: "Teia", sprite: "web" },
  lever_1_off: { name: "Casulo", sprite: "lever_off" },
  lever_1_on: { name: "Casulo", sprite: "lever_on" },
  lever_2_off: { name: "Casulo", sprite: "lever_off" },
  lever_2_on: { name: "Casulo", sprite: "lever_on" },
  lever_3_off: { name: "Casulo", sprite: "lever_off" },
  lever_3_on: { name: "Casulo", sprite: "lever_on" },
  // capítulo 2: Rota 2 e moradores de Ferrúria
  ranger_r2: {
    name: "Guarda Nuno",
    appearance: { ...male, hairStyle: "short", hairColor: "chestnut", top: "jacket", topColor: "forest", bottom: "pants", bottomColor: "brown", headwear: "hat", headwearColor: "forest", extra: "backpack", extraColor: "tan", skin: "olive", shoes: "boots", shoesColor: "brown" },
  },
  r2_trainer_a: {
    name: "Campista Luan",
    appearance: { ...male, hairStyle: "short", hairColor: "black", top: "tshirt", topColor: "orange", bottom: "shorts", bottomColor: "tan", headwear: "cap", headwearColor: "orange", extra: "backpack", extraColor: "brown", skin: "brown" },
  },
  r2_trainer_b: {
    name: "Observadora Nina",
    appearance: { ...female, hairStyle: "bob", hairColor: "chestnut", top: "jacket", topColor: "sky", bottom: "pants", bottomColor: "navy", headwear: "hat", headwearColor: "tan", extra: "glasses", skin: "light" },
  },
  r2_fisher: {
    name: "Pescador Bento",
    appearance: { ...male, hairStyle: "buzz", hairColor: "gray", top: "longsleeve", topColor: "navy", bottom: "pants", bottomColor: "charcoal", headwear: "hat", headwearColor: "navy", extra: "none", skin: "bronze", shoes: "boots" },
  },
  r2_hiker: {
    name: "Viajante",
    appearance: { ...female, hairStyle: "ponytail", hairColor: "black", top: "hoodie", topColor: "red", bottom: "pants", bottomColor: "black", extra: "backpack", extraColor: "red", skin: "amber" },
  },
  r2_grove_kid: {
    name: "Exploradora Lu",
    appearance: { ...female, hairStyle: "twintails", hairColor: "redhead", top: "tshirt", topColor: "yellow", bottom: "shorts", bottomColor: "green", headwear: "cap", headwearColor: "yellow", extra: "backpack", extraColor: "green", skin: "light" },
  },
  item_r2_super: { name: "Item", sprite: "ball" },
  item_r2_ball: { name: "Item", sprite: "ball" },
  item_r2_candy: { name: "Item", sprite: "ball" },
  ferruria_kid: {
    name: "Menina Bia",
    appearance: { ...female, hairStyle: "twintails", hairColor: "black", top: "dress", topColor: "pink", bottom: "skirt", bottomColor: "pink", extra: "none", skin: "brown" },
  },
  ferruria_elder: {
    name: "Vó Lurdes",
    appearance: { ...female, hairStyle: "bun", hairColor: "white", top: "longsleeve", topColor: "purple", bottom: "skirt", bottomColor: "brown", extra: "glasses", skin: "light" },
  },
  ferruria_gossip_a: {
    name: "Dona Zeza",
    appearance: { ...female, hairStyle: "afro", hairColor: "dark_brown", top: "dress", topColor: "yellow", bottom: "skirt", bottomColor: "yellow", extra: "none", skin: "brown" },
  },
  ferruria_gossip_b: {
    name: "Dona Rita",
    appearance: { ...female, hairStyle: "bob", hairColor: "gray", top: "longsleeve", topColor: "teal", bottom: "skirt", bottomColor: "navy", extra: "none", skin: "olive" },
  },
  ferruria_fisher: {
    name: "Seu Tião",
    appearance: { ...male, hairStyle: "buzz", hairColor: "white", top: "tank", topColor: "white", bottom: "shorts", bottomColor: "navy", headwear: "hat", headwearColor: "tan", extra: "none", skin: "bronze" },
  },
  ferruria_gardener: {
    name: "Jardineira Flor",
    appearance: { ...female, hairStyle: "ponytail", hairColor: "chestnut", top: "tshirt", topColor: "green", bottom: "pants", bottomColor: "brown", headwear: "hat", headwearColor: "tan", extra: "none", skin: "amber", shoes: "boots" },
  },
  ferruria_bug: {
    name: "Menino Davi",
    appearance: { ...male, hairStyle: "spiky", hairColor: "light_brown", top: "tshirt", topColor: "green", bottom: "shorts", bottomColor: "tan", headwear: "cap", headwearColor: "green", extra: "backpack", extraColor: "green", skin: "light" },
  },
  ferruria_jogger: {
    name: "Corredor",
    appearance: { ...male, hairStyle: "short", hairColor: "black", top: "tank", topColor: "red", bottom: "shorts", bottomColor: "black", extra: "none", skin: "brown", shoesColor: "red" },
  },
  mart_customer: {
    name: "Cliente",
    appearance: { ...male, hairStyle: "fringe", hairColor: "blonde", top: "hoodie", topColor: "purple", bottom: "pants", bottomColor: "navy", extra: "none", skin: "light" },
  },
  prado_mom: {
    name: "Sra. Prado",
    appearance: { ...female, hairStyle: "long", hairColor: "chestnut", top: "longsleeve", topColor: "maroon", bottom: "skirt", bottomColor: "navy", extra: "none", skin: "amber" },
  },
  prado_kid: {
    name: "Pedrinho",
    appearance: { ...male, hairStyle: "short", hairColor: "chestnut", top: "tshirt", topColor: "sky", bottom: "shorts", bottomColor: "navy", extra: "none", skin: "amber" },
  },
};
