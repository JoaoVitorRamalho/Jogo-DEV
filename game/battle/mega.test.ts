import { describe, expect, it } from "vitest";
import { battleSpeciesId, megaFromStone } from "@/data/pokemon/mega";
import { createMon, maxHp, statsOf } from "@/game/pokemon/mon";
import { type BattleConfig, activeOf, runTurn, startBattle } from "@/game/battle/engine";
import { defaultRng } from "@/game/core/rng";
import { availableMegas } from "@/data/pokemon/mega";

describe("mega evolução", () => {
  function setup(base = "garchomp", stone = "garchompite") {
    const player = createMon(base, 50, () => 0.5, { perfect: true });
    player.moves = [{ id: "tackle", pp: 35 }];
    const foe = createMon("mew", 80, () => 0.5, { perfect: true });
    foe.moves = [{ id: "harden", pp: 40 }];
    return startBattle({ kind: "trainer", trainerName: "Teste", playerParty: [player], foeParty: [foe], bag: { [stone]: 1 } }).state;
  }
  it("transforma antes do golpe e ambos os lados agem uma vez no mesmo turno", () => {
    const before = setup();
    const result = runTurn(before, { type: "move", index: 0, mega: "garchompite" }, () => 0.5);
    expect(result.consumed).toBe(true);
    expect(result.state.turn).toBe(1);
    const transformed = result.events.findIndex((event) => event.type === "mega");
    const attacks = result.events.map((event, index) => ({ event, index })).filter(({ event }) => event.type === "move");
    expect(attacks).toHaveLength(2);
    expect(attacks.every(({ index }) => index > transformed)).toBe(true);
    expect(activeOf(result.state, "player").moves[0].pp).toBe(34);
    expect(activeOf(result.state, "foe").hp).toBeLessThan(activeOf(before, "foe").hp);
  });
  it("não consome turno nem transformação quando o golpe é inválido ou está sem PP", () => {
    for (const index of [0, 8]) {
      const before = setup();
      before.player.party[0].moves[0].pp = 0;
      const result = runTurn(before, { type: "move", index, mega: "garchompite" }, () => 0.5);
      expect(result.consumed).toBe(false);
      expect(result.state).toBe(before);
      expect(result.state.turn).toBe(0);
      expect(result.state.megaUsed).toEqual({});
      expect(result.events.some((event) => event.type === "mega")).toBe(false);
    }
  });
  it("usa a Velocidade da nova forma e respeita a prioridade do adversário", () => {
    const before = setup("blaziken", "blazikenite");
    before.foe.party[0] = createMon("pachirisu", 50, () => 0.5, { perfect: true });
    before.foe.party[0].moves = [{ id: "growl", pp: 40 }];
    const result = runTurn(before, { type: "move", index: 0, mega: "blazikenite" }, () => 0.5);
    expect(result.events.find((event) => event.type === "move")).toMatchObject({ side: "player" });
    before.foe.party[0].moves = [{ id: "quick_attack", pp: 30 }];
    const priority = runTurn(before, { type: "move", index: 0, mega: "blazikenite" }, () => 0.5);
    expect(priority.events.find((event) => event.type === "move")).toMatchObject({ side: "foe" });
  });
  it.each([["garchomp", "garchompite", 10058], ["blaziken", "blazikenite", 10050], ["greninja", "greninja_ash", 10117]] as const)("%s usa o ID da forma correta", (base, stone, id) => {
    expect(megaFromStone(base, stone)?.pokeapiId).toBe(id);
  });
  it("permite apenas uma mega por equipe e mantém a forma ao trocar", () => {
    const { state } = startBattle({
      kind: "trainer", trainerName: "Teste",
      playerParty: [createMon("venusaur", 50, () => 0.5), createMon("charizard", 50, () => 0.5)],
      foeParty: [{ ...createMon("mew", 100, () => 0.5), moves: [{ id: "harden", pp: 40 }] }],
      bag: { venusaurite: 1, charizardite_x: 1 },
    });
    const first = runTurn(state, { type: "move", index: 0, mega: "venusaurite" }, () => 0.5);
    const switched = runTurn(first.state, { type: "switch", index: 1 }, () => 0.5);
    expect(switched.state.player.party[0].battleForm).toBe("venusaur_mega");
    expect(availableMegas(activeOf(switched.state, "player"), switched.state.bag, switched.state.megaUsed)).toEqual([]);
    const second = runTurn(switched.state, { type: "move", index: 0, mega: "charizardite_x" }, () => 0.5);
    expect(second.consumed).toBe(false);
    expect(second.events.some((event) => event.type === "mega")).toBe(false);
    const back = runTurn(switched.state, { type: "switch", index: 0 }, () => 0.5);
    expect(activeOf(back.state, "player").battleForm).toBe("venusaur_mega");
    expect(Object.keys(back.state.megaUsed)).toHaveLength(1);
  });
  it("mapeia pedra Charizard X", () => {
    const def = megaFromStone("charizard", "charizardite_x");
    expect(def?.id).toBe("charizard_mega_x");
    expect(def?.pokeapiId).toBe(10034);
  });

  it("mega evolui em batalha e sobe stats", () => {
    const player = createMon("venusaur", 50, defaultRng, { perfect: true });
    const foe = createMon("starly", 5, defaultRng);
    const beforeAtk = statsOf(player).atk;
    const config: BattleConfig = {
      kind: "wild",
      playerParty: [player],
      foeParty: [foe],
      bag: { venusaurite: 1 },
    };
    const { state } = startBattle(config);
    const result = runTurn(state, { type: "move", index: 0, mega: "venusaurite" }, defaultRng);
    const active = activeOf(result.state, "player");
    expect(active.battleForm).toBe("venusaur_mega");
    expect(result.state.megaUsed[player.uid]).toBe(true);
    expect(statsOf(active).atk).toBeGreaterThan(beforeAtk);
    expect(battleSpeciesId(active)).toBe("venusaur_mega");
    expect(maxHp(active)).toBeGreaterThan(0);
  });
});
