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
    name: "Profª Lira",
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
  youngster: {
    name: "Juvenil Caio",
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
