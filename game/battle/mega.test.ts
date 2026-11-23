import { describe, expect, it } from "vitest";
import { battleSpeciesId, megaFromStone } from "@/data/pokemon/mega";
import { createMon, maxHp, statsOf } from "@/game/pokemon/mon";
import { type BattleConfig, activeOf, runTurn, startBattle } from "@/game/battle/engine";
import { defaultRng } from "@/game/core/rng";

describe("mega evolução", () => {
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
    const result = runTurn(state, { type: "mega", stone: "venusaurite" }, defaultRng);
    const active = activeOf(result.state, "player");
    expect(active.battleForm).toBe("venusaur_mega");
    expect(result.state.megaUsed[player.uid]).toBe(true);
    expect(statsOf(active).atk).toBeGreaterThan(beforeAtk);
    expect(battleSpeciesId(active)).toBe("venusaur_mega");
    expect(maxHp(active)).toBeGreaterThan(0);
  });
});