import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUi } from "@/game/core/ui";
import { WorldScene } from "@/game/phaser/scenes/WorldScene";
import { useGame } from "@/game/state/store";
import { defaultAppearance } from "@/game/character/appearance";

vi.mock("phaser", () => ({ Scene: class {} }));

describe("movimento durante cenas", () => {
  beforeEach(() => useUi.setState({ locked: 0, battle: null, dialog: null, choice: null, panel: null, evolution: null, demo: null }));

  function setup(scripted = false) {
    const scene = new WorldScene();
    const advance = vi.fn(() => false);
    Object.assign(scene, {
      ready: true, time: { now: 100 },
      player: { moving: true, resolve: scripted ? () => {} : null, advance, frame: vi.fn(), depth: () => 10, sprite: { setDepth: vi.fn() } },
    });
    return { scene, advance };
  }

  it("congela um passo manual em andamento enquanto o NPC se aproxima", async () => {
    const { scene, advance } = setup();
    let finish!: () => void;
    const pending = scene.runScript(() => new Promise<void>((resolve) => { finish = resolve; }));
    expect(useUi.getState().locked).toBeGreaterThan(0);
    scene.pending = { right: true, menu: true };
    scene.updatePlayer(100, 0.05);
    expect(advance).not.toHaveBeenCalled();
    expect(scene.pending).toEqual({});
    finish();
    await pending;
    expect(useUi.getState().locked).toBe(0);
    scene.updatePlayer(300, 0.05);
    expect(advance).toHaveBeenCalledOnce();
  });

  it("deixa o roteiro mover o jogador mesmo com os controles bloqueados", () => {
    const { scene, advance } = setup(true);
    useUi.setState({ locked: 1 });
    scene.updatePlayer(100, 0.05);
    expect(advance).toHaveBeenCalledOnce();
  });
});

describe("corrida liberada pelo Lenço da Mãe", () => {
  beforeEach(() => {
    useUi.setState({ locked: 0, battle: null, dialog: null, choice: null, panel: null, evolution: null, demo: null });
    useGame.getState().newGame(defaultAppearance());
  });

  function step(flags: Record<string, boolean>, run = true) {
    useGame.getState().update((state) => { state.flags = flags; });
    const scene = new WorldScene();
    const begin = vi.fn();
    Object.assign(scene, {
      ready: true, time: { now: 100 }, held: { up: true, run }, lastDir: "up", isBlocked: () => false,
      player: { moving: false, resolve: null, dir: "up", tx: 5, ty: 5, frame: vi.fn(), depth: () => 10, sprite: { setDepth: vi.fn() }, begin },
    });
    scene.updatePlayer(100, 0.05);
    return begin.mock.calls[0]?.[1];
  }

  it("só acelera segurando correr depois de receber o lenço", () => {
    const walk = step({});
    expect(step({ ch1_scarf: true })).toBeLessThan(walk);
    expect(step({ ch1_scarf: true }, false)).toBe(walk);
  });

  it("preserva a corrida em saves antigos que já concluíram a despedida", () => {
    expect(step({ said_goodbye: true })).toBe(step({ ch1_scarf: true }));
    expect(step({ chapter1_complete: true })).toBe(step({ ch1_scarf: true }));
  });
});
