import { describe, expect, it } from "vitest";
import { ENCOUNTERS, encountersFor } from "@/data/encounters";
import { SPECIES } from "@/data/pokemon/species";
import { createMon, evolve, pendingEvolution } from "@/game/pokemon/mon";

describe("variedade de Pokémon selvagens", () => {
  it.each(["route1", "route2", "forest"])("%s oferece as novas espécies com chances válidas", (map) => {
    const table = ENCOUNTERS[map];
    expect(table.grass.reduce((total, slot) => total + slot.weight, 0)).toBe(100);
    for (const id of ["pachirisu", "bidoof", "caterpie", "wurmple", "poochyena", "weedle"]) {
      expect(table.grass.some((slot) => slot.species === id && slot.weight > 0), id).toBe(true);
    }
    for (const slot of table.grass) {
      expect(SPECIES[slot.species]).toBeDefined();
      expect(slot.min).toBeLessThanOrEqual(slot.max);
      expect(createMon(slot.species, slot.min, () => 0.5).moves.length).toBeGreaterThan(0);
    }
  });

  it("inclui Pidgey nas duas rotas", () => {
    expect(ENCOUNTERS.route1.grass.some((slot) => slot.species === "pidgey")).toBe(true);
    expect(ENCOUNTERS.route2.grass.some((slot) => slot.species === "pidgey")).toBe(true);
  });
  it("reserva as evoluções fortes para o bosque liberado, sem alterar o restante da Rota 2", () => {
    const position = { x: 28, y: 3, flags: {} as Record<string, boolean> };
    expect(encountersFor("route2", position)).toBe(ENCOUNTERS.route2);
    position.flags.r2_grove_open = true;
    const grove = encountersFor("route2", position)!;
    expect(grove).toBe(ENCOUNTERS.route2_grove);
    expect(grove.grass.reduce((total, slot) => total + slot.weight, 0)).toBe(100);
    for (const id of ["mightyena", "kakuna", "beedrill"]) expect(grove.grass.some((slot) => slot.species === id)).toBe(true);
    expect(encountersFor("route2", { ...position, y: 20 })).toBe(ENCOUNTERS.route2);
    expect(encountersFor("forest", position)).toBe(ENCOUNTERS.forest);
  });
});

describe("ramos evolutivos do Wurmple", () => {
  it.each([[0, "silcoon", "beautifly"], [0.99, "cascoon", "dustox"]] as const)("mantém o ramo escolhido ao nascer (%s)", (roll, middle, final) => {
    const mon = createMon("wurmple", 7, () => roll);
    expect(pendingEvolution(mon)).toBe(middle);
    expect(pendingEvolution(JSON.parse(JSON.stringify(mon)))).toBe(middle);
    evolve(mon, middle);
    mon.level = 10;
    expect(pendingEvolution(mon)).toBe(final);
  });

  it("preserva o ramo original dos Wurmple de saves antigos", () => {
    const mon = createMon("wurmple", 7, () => 0.99);
    delete mon.evolutionTarget;
    expect(pendingEvolution(mon)).toBe("silcoon");
  });
});
