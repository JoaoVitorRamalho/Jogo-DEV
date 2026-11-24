import { beforeEach, describe, expect, it } from "vitest";
import { defaultAppearance } from "@/game/character/appearance";
import { useGame } from "@/game/state/store";
import { CH2_VISIBLE } from "@/game/story/chapter2";

describe("encontro com Cora na floresta", () => {
  beforeEach(() => useGame.getState().newGame(defaultAppearance()));

  function flags(values: Record<string, boolean>) {
    useGame.getState().update((state) => { state.flags = values; });
  }

  it("mostra Cora e o pesquisador após a chegada a Ferrúria, sem exigir visita ao ginásio", () => {
    flags({ chapter1_complete: true, ch2_started: true });
    expect(CH2_VISIBLE.cora_forest()).toBe(true);
    expect(CH2_VISIBLE.thomas_researcher()).toBe(true);
  });

  it("continua aceitando saves que já receberam a missão do guarda", () => {
    flags({ ch2_gym_closed: true });
    expect(CH2_VISIBLE.cora_forest()).toBe(true);
  });

  it("retira os dois da floresta após o encontro com Cora", () => {
    flags({ chapter1_complete: true, ch2_started: true, ch2_met_cora: true });
    expect(CH2_VISIBLE.cora_forest()).toBe(false);
    expect(CH2_VISIBLE.thomas_researcher()).toBe(false);
    expect(CH2_VISIBLE.gym_guard()).toBe(false);
  });

  it("não antecipa o encontro durante o capítulo 1", () => {
    expect(CH2_VISIBLE.cora_forest()).toBe(false);
    expect(CH2_VISIBLE.thomas_researcher()).toBe(false);
  });
});
