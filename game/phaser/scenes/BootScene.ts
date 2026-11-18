import * as Phaser from "phaser";
import { MAP_KEYS, MON_SPRITES } from "@/game/phaser/constants";
import { buildNpcTextures, buildPlayerTexture, buildUiTextures } from "@/game/phaser/textures";
import { useGame } from "@/game/state/store";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.image("overworld", "/assets/tilesets/overworld.png");
    this.load.image("inner", "/assets/tilesets/inner.png");
    this.load.image("extra", "/assets/tilesets/extra.png");
    this.load.spritesheet("extra_sheet", "/assets/tilesets/extra.png", { frameWidth: 16, frameHeight: 16 });
    for (const key of MAP_KEYS) this.load.tilemapTiledJSON(`map_${key}`, `/assets/maps/${key}.json`);
    for (const sprite of MON_SPRITES) {
      this.load.image(`mon_${sprite}`, `/assets/sprites/pokemon/${sprite}.png`);
      this.load.image(`mon_${sprite}_back`, `/assets/sprites/pokemon/${sprite}_back.png`);
    }
    this.load.image("item_ball", "/assets/ui/items/ball.png");
    this.load.image("item_greatball", "/assets/ui/items/greatball.png");
    for (const name of ["grass", "town", "forest", "gym"]) {
      this.load.image(`bg_${name}`, `/assets/battle/bg_${name}.png`);
      this.load.image(`plat_${name}_enemy`, `/assets/battle/platform_${name}_enemy.png`);
      this.load.image(`plat_${name}_player`, `/assets/battle/platform_${name}_player.png`);
    }
  }

  async create(): Promise<void> {
    buildUiTextures(this);
    const state = useGame.getState().live;
    if (!state) return;
    await Promise.all([buildPlayerTexture(this, state.appearance), buildNpcTextures(this)]);
    this.scene.start("world", { map: state.map, x: state.x, y: state.y, dir: state.dir, fade: true });
  }
}
