import type { Appearance, Catalog, ItemDef, ItemSlot, Sex } from "@/lib/character/types";
import { NONE, OPTIONAL_SLOTS } from "@/lib/character/types";

const PREFERRED: Partial<Record<ItemSlot, string[]>> = {
  expression: ["face_neutral"],
  eyebrows: ["eyebrows_thick"],
  hair: ["hair_ponytail", "hair_bob", "hair_long"],
  shirt: ["torso_clothes_tshirt"],
  legs: ["legs_pants"],
  shoes: ["feet_shoes_basic"],
};

export function itemsFor(catalog: Catalog, slot: ItemSlot, sex: Sex): ItemDef[] {
  return catalog.items.filter((item) => item.slot === slot && item.sexes.includes(sex));
}

function pick(catalog: Catalog, slot: ItemSlot, sex: Sex, allowNone: boolean): string {
  const items = itemsFor(catalog, slot, sex);
  for (const id of PREFERRED[slot] ?? []) {
    if (items.some((item) => item.id === id)) return id;
  }
  if (items[0]) return items[0].id;
  return allowNone ? NONE : "";
}

export function defaultAppearance(catalog: Catalog, sex: Sex = "male"): Appearance {
  return {
    sex,
    name: "",
    skin: "light",
    eyes: "brown",
    hairColor: "dark_brown",
    shirtColor: "blue",
    legsColor: "brown",
    shoesColor: "brown",
    hatColor: "red",
    glassesColor: "black",
    expression: pick(catalog, "expression", sex, false),
    eyebrows: pick(catalog, "eyebrows", sex, true),
    hair: pick(catalog, "hair", sex, true),
    beard: NONE,
    shirt: pick(catalog, "shirt", sex, true),
    legs: pick(catalog, "legs", sex, true),
    shoes: pick(catalog, "shoes", sex, true),
    hat: NONE,
    glasses: NONE,
  };
}

export function sanitizeAppearance(catalog: Catalog, appearance: Appearance): Appearance {
  const next: Appearance = { ...appearance, sex: appearance.sex === "female" ? "female" : "male" };
  for (const slot of [
    "expression",
    "eyebrows",
    "hair",
    "beard",
    "shirt",
    "legs",
    "shoes",
    "hat",
    "glasses",
  ] as const) {
    const id = next[slot];
    if (id === NONE && OPTIONAL_SLOTS.includes(slot)) continue;
    const item = catalog.items.find((entry) => entry.id === id && entry.slot === slot);
    if (item && item.sexes.includes(next.sex)) continue;
    next[slot] = pick(catalog, slot, next.sex, OPTIONAL_SLOTS.includes(slot));
  }
  if (!next.expression) next.expression = pick(catalog, "expression", next.sex, false);
  next.name = next.name.slice(0, 12);
  return next;
}

export function withSex(catalog: Catalog, appearance: Appearance, sex: Sex): Appearance {
  return sanitizeAppearance(catalog, { ...appearance, sex });
}
