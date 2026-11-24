import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppearance, type Direction } from "@/game/character/appearance";
import { seeded } from "@/game/core/rng";
import { type WorldApi, bridge } from "@/game/phaser/bridge";
import { createMon } from "@/game/pokemon/mon";
import { useGame } from "@/game/state/store";
import { spottedBy } from "@/game/story/actions";

vi.mock("@/lib/audio/engine", () => ({ playSfx: vi.fn() }));
vi.mock("@/game/core/ui", async (original) => ({
  ...await original<typeof import("@/game/core/ui")>(),
  say: vi.fn().mockResolvedValue(undefined),
  battle: vi.fn().mockResolvedValue("win"),
}));

describe("passagem livre depois de um desafio", () => {
  beforeEach(() => {
    useGame.getState().newGame(defaultAppearance());
    useGame.getState().update((state) => {
      state.flags.license = true;
      state.party = [createMon("froakie", 10, seeded(1))];
    });
  });

  it("faz o treinador voltar ao ponto de origem depois da vitória", async () => {
    const position = { x: 7, y: 32 };
    const walks: Direction[][] = [];
    const delta: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    bridge.world = {
      mapKey: () => "route1",
      npcTile: () => ({ ...position }),
      playerTile: () => ({ x: 7, y: 34, dir: "up" }),
      emote: async () => {},
      facePlayer: () => {},
      faceNpcToPlayer: () => {},
      moveNpc: async (_id: string, steps: Direction[]) => {
        walks.push(steps);
        for (const step of steps) { position.x += delta[step][0]; position.y += delta[step][1]; }
      },
    } as unknown as WorldApi;
    try {
      await spottedBy("youngster_caio", "youngster");
      expect(walks).toEqual([["down"], ["up"]]);
      expect(position).toEqual({ x: 7, y: 32 });
      expect(useGame.getState().live?.flags.beat_youngster_caio).toBe(true);
    } finally {
      bridge.world = null;
    }
  });
});
