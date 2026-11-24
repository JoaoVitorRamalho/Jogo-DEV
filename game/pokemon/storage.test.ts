import { beforeEach, describe, expect, it } from "vitest";
import { defaultAppearance } from "@/game/character/appearance";
import { createMon } from "@/game/pokemon/mon";
import { depositMon, exchangeMon, withdrawMon } from "@/game/pokemon/storage";
import { freshState, useGame, type GameState } from "@/game/state/store";

describe("armazenamento de Pokémon no PC", () => {
  let state: GameState;
  beforeEach(() => {
    state = freshState(defaultAppearance());
    state.party = ["froakie", "poochyena", "weedle", "bidoof", "pidgey", "pachirisu"].map((id) => createMon(id, 12, () => 0.5));
    state.box = [createMon("mightyena", 20, () => 0.5), createMon("beedrill", 15, () => 0.5)];
  });
  it("troca diretamente com uma equipe de seis sem perder dados ou duplicar Pokémon", () => {
    const before = [...state.party, ...state.box].map((mon) => mon.uid).sort();
    const outgoing = structuredClone(state.party[5]);
    const incoming = state.box[1];
    incoming.hp = 1; incoming.status = "poison"; incoming.moves[0].pp = 2; incoming.heldItem = "potion";
    const stored = structuredClone(incoming);
    expect(exchangeMon(state, 5, 1)).toBe("ok");
    expect(state.party).toHaveLength(6);
    expect(state.box).toHaveLength(2);
    expect(state.party[5]).toEqual(stored);
    expect(state.box[1]).toEqual(outgoing);
    expect([...state.party, ...state.box].map((mon) => mon.uid).sort()).toEqual(before);
  });
  it("deposita e retira mantendo a identidade e os dados", () => {
    const mon = structuredClone(state.party[2]);
    expect(depositMon(state, 2)).toBe("ok");
    expect(state.party).toHaveLength(5);
    expect(state.box[2]).toEqual(mon);
    expect(withdrawMon(state, 2)).toBe("ok");
    expect(state.party[5]).toEqual(mon);
  });
  it("não retira um sétimo Pokémon nem altera a Box ao recusar", () => {
    const before = structuredClone(state);
    expect(withdrawMon(state, 0)).toBe("party_full");
    expect(state).toEqual(before);
  });
  it("não deixa a equipe vazia ou sem Pokémon com energia", () => {
    state.party = state.party.slice(0, 1);
    expect(depositMon(state, 0)).toBe("last_mon");
    state.party.push(createMon("weedle", 5, () => 0.5)); state.party[1].hp = 0;
    expect(depositMon(state, 0)).toBe("last_healthy");
    state.box[0].hp = 0;
    expect(exchangeMon(state, 0, 0)).toBe("last_healthy");
    expect(exchangeMon(state, 0, 1)).toBe("ok");
  });
  it("recusa índices inexistentes sem alterar o save", () => {
    const before = structuredClone(state);
    expect(exchangeMon(state, 6, 0)).toBe("invalid");
    expect(exchangeMon(state, 0, -1)).toBe("invalid");
    expect(depositMon(state, 0.5)).toBe("invalid");
    expect(withdrawMon(state, 12)).toBe("invalid");
    expect(state).toEqual(before);
  });
  it("preserva a troca ao salvar e continuar", () => {
    const uid = state.box[0].uid;
    useGame.getState().loadState(state);
    useGame.getState().update((live) => { exchangeMon(live, 0, 0); });
    useGame.getState().save();
    useGame.getState().quit();
    expect(useGame.getState().continueGame()).toBe(true);
    expect(useGame.getState().live?.party[0].uid).toBe(uid);
    expect(useGame.getState().live?.party.length).toBe(6);
  });
});
