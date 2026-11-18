import * as Phaser from "phaser";
import type { MoveCategory } from "@/data/pokemon/moves";
import { type BattleVisuals, bridge } from "@/game/phaser/bridge";
import { monTexture } from "@/game/phaser/constants";

const FOE = { x: 184, y: 64, platX: 128, platY: 50, height: 56 };
const MINE = { x: 58, y: 102, platX: -10, platY: 86, height: 60 };

type Trim = { originX: number; originY: number; height: number };

export class BattleScene extends Phaser.Scene {
  foe: Phaser.GameObjects.Image | null = null;
  mine: Phaser.GameObjects.Image | null = null;
  bg: Phaser.GameObjects.Image | null = null;
  platforms: Phaser.GameObjects.Image[] = [];
  trims = new Map<string, Trim>();
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

  targetPoint(side: "player" | "foe"): { x: number; y: number } | null {
    const target = this.sprite(side);
    if (!target) return null;
    return { x: target.x, y: target.y - 28 };
  }

  async impactBurst(x: number, y: number, tint: number, radius = 20): Promise<void> {
    const burst = this.add.circle(x, y, 4, tint, 0.92).setDepth(20);
    const flash = this.add.circle(x, y, 8, 0xffffff, 0.55).setDepth(19);
    await Promise.all([
      this.tween({ targets: burst, radius, alpha: 0, duration: 240, ease: "Quad.easeOut" }),
      this.tween({ targets: flash, radius: radius * 0.65, alpha: 0, duration: 180 }),
    ]);
    burst.destroy();
    flash.destroy();
  }

  async moveEffect(side: "player" | "foe", tint: number, category: MoveCategory): Promise<void> {
    const image = this.sprite(side);
    const foeSide = side === "player" ? "foe" : "player";
    const point = this.targetPoint(foeSide);
    if (!image || !point) return;
    this.stopIdle(image);

    if (category === "physical") {
      const dx = side === "player" ? 22 : -22;
      await this.tween({ targets: image, x: image.x + dx, y: image.y - 5, duration: 85, yoyo: true, ease: "Quad.easeOut" });
      await this.impactBurst(point.x, point.y, tint, 22);
    } else if (category === "special") {
      const fromY = image.y - image.displayHeight * 0.45;
      const proj = this.add.circle(image.x, fromY, 7, tint, 1).setDepth(25);
      const trail = this.add.circle(image.x, fromY, 10, tint, 0.35).setDepth(24);
      await Promise.all([
        this.tween({ targets: proj, x: point.x, y: point.y, duration: 220, ease: "Sine.easeIn" }),
        this.tween({ targets: trail, x: point.x, y: point.y, alpha: 0, scale: 0.4, duration: 220 }),
      ]);
      proj.destroy();
      trail.destroy();
      await this.impactBurst(point.x, point.y, tint, 26);
    } else {
      const parts: Phaser.GameObjects.Arc[] = [];
      for (let i = 0; i < 10; i += 1) {
        const a = (i / 10) * Math.PI * 2;
        const p = this.add.circle(point.x + Math.cos(a) * 24, point.y + Math.sin(a) * 14, 4, tint, 0.9).setDepth(20);
        parts.push(p);
      }
      image.setTint(tint);
      await Promise.all(parts.map((p) => this.tween({ targets: p, x: point.x, y: point.y, alpha: 0, duration: 300, ease: "Sine.easeIn" })));
      image.clearTint();
      for (const p of parts) p.destroy();
      await this.impactBurst(point.x, point.y, tint, 14);
    }
    this.startIdle(image);
  }

  burst(x: number, y: number, tint: number): void {
    const ring = this.add.circle(x, y, 4).setStrokeStyle(2, tint, 1).setDepth(29);
    this.tween({ targets: ring, radius: 30, alpha: 0, duration: 420, ease: "Cubic.easeOut" }).then(() => ring.destroy());
    const core = this.add.circle(x, y, 10, 0xffffff, 0.9).setDepth(29);
    this.tween({ targets: core, scale: 2.4, alpha: 0, duration: 300 }).then(() => core.destroy());
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const spark = this.add.rectangle(x, y, 2, 2, i % 2 ? tint : 0xffffff).setDepth(30);
      const dist = 18 + Math.random() * 16;
      this.tween({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist * 0.7,
        alpha: 0,
        duration: 380 + Math.random() * 160,
        ease: "Cubic.easeOut",
      }).then(() => spark.destroy());
    }
  }

  dust(x: number, y: number): void {
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const puff = this.add.circle(x + dir * 6, y, 2 + i, 0xf4ecd8, 0.8).setDepth(9);
        this.tween({ targets: puff, x: x + dir * (16 + i * 6), y: y - 2 - i, alpha: 0, scale: 1.6, duration: 360 + i * 60 }).then(() =>
          puff.destroy(),
        );
      }
    }
  }

  sprite(side: "player" | "foe"): Phaser.GameObjects.Image | null {
    return side === "player" ? this.mine : this.foe;
  }

  trim(key: string): Trim {
    const cached = this.trims.get(key);
    if (cached) return cached;
    const source = this.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const width = source.width || 1;
    const height = source.height || 1;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let left = 0;
    let right = width - 1;
    let bottom = height - 1;
    let top = 0;
    if (context) {
      context.drawImage(source, 0, 0);
      const data = context.getImageData(0, 0, width, height).data;
      left = width;
      right = 0;
      top = height;
      bottom = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3] < 20) continue;
          if (x < left) left = x;
          if (x > right) right = x;
          if (y < top) top = y;
          if (y > bottom) bottom = y;
        }
      }
      if (right < left) {
        left = 0;
        right = width - 1;
        top = 0;
        bottom = height - 1;
      }
    }
    const trim = { originX: (left + right) / 2 / width, originY: (bottom + 1) / height, height: bottom - top + 1 };
    this.trims.set(key, trim);
    return trim;
  }

  fit(image: Phaser.GameObjects.Image, side: "player" | "foe"): number {
    const slot = side === "player" ? MINE : FOE;
    const trim = this.trim(image.texture.key);
    const scale = Math.min(1.5, slot.height / trim.height);
    image.setOrigin(trim.originX, trim.originY).setScale(scale);
    image.setData("fit", scale);
    image.setData("homeY", slot.y);
    return scale;
  }

  stopIdle(image: Phaser.GameObjects.Image): void {
    const tween = image.getData("idle") as Phaser.Tweens.Tween | undefined;
    tween?.stop();
    image.setData("idle", null);
    const home = image.getData("homeY") as number | undefined;
    if (home !== undefined) image.y = home;
  }

  startIdle(image: Phaser.GameObjects.Image): void {
    this.stopIdle(image);
    const home = image.y;
    image.setData("homeY", home);
    const tween = this.tweens.add({
      targets: image,
      y: home - 2,
      duration: 680,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    image.setData("idle", tween);
  }

  place(side: "player" | "foe", key: string): Phaser.GameObjects.Image {
    const at = side === "player" ? MINE : FOE;
    const existing = this.sprite(side);
    if (existing) {
      this.stopIdle(existing);
      existing.destroy();
    }
    const back = side === "player";
    const image = this.add.image(at.x, at.y, monTexture(key, (k) => this.textures.exists(k), back)).setDepth(10);
    this.fit(image, side);
    if (side === "player") this.mine = image;
    else this.foe = image;
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
        const shine = this.add.image(foe.x, foe.y, foe.texture.key).setOrigin(foe.originX, foe.originY)
          .setScale(foe.scaleX, foe.scaleY).setDepth(11).setTintFill(0xffffff);
        this.tween({ targets: shine, alpha: 0, duration: 360 }).then(() => shine.destroy());
        this.startIdle(foe);
        if (playerSprite) await this.visuals().sendOut("player", playerSprite);
      },
      sendOut: async (side, key) => {
        const at = side === "player" ? MINE : FOE;
        const groundY = at.y - 4;
        // 1. a esfera voa em arco, girando
        const orb = this.add.image(side === "player" ? -8 : 248, groundY - 40, "item_ball").setDepth(30).setScale(0.75);
        const startX = orb.x;
        await this.tween({
          targets: orb,
          duration: 420,
          ease: "Linear",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const t = tween.progress;
            orb.angle = Math.sin(t * Math.PI * 3) * 14 * (1 - t); // balança de leve e chega de pé
            orb.x = Phaser.Math.Linear(startX, at.x, t);
            orb.y = Phaser.Math.Linear(groundY - 40, groundY - 18, t) - Math.sin(t * Math.PI) * 26;
          },
        } as Phaser.Types.Tweens.TweenBuilderConfig);
        // 2. abre com estouro de luz
        this.burst(orb.x, orb.y, 0xfff4c4);
        this.tween({ targets: orb, scale: 1.4, alpha: 0, duration: 180 }).then(() => orb.destroy());
        // 3. o Pokémon cresce de dentro do brilho e a cor volta aos poucos
        const image = this.place(side, key);
        const fit = image.getData("fit") as number;
        image.setScale(0, 0);
        const glow = this.add.image(image.x, image.y, image.texture.key).setOrigin(image.originX, image.originY)
          .setFlipX(image.flipX).setDepth(11).setTintFill(0xffffff).setScale(0);
        await Promise.all([
          this.tween({ targets: [image, glow], scaleX: fit, scaleY: fit, duration: 320, ease: "Back.easeOut" }),
        ]);
        await this.tween({ targets: glow, alpha: 0, duration: 280, ease: "Sine.easeIn" });
        glow.destroy();
        // 4. pousa com um quique e poeirinha
        this.dust(image.x, at.y);
        await this.tween({ targets: image, scaleY: fit * 0.9, scaleX: fit * 1.08, duration: 80, yoyo: true });
        image.setScale(fit);
        this.startIdle(image);
      },
      withdraw: async (side) => {
        const image = this.sprite(side);
        if (!image) return;
        this.stopIdle(image);
        image.setTintFill(0xfff4c4);
        const x = image.x;
        const y = image.y - 10;
        await this.tween({ targets: image, scaleX: 0, scaleY: 0.2, y: y, duration: 240, ease: "Cubic.easeIn" });
        image.destroy();
        this.burst(x, y, 0xfff4c4);
        await this.wait(160);
        if (side === "player") this.mine = null;
        else this.foe = null;
      },
      attack: async (side, tint, category) => this.moveEffect(side, tint, category),
      hit: async (side, strong) => {
        const image = this.sprite(side);
        if (!image) return;
        if (strong) this.cameras.main.shake(180, 0.014);
        const point = this.targetPoint(side);
        if (strong && point) await this.impactBurst(point.x, point.y, 0xff6040, 16);
        for (let i = 0; i < 3; i += 1) {
          image.setTint(strong ? 0xff8888 : 0xffffff);
          image.setAlpha(0.25);
          await this.wait(55);
          image.clearTint();
          image.setAlpha(1);
          await this.wait(55);
        }
      },
      faint: async (side) => {
        const image = this.sprite(side);
        if (!image) return;
        this.stopIdle(image);
        await this.tween({ targets: image, y: image.y + 28, alpha: 0, duration: 380, ease: "Sine.easeIn" });
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
        if (foe) this.stopIdle(foe);
        const fit = (foe?.getData("fit") as number | undefined) ?? 1;
        const ball = this.add.image(40, 120, "item_ball").setDepth(30).setScale(0.8);
        await this.tween({
          targets: ball,
          duration: 560,
          ease: "Linear",
          onUpdate: (tween: Phaser.Tweens.Tween) => {
            const t = tween.progress;
            ball.x = Phaser.Math.Linear(40, FOE.x, t);
            ball.y = Phaser.Math.Linear(120, FOE.y - 30, t) - Math.sin(t * Math.PI) * 34;
            ball.angle = Math.sin(t * Math.PI * 3) * 14 * (1 - t);
            ball.setScale(0.8 - t * 0.2);
          },
        } as Phaser.Types.Tweens.TweenBuilderConfig);
        ball.angle = 0;
        if (foe) {
          this.burst(ball.x, ball.y, 0xfff4c4);
          foe.setTintFill(0xfff4c4);
          await this.tween({ targets: foe, scaleX: 0, scaleY: 0.2, x: ball.x, y: ball.y + 4, duration: 260, ease: "Cubic.easeIn" });
          foe.setPosition(FOE.x, FOE.y);
        }
        await this.tween({ targets: ball, y: FOE.y - 6, duration: 320, ease: "Bounce.easeOut" });
        this.dust(ball.x, FOE.y - 2);
        for (let i = 0; i < shakes; i += 1) {
          await this.wait(260);
          await this.tween({ targets: ball, angle: -22, x: ball.x - 2, duration: 110, ease: "Sine.easeOut" });
          await this.tween({ targets: ball, angle: 22, x: ball.x + 4, duration: 180, ease: "Sine.easeInOut" });
          await this.tween({ targets: ball, angle: 0, x: ball.x - 2, duration: 110, ease: "Sine.easeIn" });
        }
        await this.wait(200);
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
        this.burst(ball.x, ball.y, 0xfff4c4);
        ball.destroy();
        if (foe) {
          foe.clearTint();
          foe.setTintFill(0xffffff);
          await this.tween({ targets: foe, scale: fit, duration: 220 });
          foe.clearTint();
          this.startIdle(foe);
        }
      },
      end: () => {
        if (this.scene.isPaused("world")) this.scene.resume("world");
        this.scene.stop();
      },
    };
  }
}
