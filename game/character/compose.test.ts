import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type Appearance, defaultAppearance, migrateAppearance } from "@/game/character/appearance";
import { SHEET_H, SHEET_W, composeSheet } from "@/game/character/compose";

const raw = ".tmp-art/body_base.rgba";

describe("compositor de personagem", () => {
  it("migra aparência LPC antiga sem perder escolhas", () => {
    const migrated = migrateAppearance({
      sex: "female",
      name: "Lina",
      skin: "bronze",
      eyes: "green",
      hair: "hair_ponytail",
      hairColor: "redhead",
      shirt: "torso_clothes_longsleeve",
      shirtColor: "blue",
      legs: "legs_skirt_plain",
      legsColor: "navy",
      shoes: "feet_boots_basic",
      shoesColor: "brown",
      hat: "none",
      glasses: "facial_glasses",
    });
    expect(migrated).toMatchObject({
      version: 2,
      sex: "female",
      name: "Lina",
      skin: "bronze",
      eyes: "green",
      hairStyle: "ponytail",
      hairColor: "redhead",
      top: "longsleeve",
      topColor: "blue",
      bottom: "skirt",
      shoes: "boots",
      extra: "glasses",
    });
  });

  it.skipIf(!existsSync(raw))("gera folhas de prévia", () => {
    const base = new Uint8ClampedArray(readFileSync(raw));
    expect(base.length).toBe(SHEET_W * SHEET_H * 4);
    const looks: Appearance[] = [
      defaultAppearance("male"),
      defaultAppearance("female"),
      { ...defaultAppearance("male"), hairStyle: "spiky", hairColor: "blonde", top: "jacket", topColor: "red", headwear: "cap", headwearColor: "blue", extra: "none", skin: "brown" },
      { ...defaultAppearance("female"), hairStyle: "long", hairColor: "black", top: "dress", topColor: "pink", extra: "glasses", skin: "amber", eyes: "blue" },
      { ...defaultAppearance("male"), hairStyle: "afro", hairColor: "black", top: "hoodie", topColor: "green", bottom: "shorts", skin: "black", extra: "scarf", extraColor: "yellow" },
      { ...defaultAppearance("female"), hairStyle: "bun", hairColor: "pink", top: "tank", topColor: "white", bottom: "pants", headwear: "hat", headwearColor: "tan" },
      { ...defaultAppearance("female"), hairStyle: "twintails", hairColor: "blue", top: "longsleeve", topColor: "purple", bottom: "skirt", headwear: "beanie", headwearColor: "red" },
      { ...defaultAppearance("male"), hairStyle: "bob", hairColor: "platinum", top: "tshirt", topColor: "orange", shoes: "boots", shoesColor: "brown" },
    ];
    const out = new Uint8Array(SHEET_W * looks.length * SHEET_H * 4);
    looks.forEach((look, index) => {
      const sheet = composeSheet(base, look);
      for (let y = 0; y < SHEET_H; y += 1) {
        for (let x = 0; x < SHEET_W; x += 1) {
          const s = (y * SHEET_W + x) * 4;
          const d = (y * SHEET_W * looks.length + index * SHEET_W + x) * 4;
          out.set(sheet.subarray(s, s + 4), d);
        }
      }
    });
    writeFileSync(".tmp-art/compose_preview.rgba", out);
    writeFileSync(".tmp-art/compose_preview.json", JSON.stringify({ w: SHEET_W * looks.length, h: SHEET_H }));
  });
});
