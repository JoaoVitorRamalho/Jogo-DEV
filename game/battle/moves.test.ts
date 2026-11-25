import { describe, expect, it } from "vitest";
import { MOVES, move, moveAccuracy, movePower } from "@/data/pokemon/moves";
import canonical from "@/data/pokemon/move-data.json";
import descriptions from "@/data/pokemon/move-descriptions.pt.json";
import { activeOf, runTurn, startBattle } from "@/game/battle/engine";
import { seeded } from "@/game/core/rng";
import { createMon, maxHp } from "@/game/pokemon/mon";

function duel(attack: string, species = "greninja") {
  const mine = createMon(species, 50, seeded(1), { perfect: true, battleBond: species === "greninja" });
  const foe = createMon("bidoof", 100, seeded(2), { perfect: true });
  mine.moves = [{ id: attack, pp: move(attack).pp }];
  foe.moves = [{ id: "growl", pp: 40 }];
  return startBattle({ kind: "wild", playerParty: [mine], foeParty: [foe], bag: {} }).state;
}

describe("golpes verificados na PokéAPI", () => {
  it("cobre todos os golpes aprendidos com metadados e tradução", () => {
    expect(Object.keys(MOVES).sort()).toEqual(Object.keys(canonical).sort());
    expect(Object.keys(MOVES).sort()).toEqual(Object.keys(descriptions).sort());
    for (const definition of Object.values(MOVES)) {
      expect(definition.description.length, definition.id).toBeGreaterThan(15);
      expect(definition.description).not.toMatch(/can't be used|undefined|\$effect_chance/);
    }
  });

  it("distingue golpes sem potência base e precisão não aplicável", () => {
    expect(movePower(move("dragon_rage"))).toBe("—");
    expect(movePower(move("growl"))).toBe("—");
    expect(movePower(move("water_pulse"))).toBe("60");
    expect(moveAccuracy(move("aerial_ace"))).toBe("—");
    expect(moveAccuracy(move("poison_powder"))).toBe("75%");
    expect(move("water_shuriken").category).toBe("special");
    expect(move("poison_jab").category).toBe("physical");
  });

  it("Gigadreno recupera metade do dano efetivamente causado, respeitando PS máximos", () => {
    const state = duel("giga_drain", "venusaur");
    activeOf(state, "player").hp = maxHp(activeOf(state, "player")) - 70;
    const before = activeOf(state, "player").hp;
    const result = runTurn(state, { type: "move", index: 0 }, () => 0.5);
    const damage = result.events.filter((event) => event.type === "damage" && event.side === "foe").reduce((sum, event) => sum + (event.type === "damage" ? event.amount : 0), 0);
    expect(damage).toBeGreaterThan(0);
    expect(activeOf(result.state, "player").hp).toBe(Math.min(maxHp(activeOf(state, "player")), before + Math.floor(damage / 2)));
    expect(result.events.some((event) => event.type === "heal" && event.side === "player")).toBe(true);
  });

  it("Combate Corpo a Corpo reduz as duas defesas", () => {
    const result = runTurn(duel("close_combat", "blaziken"), { type: "move", index: 0 }, () => 0.5);
    expect(result.state.player.stages.def).toBe(-1);
    expect(result.state.player.stages.spd).toBe(-1);
  });

  it("Estrela Ninja varia de dois a cinco acertos; na Forma Ash são sempre três", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const result = runTurn(duel("water_shuriken"), { type: "move", index: 0 }, seeded(seed * 7919));
      const count = result.events.filter((event) => event.type === "damage" && event.side === "foe").length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(5);
      counts.add(count);
    }
    expect(counts).toEqual(new Set([2, 3, 4, 5]));
    const ash = duel("water_shuriken");
    activeOf(ash, "player").battleForm = "greninja_ash";
    const result = runTurn(ash, { type: "move", index: 0 }, () => 0.5);
    expect(result.events.filter((event) => event.type === "damage" && event.side === "foe")).toHaveLength(3);
  });

  it("Roda de Fogo descongela o usuário antes de atacar", () => {
    const state = duel("flame_wheel", "charizard");
    activeOf(state, "player").status = "freeze";
    const result = runTurn(state, { type: "move", index: 0 }, () => 0.99);
    expect(activeOf(result.state, "player").status).toBeNull();
    expect(result.events.some((event) => event.type === "damage" && event.side === "foe")).toBe(true);
  });
});
