import { describe, expect, it } from "vitest";
import { ITEMS, canUseInBattle } from "@/data/items";

describe("itens disponíveis em batalha", () => {
  it("separa os Doces Raros no bolso de treino e bloqueia seu uso nos dois tipos de luta", () => {
    expect(ITEMS.rare_candy.pocket).toBe("training");
    expect(canUseInBattle("rare_candy", "wild")).toBe(false);
    expect(canUseInBattle("rare_candy", "trainer")).toBe(false);
  });

  it("permite remédios e mantém as pedras fora da lista de consumíveis", () => {
    for (const kind of ["wild", "trainer"] as const) {
      expect(canUseInBattle("potion", kind)).toBe(true);
      expect(canUseInBattle("antidote", kind)).toBe(true);
      expect(canUseInBattle("venusaurite", kind)).toBe(false);
    }
  });

  it("só oferece Pokébolas nas batalhas selvagens", () => {
    expect(canUseInBattle("pokeball", "wild")).toBe(true);
    expect(canUseInBattle("greatball", "wild")).toBe(true);
    expect(canUseInBattle("pokeball", "trainer")).toBe(false);
    expect(canUseInBattle("greatball", "trainer")).toBe(false);
  });
});
