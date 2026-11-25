import * as Phaser from "phaser";
import { MAP_KEYS, MON_SPRITES, TILESET_KEYS } from "@/game/phaser/constants";
import { addArt } from "@/game/phaser/smooth";
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
    this.load.image("kenney_town", "/assets/tilesets/kenney_tiny_town.png");
    this.load.image("kenney_extra", "/assets/tilesets/kenney_extra.png");
    this.load.image("cave_entrance", "/assets/tilesets/cave_entrance.png");
    this.load.image("cave_interior", "/assets/tilesets/cave_interior.png");
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
    // Tilesets ampliados (ou não) conforme "Gráficos" nas Opções; extra_sheet são os tiles soltos.
    addArt(this, "extra_sheet", 16, 16, true, undefined, "extra");
    addArt(this, "kenney_sheet", 16, 16, true, undefined, "kenney_town");
    for (const key of TILESET_KEYS) addArt(this, key, 16, 16, false);
    const state = useGame.getState().live;
    if (!state) return;
    await Promise.all([buildPlayerTexture(this, state.appearance), buildNpcTextures(this)]);
    this.scene.start("world", { map: state.map, x: state.x, y: state.y, dir: state.dir, fade: true });
  }
}
