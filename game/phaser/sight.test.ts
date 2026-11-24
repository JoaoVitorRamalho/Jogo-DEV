import { describe, expect, it } from "vitest";
import { hasTrainerSight } from "@/game/phaser/sight";

describe("visão curta dos treinadores", () => {
  const npc = { x: 5, y: 5, dir: "down" as const };
  const clear = () => false;

  it("desafia apenas quem cruza as duas casas à frente", () => {
    expect(hasTrainerSight(npc, { x: 5, y: 6 }, clear)).toBe(true);
    expect(hasTrainerSight(npc, { x: 5, y: 7 }, clear)).toBe(true);
    expect(hasTrainerSight(npc, { x: 5, y: 8 }, clear)).toBe(false);
  });

  it("permite passar ao lado, na diagonal e atrás", () => {
    for (const player of [{ x: 4, y: 5 }, { x: 6, y: 5 }, { x: 4, y: 6 }, { x: 5, y: 4 }]) {
      expect(hasTrainerSight(npc, player, clear)).toBe(false);
    }
  });

  it("respeita obstáculos entre o treinador e o jogador", () => {
    expect(hasTrainerSight(npc, { x: 5, y: 7 }, (x, y) => x === 5 && y === 6)).toBe(false);
  });

  it("muda a direção da visão junto com o NPC", () => {
    expect(hasTrainerSight({ ...npc, dir: "left" }, { x: 3, y: 5 }, clear)).toBe(true);
    expect(hasTrainerSight({ ...npc, dir: "left" }, { x: 5, y: 7 }, clear)).toBe(false);
  });
});
