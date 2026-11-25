import { describe, expect, it } from "vitest";
import { parseSaveFile, serializeSave } from "@/game/state/saveFiles";
import { completeSave, testSave } from "@/game/state/testSave";

describe("arquivos de save", () => {
  it("exporta e importa todos os Pokémon, itens, flags e IVs sem perda", () => {
    const state = completeSave(testSave());
    state.badges = ["casulo"];
    state.flags.beat_leader_cora = true;
    state.party[0].hp = 1;
    state.party[0].moves[0].pp = 0;
    expect(parseSaveFile(serializeSave(state))).toEqual(state);
  });

  it("aceita o registro original do navegador sem importar seus backups", () => {
    const slot = testSave();
    expect(parseSaveFile(JSON.stringify({ version: 2, state: { slot, backups: ["ignored"] } }))).toEqual(slot);
  });

  it("rejeita arquivos de outro formato ou uma versão futura", () => {
    for (const text of ["não é JSON", "null", "{}", '{"version":3,"state":{}}']) expect(() => parseSaveFile(text)).toThrow();
  });

  it("rejeita equipes ou itens inválidos antes de substituir o save atual", () => {
    for (const corrupt of [
      (s: ReturnType<typeof testSave>) => { s.party[0].species = "inexistente"; },
      (s: ReturnType<typeof testSave>) => { s.party[0].moves[0].id = "inexistente"; },
      (s: ReturnType<typeof testSave>) => { s.party[0].ivs.hp = -1; },
      (s: ReturnType<typeof testSave>) => { s.party.push(s.party[0]); },
      (s: ReturnType<typeof testSave>) => { s.bag.potion = -1; },
      (s: ReturnType<typeof testSave>) => { s.map = "inexistente"; },
    ]) {
      const state = testSave();
      corrupt(state);
      expect(() => parseSaveFile(serializeSave(state))).toThrow(/inválidos/);
    }
  });
});
