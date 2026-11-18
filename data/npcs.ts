import { type Appearance, defaultAppearance } from "@/game/character/appearance";

export type NpcLook = { name: string; appearance?: Appearance; sprite?: "ball" };

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
};
