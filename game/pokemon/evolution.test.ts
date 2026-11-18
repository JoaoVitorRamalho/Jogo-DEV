import { describe, expect, test } from "vitest";
import { MOVES } from "@/data/pokemon/moves";
import { SPECIES } from "@/data/pokemon/species";
import { createMon, evolve, grantLevel, pendingEvolution } from "@/game/pokemon/mon";

const rng = () => 0.5;
const all = Object.values(SPECIES);
const evolvedFrom = new Set(all.flatMap((def) => (def.evolution ? [def.evolution.into] : [])));
const bases = all.filter((def) => !evolvedFrom.has(def.id));

describe("dados das espécies", () => {
  test.each(all.map((def) => [def.id, def] as const))("%s: evolução e golpes existem", (_, def) => {
    if (def.evolution) {
      expect(SPECIES[def.evolution.into], `${def.id} evolui para algo que não existe`).toBeDefined();
      expect(def.evolution.level).toBeGreaterThan(1);
    }
    for (const [, id] of def.learnset) expect(MOVES[id], `${def.id} tem golpe inexistente: ${id}`).toBeDefined();
  });
});

describe("cada linha evolui até o fim e continua aprendendo golpes", () => {
  test.each(bases.map((def) => [def.id] as const))("%s", (id) => {
    const mon = createMon(id, 1, rng);
    const path = [mon.species];
    const learned = new Set(mon.moves.map((slot) => slot.id));
    while (mon.level < 60) {
      const result = grantLevel(mon);
      if (!result) break;
      for (const move of result.learned) learned.add(move);
      // golpe pendente com 4 já sabidos: troca o mais antigo, como um jogador faria
      for (const move of result.pending) {
        mon.moves.shift();
        mon.moves.push({ id: move, pp: MOVES[move].pp });
        learned.add(move);
      }
      const into = pendingEvolution(mon);
      if (into) {
        const taught = evolve(mon, into);
        path.push(into);
        for (const move of [...taught.learned, ...taught.pending]) learned.add(move);
      }
    }
    let last = SPECIES[id];
    const expected = [last.id];
    while (last.evolution) {
      last = SPECIES[last.evolution.into];
      expected.push(last.id);
    }
    expect(path).toEqual(expected);
    expect(mon.moves.length).toBeGreaterThan(0);
    expect(mon.moves.length).toBeLessThanOrEqual(4);
    if (expected.length > 1) expect(learned.size, `${id} aprende poucos golpes`).toBeGreaterThanOrEqual(5);
  });
});

test("ao evoluir aprende o golpe da nova forma", () => {
  const mon = createMon("froakie", 36, rng);
  evolve(mon, "frogadier");
  const taught = evolve(mon, "greninja");
  const knows = mon.moves.some((slot) => slot.id === "night_slash");
  expect(knows || taught.pending.includes("night_slash")).toBe(true);
});
