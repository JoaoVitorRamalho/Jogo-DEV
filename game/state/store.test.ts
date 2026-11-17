import { beforeEach, describe, expect, it } from "vitest";
import { defaultAppearance } from "@/game/character/appearance";
import { giveItem, migrateLegacy, takeItem, useGame } from "@/game/state/store";

describe("estado do jogo", () => {
  beforeEach(() => {
    useGame.setState({ slot: null, live: null });
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
