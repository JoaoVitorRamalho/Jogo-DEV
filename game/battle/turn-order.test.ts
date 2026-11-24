import { describe, expect, it } from "vitest";
import { runTurn, startBattle } from "@/game/battle/engine";
import { seeded } from "@/game/core/rng";
import { createMon } from "@/game/pokemon/mon";

function trainerBattle() {
  const player = createMon("froakie", 30, seeded(1));
  player.moves = [{ id: "quick_attack", pp: 30 }, { id: "tackle", pp: 35 }, { id: "growl", pp: 40 }];
  const first = createMon("wurmple", 8, seeded(2));
  first.hp = 1;
  first.moves = [{ id: "tackle", pp: 35 }];
  const reserve = createMon("bidoof", 12, seeded(3));
  reserve.moves = [{ id: "headbutt", pp: 15 }];
  return startBattle({ kind: "trainer", trainerName: "Teste", playerParty: [player], foeParty: [first, reserve], bag: {} }).state;
}

describe("substituição após desmaio", () => {
  it.each([0, 1])("não transfere o ataque pendente ao substituto (golpe %s)", (index) => {
    const before = trainerBattle();
    const result = runTurn(before, { type: "move", index }, seeded(4));
    expect(result.state.foe.party[0].hp).toBe(0);
    expect(result.state.foe.active).toBe(1);
    expect(result.events.filter((event) => event.type === "move").map((event) => event.side)).toEqual(["player"]);
    expect(result.state.foe.party[1].moves[0].pp).toBe(15);
    expect(result.state.player.party[0].hp).toBe(before.player.party[0].hp);
    expect(result.events.filter((event) => event.type === "faint" && event.side === "foe")).toHaveLength(1);
    expect(result.events.filter((event) => event.type === "exp")).toHaveLength(1);
  });

  it("só deixa o substituto atacar depois da próxima escolha do jogador", () => {
    const knockout = runTurn(trainerBattle(), { type: "move", index: 0 }, seeded(5));
    const next = runTurn(knockout.state, { type: "move", index: 2 }, seeded(6));
    expect(next.state.turn).toBe(knockout.state.turn + 1);
    expect(next.events.filter((event) => event.type === "move").map((event) => event.side).sort()).toEqual(["foe", "player"]);
    expect(next.state.foe.party[1].moves[0].pp).toBe(14);
  });

  it("preserva o ataque legítimo do adversário quando ele agiu antes de desmaiar", () => {
    const before = trainerBattle();
    before.player.party[0].level = 5;
    const first = createMon("pidgeot", 60, seeded(7));
    first.hp = 1;
    first.moves = [{ id: "growl", pp: 40 }];
    before.foe.party[0] = first;
    const result = runTurn(before, { type: "move", index: 1 }, seeded(8));
    expect(result.events.filter((event) => event.type === "move").map((event) => event.side)).toEqual(["foe", "player"]);
    expect(result.state.foe.active).toBe(1);
    expect(result.state.foe.party[1].moves[0].pp).toBe(15);
  });

  it("resolve o veneno do jogador antes da entrada do próximo adversário", () => {
    const before = trainerBattle();
    before.player.party[0].status = "poison";
    before.foe.party[1].status = "burn";
    const result = runTurn(before, { type: "move", index: 0 }, seeded(9));
    expect(result.state.foe.party[1].hp).toBe(before.foe.party[1].hp);
    const residual = result.events.findIndex((event) => event.type === "damage" && event.side === "player");
    const sendOut = result.events.findIndex((event) => event.type === "sendOut" && event.side === "foe");
    expect(residual).toBeGreaterThan(-1);
    expect(sendOut).toBeGreaterThan(residual);
  });

  it("substitui uma única vez quando o desmaio acontece por veneno no fim do turno", () => {
    const before = trainerBattle();
    before.foe.party[0].status = "poison";
    const result = runTurn(before, { type: "move", index: 2 }, seeded(10));
    expect(result.state.foe.active).toBe(1);
    expect(result.events.filter((event) => event.type === "move")).toHaveLength(2);
    expect(result.events.filter((event) => event.type === "exp")).toHaveLength(1);
    expect(result.events.filter((event) => event.type === "sendOut" && event.side === "foe")).toHaveLength(1);
    expect(result.state.foe.party[1].moves[0].pp).toBe(15);
  });
});
