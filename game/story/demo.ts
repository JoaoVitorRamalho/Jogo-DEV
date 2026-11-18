import { TYPE_COLOR } from "@/data/pokemon/types";
import { move } from "@/data/pokemon/moves";
import { type DemoMon, useUi, wait } from "@/game/core/ui";
import type { BattleVisuals } from "@/game/phaser/bridge";
import { getContextTrack, playSfx, setContextTrack } from "@/lib/audio/engine";

type Side = "player" | "foe";

/** Batalha encenada: anima na cena de batalha, sem motor, sem afetar a equipe. */
export class BattleDemo {
  private constructor(private v: BattleVisuals, private track: string | null) {}

  static async open(title: string, background: string, foeSprite: string, foe: DemoMon): Promise<BattleDemo> {
    const track = getContextTrack();
    playSfx("battle");
    setContextTrack("battle");
    useUi.setState({ demo: { title, foe: null, mine: null } });
    const { openBattle } = await import("@/game/phaser/createGame");
    const v = await openBattle();
    await v.begin(background, foeSprite, null);
    patch("foe", foe);
    return new BattleDemo(v, track);
  }

  async sendOut(sprite: string, mon: DemoMon): Promise<void> {
    await this.v.sendOut("player", sprite);
    patch("player", mon);
  }

  /** Golpe de um lado no outro; o PS do alvo cai para `hpAfter`. */
  async strike(side: Side, moveId: string, hpAfter: number, strong = false): Promise<void> {
    const def = move(moveId);
    await this.v.attack(side, Number.parseInt(TYPE_COLOR[def.type].slice(1), 16), def.category);
    const target: Side = side === "player" ? "foe" : "player";
    if (def.category === "status") {
      await this.v.status(target, 0x9fb7ff);
      return;
    }
    playSfx(strong ? "super" : "hit");
    patch(target, { hp: hpAfter });
    await this.v.hit(target, strong);
    await wait(250);
  }

  async capture(shakes: number, caught: boolean): Promise<void> {
    playSfx("catch");
    await this.v.throwBall(shakes, caught);
    if (caught) patch("foe", null);
  }

  async withdraw(side: Side): Promise<void> {
    await this.v.withdraw(side);
    patch(side, null);
  }

  async close(): Promise<void> {
    this.v.end();
    const { closeBattle } = await import("@/game/phaser/createGame");
    closeBattle();
    useUi.setState({ demo: null });
    if (this.track) setContextTrack(this.track);
  }
}

function patch(side: Side, value: Partial<DemoMon> | null): void {
  const demo = useUi.getState().demo;
  if (!demo) return;
  const key = side === "player" ? "mine" : "foe";
  const current = demo[key];
  const next = value === null ? null : current ? { ...current, ...value } : (value as DemoMon);
  useUi.setState({ demo: { ...demo, [key]: next } });
}
