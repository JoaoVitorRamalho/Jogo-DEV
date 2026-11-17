import * as Phaser from "phaser";
import { type BattleVisuals, bridge } from "@/game/phaser/bridge";
import { monTexture } from "@/game/phaser/constants";

const FOE = { x: 184, y: 66, platX: 128, platY: 50 };
const MINE = { x: 58, y: 106, platX: -10, platY: 86 };
const SCALE = 2;

export class BattleScene extends Phaser.Scene {
  foe: Phaser.GameObjects.Image | null = null;
  mine: Phaser.GameObjects.Image | null = null;
  bg: Phaser.GameObjects.Image | null = null;
  platforms: Phaser.GameObjects.Image[] = [];
  static ready: ((visuals: BattleVisuals) => void) | null = null;

  constructor() {
    super("battle");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#000000");
    this.foe = null;
    this.mine = null;
    this.platforms = [];
    const visuals = this.visuals();
    bridge.battle = visuals;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (bridge.battle === visuals) bridge.battle = null;
    });
    const ready = BattleScene.ready;
    BattleScene.ready = null;
    ready?.(visuals);
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({ ...config, onComplete: () => resolve() });
    });
  }

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, () => resolve()));
  }

  sprite(side: "player" | "foe"): Phaser.GameObjects.Image | null {
    return side === "player" ? this.mine : this.foe;
  }

  place(side: "player" | "foe", key: string): Phaser.GameObjects.Image {
    const at = side === "player" ? MINE : FOE;
    const existing = this.sprite(side);
    existing?.destroy();
    const image = this.add
      .image(at.x, at.y, monTexture(key, (k) => this.textures.exists(k)))
      .setOrigin(0.5, 1)
      .setScale(SCALE)
      .setDepth(10);
    if (side === "player") {
      image.setFlipX(true);
      this.mine = image;
    } else {
      this.foe = image;
    }
    return image;
  }

  visuals(): BattleVisuals {
    return {
      begin: async (background, foeSprite, playerSprite) => {
        const key = this.textures.exists(`bg_${background}`) ? background : "grass";
        this.bg?.destroy();
        this.bg = this.add.image(0, 0, `bg_${key}`).setOrigin(0, 0).setDepth(0);
        const enemyPlat = this.add.image(FOE.platX + 260, FOE.platY, `plat_${key}_enemy`).setOrigin(0, 0).setDepth(1);
        const myPlat = this.add.image(MINE.platX - 260, MINE.platY, `plat_${key}_player`).setOrigin(0, 0).setDepth(1);
        this.platforms = [enemyPlat, myPlat];
        const foe = this.place("foe", foeSprite);
        foe.x += 260;
        foe.setTint(0x202020);
        this.cameras.main.fadeIn(250, 255, 255, 255);
        await Promise.all([
          this.tween({ targets: [enemyPlat, foe], x: "-=260", duration: 650, ease: "Sine.easeOut" }),
          this.tween({ targets: myPlat, x: "+=260", duration: 650, ease: "Sine.easeOut" }),
        ]);
        foe.clearTint();
        if (playerSprite) await this.visuals().sendOut("player", playerSprite);
      },
      sendOut: async (side, key) => {
        const image = this.place(side, key);
        image.setScale(0).setTintFill(0xffffff);
        await this.tween({ targets: image, scale: SCALE, duration: 260, ease: "Back.easeOut" });
        image.clearTint();
      },
      withdraw: async (side) => {
        const image = this.sprite(side);
        if (!image) return;
        image.setTintFill(0xffffff);
        await this.tween({ targets: image, scale: 0, duration: 200 });
        image.destroy();
        if (side === "player") this.mine = null;
        else this.foe = null;
      },
      attack: async (side, tint) => {
        const image = this.sprite(side);
        if (!image) return;
        const dx = side === "player" ? 14 : -14;
        await this.tween({ targets: image, x: image.x + dx, y: image.y - 4, duration: 90, yoyo: true });
        const target = this.sprite(side === "player" ? "foe" : "player");
        if (target) {
          const burst = this.add.circle(target.x, target.y - 28, 4, tint, 0.9).setDepth(20);
          await this.tween({ targets: burst, radius: 18, alpha: 0, duration: 220 });
          burst.destroy();
        }
      },
      hit: async (side, strong) => {
        const image = this.sprite(side);
        if (!image) return;
        if (strong) this.cameras.main.shake(160, 0.012);
        for (let i = 0; i < 3; i += 1) {
          image.setAlpha(0);
          await this.wait(70);
          image.setAlpha(1);
          await this.wait(70);
        }
      },
      faint: async (side) => {
        const image = this.sprite(side);
        if (!image) return;
        await this.tween({ targets: image, y: image.y + 40, alpha: 0, duration: 380, ease: "Sine.easeIn" });
        image.destroy();
        if (side === "player") this.mine = null;
        else this.foe = null;
      },
      status: async (side, tint) => {
        const image = this.sprite(side);
        if (!image) return;
        image.setTint(tint);
        await this.wait(260);
        image.clearTint();
      },
      throwBall: async (shakes, caught) => {
        const foe = this.foe;
        const ball = this.add.image(40, 120, "item_ball").setDepth(30);
        await this.tween({
          targets: ball,
          x: FOE.x,
          y: FOE.y - 30,
          angle: 540,
          duration: 520,
          ease: "Quad.easeOut",
        });
        if (foe) {
          foe.setTintFill(0xffffff);
          await this.tween({ targets: foe, scale: 0, duration: 200 });
        }
        await this.tween({ targets: ball, y: FOE.y - 6, duration: 240, ease: "Bounce.easeOut" });
        for (let i = 0; i < shakes; i += 1) {
          await this.tween({ targets: ball, angle: { from: -25, to: 25 }, duration: 160, yoyo: true });
          await this.wait(220);
        }
        if (caught) {
          ball.setTint(0x9a9a9a);
          for (let i = 0; i < 6; i += 1) {
            const star = this.add.rectangle(ball.x, ball.y, 2, 2, 0xfff2a0).setDepth(31);
            const angle = (i / 6) * Math.PI * 2;
            this.tween({ targets: star, x: ball.x + Math.cos(angle) * 14, y: ball.y + Math.sin(angle) * 10, alpha: 0, duration: 420 }).then(() => star.destroy());
          }
          await this.wait(450);
          return;
        }
        ball.destroy();
        if (foe) {
          foe.clearTint();
          foe.setTintFill(0xffffff);
          await this.tween({ targets: foe, scale: SCALE, duration: 220 });
          foe.clearTint();
        }
      },
      end: () => {
        if (this.scene.isPaused("world")) this.scene.resume("world");
        this.scene.stop();
      },
    };
  }
}
