import { describe, expect, it } from "vitest";
import { move } from "@/data/pokemon/moves";
import { effectiveness } from "@/data/pokemon/types";
import {
  accuracyStageMultiplier,
  calcDamage,
  captureOdds,
  escapes,
  runTurn,
  startBattle,
  statStageMultiplier,
} from "@/game/battle/engine";
import { seeded } from "@/game/core/rng";
import {
  addExp,
  createMon,
  evolve,
  expForLevel,
  learnMove,
  maxHp,
  movesAtLevel,
  pendingEvolution,
  statsOf,
} from "@/game/pokemon/mon";

const rng = seeded(42);

describe("tipos", () => {
  it("aplica vantagens, resistências e imunidades", () => {
    expect(effectiveness("water", ["fire"])).toBe(2);
    expect(effectiveness("fire", ["water"])).toBe(0.5);
    expect(effectiveness("normal", ["ghost"])).toBe(0);
    expect(effectiveness("grass", ["water", "ground"])).toBe(4);
    expect(effectiveness("fire", ["grass", "poison"])).toBe(2);
    expect(effectiveness("electric", ["ground"])).toBe(0);
  });
});

describe("estágios", () => {
  it("segue as frações clássicas", () => {
    expect(statStageMultiplier(0)).toBe(1);
    expect(statStageMultiplier(1)).toBe(1.5);
    expect(statStageMultiplier(-1)).toBeCloseTo(2 / 3);
    expect(statStageMultiplier(6)).toBe(4);
    expect(accuracyStageMultiplier(-1)).toBe(0.75);
  });
});

describe("Pokémon", () => {
  it("calcula atributos pela fórmula de nível", () => {
    const mon = { species: "bulbasaur", level: 5, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } };
    const stats = statsOf(mon);
    expect(stats.hp).toBe(21);
    expect(stats.atk).toBe(11);
  });

  it("começa com os golpes do nível", () => {
    expect(movesAtLevel("torchic", 5)).toEqual(["scratch", "growl", "ember"]);
    const mon = createMon("froakie", 5, seeded(1));
    expect(mon.moves.map((slot) => slot.id)).toEqual(["pound", "growl", "bubble"]);
    expect(mon.hp).toBe(maxHp(mon));
  });

  it("sobe de nível e aprende golpe novo", () => {
    const mon = createMon("torchic", 8, seeded(2));
    const need = expForLevel("medium_slow", 9) - mon.exp;
    const results = addExp(mon, need);
    expect(mon.level).toBe(9);
    expect(results[0].learned).toContain("sand_attack");
  });

  it("pede escolha quando já tem quatro golpes e permite trocar", () => {
    const mon = createMon("torchic", 12, seeded(3));
    expect(mon.moves.length).toBe(4);
    const results = addExp(mon, expForLevel("medium_slow", 13) - mon.exp);
    expect(results[0].pending).toEqual(["peck"]);
    expect(learnMove(mon, "peck", 1)).toBe(true);
    expect(mon.moves[1].id).toBe("peck");
  });

  it("evolui no nível certo e preserva a proporção de PS", () => {
    const mon = createMon("wurmple", 7, seeded(4));
    expect(pendingEvolution(mon)).toBe("silcoon");
    mon.hp = Math.floor(maxHp(mon) / 2);
    evolve(mon, "silcoon");
    expect(mon.species).toBe("silcoon");
    expect(mon.hp).toBeGreaterThan(0);
    expect(mon.hp).toBeLessThanOrEqual(maxHp(mon));
  });
});

describe("dano", () => {
  const torchic = createMon("torchic", 10, seeded(5), { perfect: true });
  const bulbasaur = createMon("bulbasaur", 10, seeded(6), { perfect: true });
  const froakie = createMon("froakie", 10, seeded(7), { perfect: true });

  it("aplica STAB e vantagem de tipo", () => {
    const strong = calcDamage({ attacker: torchic, defender: bulbasaur, move: move("ember") });
    const weak = calcDamage({ attacker: torchic, defender: froakie, move: move("ember") });
    expect(strong.effectiveness).toBe(2);
    expect(weak.effectiveness).toBe(0.5);
    expect(strong.damage).toBeGreaterThan(weak.damage * 3);
  });

  it("queimadura reduz golpes físicos", () => {
    const normal = calcDamage({ attacker: torchic, defender: froakie, move: move("scratch") }).damage;
    const burned = calcDamage({ attacker: { ...torchic, status: "burn" }, defender: froakie, move: move("scratch") }).damage;
    expect(burned).toBeLessThan(normal);
  });

  it("dano fixo ignora atributos", () => {
    const gible = createMon("gible", 10, seeded(8));
    expect(calcDamage({ attacker: gible, defender: froakie, move: move("dragon_rage") }).damage).toBe(40);
  });

  it("crítico aumenta o dano", () => {
    const base = calcDamage({ attacker: torchic, defender: froakie, move: move("scratch") }).damage;
    const crit = calcDamage({ attacker: torchic, defender: froakie, move: move("scratch"), crit: true }).damage;
    expect(crit).toBeGreaterThan(base);
  });
});

describe("captura e fuga", () => {
  it("captura com mais facilidade quando o alvo está fraco", () => {
    let weak = 0;
    let healthy = 0;
    const random = seeded(9);
    for (let i = 0; i < 400; i += 1) {
      const a = createMon("starly", 3, random);
      const b = createMon("starly", 3, random);
      a.hp = 1;
      if (captureOdds(a, 1, random).caught) weak += 1;
      if (captureOdds(b, 1, random).caught) healthy += 1;
    }
    expect(weak).toBeGreaterThan(healthy);
  });

  it("foge sempre quando é mais rápido", () => {
    expect(escapes(100, 50, 1, seeded(10))).toBe(true);
  });
});

describe("turno", () => {
  it("resolve um turno completo e termina com vitória", () => {
    const player = createMon("torchic", 30, seeded(11), { perfect: true });
    const foe = createMon("wurmple", 2, seeded(12));
    const { state } = startBattle({ kind: "wild", playerParty: [player], foeParty: [foe], bag: {} });
    const emberIndex = state.player.party[0].moves.findIndex((slot) => slot.id === "ember");
    let current = state;
    for (let i = 0; i < 5 && !current.outcome; i += 1) {
      current = runTurn(current, { type: "move", index: Math.max(0, emberIndex) }, seeded(100 + i)).state;
    }
    expect(current.outcome).toBe("win");
    expect(current.player.party[0].exp).toBeGreaterThan(player.exp);
  });

  it("não permite fugir de treinador", () => {
    const { state } = startBattle({
      kind: "trainer",
      trainerName: "Ren",
      playerParty: [createMon("torchic", 5, rng)],
      foeParty: [createMon("froakie", 5, rng)],
      bag: {},
    });
    const result = runTurn(state, { type: "run" }, rng);
    expect(result.consumed).toBe(false);
    expect(result.state.outcome).toBeNull();
  });

  it("usa poção e desconta da mochila", () => {
    const mine = createMon("bulbasaur", 5, rng);
    mine.hp = 3;
    const { state } = startBattle({ kind: "wild", playerParty: [mine], foeParty: [createMon("wurmple", 2, rng)], bag: { potion: 2 } });
    const result = runTurn(state, { type: "item", item: "potion", target: 0 }, seeded(13));
    expect(result.state.bag.potion).toBe(1);
    expect(result.state.player.party[0].hp).toBeGreaterThan(3 - 10);
    expect(result.events.some((event) => event.type === "message" && event.text.includes("recuperou"))).toBe(true);
  });

  it("exige troca quando o Pokémon ativo desmaia e há reserva", () => {
    const weak = createMon("wurmple", 2, rng);
    weak.hp = 1;
    const reserve = createMon("starly", 5, rng);
    const foe = createMon("torchic", 30, rng, { perfect: true });
    const { state } = startBattle({ kind: "trainer", trainerName: "Teste", playerParty: [weak, reserve], foeParty: [foe], bag: {} });
    const result = runTurn(state, { type: "move", index: 0 }, seeded(14));
    expect(result.state.needSwitch).toBe(true);
    const switched = runTurn(result.state, { type: "switch", index: 1 }, seeded(15));
    expect(switched.state.player.active).toBe(1);
    expect(switched.state.needSwitch).toBe(false);
  });

  it("captura encerra a batalha com o Pokémon capturado", () => {
    const foe = createMon("wurmple", 2, rng);
    foe.hp = 1;
    foe.status = "sleep";
    const { state } = startBattle({ kind: "wild", playerParty: [createMon("torchic", 5, rng)], foeParty: [foe], bag: { greatball: 30 } });
    let current = state;
    for (let i = 0; i < 30 && current.outcome !== "caught"; i += 1) {
      current = runTurn(current, { type: "item", item: "greatball" }, seeded(200 + i)).state;
      if (current.outcome && current.outcome !== "caught") break;
    }
    expect(current.outcome).toBe("caught");
    expect(current.caught?.species).toBe("wurmple");
  });
});
