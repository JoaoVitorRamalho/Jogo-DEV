import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUESTS, questProgress } from "@/data/quests";
import { defaultAppearance } from "@/game/character/appearance";
import { ask, battle, say, useUi } from "@/game/core/ui";
import { bridge, type WorldApi } from "@/game/phaser/bridge";
import { createMon } from "@/game/pokemon/mon";
import { useGame } from "@/game/state/store";
import { CH3_SIGN_RUN, CH3_TALK, CH3_VISIBLE, ch3CanWarp, ch3Enter, ch3Event, startOpening } from "@/game/story/chapter3";

vi.mock("@/lib/audio/engine", () => ({ playSfx: vi.fn(), playCry: vi.fn() }));
vi.mock("@/game/core/ui", async (original) => ({
  ...await original<typeof import("@/game/core/ui")>(),
  say: vi.fn().mockResolvedValue(undefined),
  ask: vi.fn().mockResolvedValue(0),
  battle: vi.fn().mockResolvedValue("win"),
}));

describe("abertura do capítulo 3 — Ecos sob a Pedra", () => {
  let map: string;
  const flags = () => useGame.getState().live!.flags;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(battle).mockResolvedValue("win");
    vi.mocked(ask).mockResolvedValue(0);
    useGame.getState().newGame(defaultAppearance());
    useGame.setState({ save: vi.fn() });
    useUi.setState({ showToast: vi.fn() });
    useGame.getState().update((state) => {
      state.flags = { chapter1_complete: true, chapter2_complete: true, license: true };
      state.party = [createMon("froakie", 15, () => 0.5)];
    });
    map = "route2";
    bridge.world = {
      mapKey: () => map, playerTile: () => ({ x: 28, y: 19, dir: "up" }),
      refreshNpcs: vi.fn(), emote: vi.fn().mockResolvedValue(undefined), flash: vi.fn().mockResolvedValue(undefined),
      warp: vi.fn(async (destination: string) => { map = destination; }),
    } as unknown as WorldApi;
  });

  it("direciona ao bosque, preservando o bloqueio da estrada principal até o resgate", async () => {
    await startOpening();
    expect(flags().ch3_started).toBe(true);
    expect(flags().ch3_road_open).toBeUndefined();
    expect(await ch3CanWarp("ferruria", "route3")).toBe(false);
    expect(await ch3CanWarp("route2", "echo_grove")).toBe(false);
    await CH3_TALK.ranger_r2();
    expect(await ch3CanWarp("route2", "echo_grove")).toBe(true);
    await ch3Enter("echo_grove");
    expect(flags().ch3_grove_entered).toBe(true);
    expect(await ch3CanWarp("echo_grove", "route3")).toBe(true);
    expect(await ch3CanWarp("route3", "verdelume")).toBe(false);
  });

  it("pede a conversa com Nádia antes da caverna e oferece cura no acampamento", async () => {
    map = "route3";
    expect(await ch3CanWarp("route3", "echo_cave")).toBe(false);
    useGame.getState().update((state) => { state.party[0].hp = 1; });
    await CH3_TALK.echo_researcher();
    expect(flags().ch3_cave_help).toBe(true);
    expect(flags().ch3_camp).toBe(true);
    expect(useGame.getState().live!.party[0].hp).toBeGreaterThan(1);
    expect(await ch3CanWarp("route3", "echo_cave")).toBeNull();
    expect(flags().ch3_cave_rescued).toBeUndefined();
  });

  it("encerra o resgate apenas depois das batalhas, painel, Bidoof e retorno a Nádia", async () => {
    const uid = useGame.getState().live!.party[0].uid;
    map = "echo_cave";
    await CH3_SIGN_RUN.echo_console();
    await CH3_TALK.echo_bidoof();
    expect(flags().ch3_bidoof_safe).toBeUndefined();
    for (const event of ["echo_grunt_1_challenge", "echo_grunt_2_challenge", "echo_lead_challenge"]) await ch3Event(event);
    expect(vi.mocked(battle)).toHaveBeenCalledTimes(3);
    expect(CH3_VISIBLE.echo_lead()).toBe(false);
    expect(flags().ch3_cave_rescued).toBeUndefined();
    vi.mocked(ask).mockResolvedValueOnce(1);
    await CH3_SIGN_RUN.echo_console();
    expect(CH3_VISIBLE.echo_cage()).toBe(true);
    await CH3_SIGN_RUN.echo_console();
    expect(CH3_VISIBLE.echo_cage()).toBe(false);
    await CH3_TALK.echo_bidoof();
    expect(flags().ch3_bidoof_safe).toBe(true);
    expect(CH3_VISIBLE.echo_bidoof()).toBe(false);
    expect(CH3_VISIBLE.echo_bidoof_home()).toBe(true);
    expect(flags().ch3_road_open).toBeUndefined();
    map = "route3";
    await CH3_TALK.echo_researcher();
    expect(flags().ch3_cave_rescued).toBe(true);
    expect(await ch3CanWarp("route3", "verdelume")).toBeNull();
    expect(await ch3CanWarp("ferruria", "route3")).toBe(true);
    expect(useGame.getState().live!.party.map((mon) => mon.uid)).toEqual([uid]);
    expect(useGame.getState().live!.bag.super_potion).toBe(2);
    await CH3_TALK.echo_researcher();
    await ch3Event("echo_lead_challenge");
    expect(useGame.getState().live!.bag.super_potion).toBe(2);
    expect(vi.mocked(battle)).toHaveBeenCalledTimes(3);
    const transcript = vi.mocked(say).mock.calls.flatMap(([lines]) => typeof lines === "string" ? [lines] : lines.map((line) => line.text)).join(" ");
    expect(transcript).not.toMatch(/Giovanni|Equipe Rocket|Thomas comanda/i);
  });

  it("derrota no confronto retorna ao acampamento sem marcar vitória ou abrir o cercado", async () => {
    useGame.getState().update((state) => { state.flags.ch3_camp = true; });
    map = "echo_cave";
    vi.mocked(battle).mockResolvedValueOnce("lose");
    await ch3Event("echo_grunt_1_challenge");
    expect(map).toBe("route3");
    expect(bridge.world!.warp).toHaveBeenCalledWith("route3", 28, 19, "down");
    expect(flags().beat_rocket_echo_1).toBeUndefined();
    expect(flags().ch3_machine_off).toBeUndefined();
    expect(CH3_VISIBLE.echo_grunt_1()).toBe(true);
    map = "echo_cave";
    await ch3Event("echo_grunt_1_challenge");
    expect(flags().beat_rocket_echo_1).toBe(true);
  });

  it("saves que já chegaram a Verdelume continuam no ponto correto do diário", async () => {
    useGame.getState().update((state) => { state.flags.ch3_arrived = true; });
    expect(await ch3CanWarp("route3", "verdelume")).toBeNull();
    const quest = QUESTS.find((entry) => entry.id === "act2_verdelume")!;
    expect(questProgress(quest, flags()).current?.flag).toBe("ch3_field");
    expect(await ch3Event("north_gate")).toBeNull();
  });
});
