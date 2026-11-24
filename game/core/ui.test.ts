import { beforeEach, describe, expect, it, vi } from "vitest";
import { battle, lock, useUi, worldBusy } from "@/game/core/ui";
import { bridge, type WorldApi } from "@/game/phaser/bridge";
import { createMon } from "@/game/pokemon/mon";

vi.mock("@/lib/audio/engine", () => ({ getContextTrack: () => "town", playSfx: vi.fn(), setContextTrack: vi.fn() }));

describe("bloqueio das cenas", () => {
  beforeEach(() => {
    useUi.setState({ locked: 0, battle: null, dialog: null, choice: null, panel: null, evolution: null, demo: null });
    bridge.world = null;
  });

  it("bloqueia desde o primeiro instante da transição até o fim da batalha", async () => {
    let release!: () => void;
    const intro = new Promise<void>((resolve) => { release = resolve; });
    bridge.world = { battleIntro: () => intro } as unknown as WorldApi;
    const pending = battle({ kind: "wild", playerParty: [createMon("froakie", 5, () => 0.5)], foeParty: [createMon("bidoof", 3, () => 0.5)], bag: {} });
    expect(worldBusy()).toBe(true);
    expect(useUi.getState().battle).toBeNull();
    release();
    await vi.waitFor(() => expect(useUi.getState().battle).not.toBeNull());
    expect(worldBusy()).toBe(true);
    const request = useUi.getState().battle!;
    useUi.setState({ battle: null });
    request.resolve("run");
    await expect(pending).resolves.toBe("run");
    expect(worldBusy()).toBe(false);
    bridge.world = null;
  });

  it("mantém o bloqueio da cena após terminar um movimento interno", async () => {
    await lock(async () => {
      await lock(async () => { expect(useUi.getState().locked).toBe(2); });
      expect(useUi.getState().locked).toBe(1);
      expect(worldBusy()).toBe(true);
    });
    expect(worldBusy()).toBe(false);
  });

  it("libera os controles quando uma cena falha", async () => {
    await expect(lock(async () => { throw new Error("cena interrompida"); })).rejects.toThrow("cena interrompida");
    expect(worldBusy()).toBe(false);
  });
});
