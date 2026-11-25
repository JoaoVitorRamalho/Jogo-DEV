import { beforeEach, describe, expect, it } from "vitest";
import { defaultAppearance } from "@/game/character/appearance";
import { giveItem, migrateLegacy, takeItem, useGame } from "@/game/state/store";
import { completeSave, testSave } from "@/game/state/testSave";

describe("estado do jogo", () => {
  beforeEach(() => {
    useGame.setState({ slot: null, live: null, backups: [] });
  });

  it("concede recompensa uma única vez, mesmo chamando de novo", () => {
    useGame.getState().newGame(defaultAppearance());
    const give = () => useGame.getState().grantOnce("gift_potion", (state) => giveItem(state, "potion", 2));
    expect(give()).toBe(true);
    expect(give()).toBe(false);
    expect(useGame.getState().live?.bag.potion).toBe(2);
  });

  it("recarregar o save não duplica recompensas ganhas depois dele", () => {
    useGame.getState().newGame(defaultAppearance());
    useGame.getState().grantOnce("gift_potion", (state) => giveItem(state, "potion", 1));
    useGame.getState().save();
    useGame.getState().grantOnce("gift_ball", (state) => giveItem(state, "pokeball", 5));
    useGame.getState().continueGame();
    expect(useGame.getState().live?.bag.pokeball).toBeUndefined();
    useGame.getState().grantOnce("gift_potion", (state) => giveItem(state, "potion", 1));
    expect(useGame.getState().live?.bag.potion).toBe(1);
  });

  it("não deixa a mochila ficar negativa", () => {
    useGame.getState().newGame(defaultAppearance());
    useGame.getState().update((state) => {
      expect(takeItem(state, "potion")).toBe(false);
      giveItem(state, "potion");
      expect(takeItem(state, "potion")).toBe(true);
      expect(state.bag.potion).toBeUndefined();
    });
  });

  it("preserva a jornada ao abrir o mundo de teste e permite recuperá-la", () => {
    useGame.getState().newGame(defaultAppearance());
    useGame.getState().update((state) => { state.flags.beat_leader_cora = true; state.badges = ["casulo"]; });
    useGame.getState().save();
    const original = structuredClone(useGame.getState().slot);
    useGame.getState().loadState(testSave(), "test");
    const backup = useGame.getState().backups[0];
    expect(backup.reason).toBe("test");
    expect(backup.state).toEqual(original);
    useGame.getState().update((state) => { state.money = 99; });
    useGame.getState().save();
    expect(backup.state).toEqual(original);
    useGame.getState().loadState(backup.state, "restore");
    expect(useGame.getState().slot).toEqual(original);
    expect(useGame.getState().backups[0].state.money).toBe(99);
  });

  it("faz backup antes de completar o save, importar ou começar outro jogo", () => {
    useGame.getState().newGame(defaultAppearance());
    const original = structuredClone(useGame.getState().slot!);
    useGame.getState().loadState(completeSave(original), "complete");
    expect(useGame.getState().backups[0].state).toEqual(original);
    const complete = structuredClone(useGame.getState().slot!);
    useGame.getState().loadState(original, "import");
    expect(useGame.getState().backups[0].state).toEqual(complete);
    useGame.getState().newGame({ ...defaultAppearance(), name: "Outra pessoa" });
    expect(useGame.getState().backups.some((backup) => JSON.stringify(backup.state) === JSON.stringify(original))).toBe(true);
  });

  it("mantém até dez backups diferentes sem duplicar o mesmo snapshot", () => {
    useGame.getState().newGame(defaultAppearance());
    for (let money = 1; money <= 12; money++) {
      useGame.getState().loadState({ ...useGame.getState().slot!, money });
    }
    expect(useGame.getState().backups).toHaveLength(10);
    expect(useGame.getState().backups.at(-1)?.state.money).toBe(2);
    useGame.getState().loadState(useGame.getState().slot!);
    useGame.getState().loadState(useGame.getState().slot!);
    expect(useGame.getState().backups).toHaveLength(10);
    expect(new Set(useGame.getState().backups.map((backup) => backup.state.money)).size).toBe(10);
  });

  it("migra um save antigo do capítulo em Three.js", () => {
    const state = migrateLegacy({
      appearance: { sex: "female", name: "Lina", hair: "hair_bob", hairColor: "blonde" },
      x: 857,
      y: 600,
      direction: "right",
      story: { map: "brisamar", woke: true, motherBlessing: true, choseStarter: true, starter: "froakie", tutorialDone: true },
    });
    expect(state.appearance.name).toBe("Lina");
    expect(state.appearance.hairStyle).toBe("bob");
    expect(state.party[0].species).toBe("froakie");
    expect(state.flags.rival_battle_done).toBe(true);
    expect(state.map).toBe("brisamar");
  });
});
