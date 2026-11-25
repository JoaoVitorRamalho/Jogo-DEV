import * as Phaser from "phaser";
import { TILE, VIEW_H, VIEW_W } from "@/game/phaser/constants";
import { canvasTexture } from "@/game/phaser/fountain";

/** Brilho mineral discreto e sombra nos cantos, sem reduzir a visibilidade da trilha. */
export function addCaveAtmosphere(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap): void {
  canvasTexture(scene, "cave_glow", 64, 64, (g) => {
    const light = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    light.addColorStop(0, "rgba(100,220,235,.65)");
    light.addColorStop(0.45, "rgba(70,150,200,.2)");
    light.addColorStop(1, "rgba(70,150,200,0)");
    g.fillStyle = light;
    g.fillRect(0, 0, 64, 64);
  });
  const first = map.tilesets.find((set) => set.name === "cave_interior")?.firstgid;
  const detail = map.getLayer("detail");
  if (first && detail) {
    for (const row of detail.data) for (const tile of row) {
      if (![first + 34, first + 35].includes(tile.index)) continue;
      const light = scene.add.image(tile.x * TILE + 8, tile.y * TILE + 8, "cave_glow").setDepth(3).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: light, alpha: 0.4, duration: 1800 + tile.x * 20, yoyo: true, repeat: -1 });
    }
  }
  canvasTexture(scene, "cave_shade", VIEW_W, VIEW_H, (g) => {
    const shade = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
    shade.addColorStop(0, "rgba(10,12,25,0)");
    shade.addColorStop(1, "rgba(10,12,25,.4)");
    g.fillStyle = shade;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  });
  scene.add.image(0, 0, "cave_shade").setName("cave-shade").setOrigin(0).setScrollFactor(0).setDepth(150000);
}
