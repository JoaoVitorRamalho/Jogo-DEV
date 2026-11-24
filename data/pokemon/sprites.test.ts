import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SPECIES } from "@/data/pokemon/species";
import { MON_SPRITES, spriteOf } from "@/game/phaser/constants";

describe("sprites das espécies e evoluções", () => {
  it.each(Object.values(SPECIES))("carrega a imagem própria de $name, de frente e de costas", (mon) => {
    const sprite = spriteOf(mon.id);
    expect(sprite).toBe(mon.id);
    expect(MON_SPRITES).toContain(sprite);
    for (const suffix of ["", "_back"]) {
      const path = fileURLToPath(new URL(`../../public/assets/sprites/pokemon/${sprite}${suffix}.png`, import.meta.url));
      expect(existsSync(path), `PNG de ${mon.name}: ${sprite}${suffix}`).toBe(true);
    }
  });
});
