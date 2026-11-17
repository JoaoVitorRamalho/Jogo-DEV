import type * as Phaser from "phaser";
import { NPCS } from "@/data/npcs";
import type { Appearance } from "@/game/character/appearance";
import { FRAME_H, FRAME_W, renderSheet } from "@/game/character/compose";

export function addSheet(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, canvas);
  if (!texture) return;
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      texture.add(row * 4 + col, 0, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
    }
  }
}

export async function buildPlayerTexture(scene: Phaser.Scene, appearance: Appearance): Promise<void> {
  addSheet(scene, "player", await renderSheet(appearance));
}

export async function buildNpcTextures(scene: Phaser.Scene): Promise<void> {
  await Promise.all(
    Object.entries(NPCS).map(async ([id, look]) => {
      if (!look.appearance) return;
      addSheet(scene, `npc_${id}`, await renderSheet(look.appearance));
    }),
  );
}

export function buildUiTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists("bubble_dots")) {
    const g = scene.add.graphics();
    g.fillStyle(0x171717, 1).fillRoundedRect(0, 0, 12, 9, 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(1, 1, 10, 7, 2);
    g.fillStyle(0x171717, 1).fillRect(3, 4, 1, 1).fillRect(6, 4, 1, 1).fillRect(9, 4, 1, 1);
    g.generateTexture("bubble_dots", 12, 10);
    g.clear();
    g.fillStyle(0x171717, 1).fillRoundedRect(0, 0, 10, 12, 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(1, 1, 8, 10, 2);
    g.fillStyle(0xd83a3a, 1).fillRect(4, 2, 2, 5).fillRect(4, 8, 2, 2);
    g.generateTexture("emote_!", 10, 12);
    g.clear();
    g.fillStyle(0x171717, 1).fillRoundedRect(0, 0, 10, 12, 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(1, 1, 8, 10, 2);
    g.fillStyle(0x3a6ad8, 1).fillRect(3, 2, 4, 1).fillRect(6, 3, 1, 2).fillRect(4, 5, 2, 1).fillRect(4, 6, 1, 1).fillRect(4, 8, 2, 2);
    g.generateTexture("emote_?", 10, 12);
    g.clear();
    g.fillStyle(0x171717, 1).fillRoundedRect(0, 0, 14, 10, 2);
    g.fillStyle(0xffffff, 1).fillRoundedRect(1, 1, 12, 8, 2);
    g.fillStyle(0x171717, 1).fillRect(3, 5, 2, 2).fillRect(6, 5, 2, 2).fillRect(9, 5, 2, 2);
    g.generateTexture("emote_...", 14, 10);
    g.clear();
    g.fillStyle(0x2a2a32, 1).fillCircle(16, 16, 15);
    g.fillStyle(0x4a4e5a, 1).fillCircle(16, 14, 12);
    g.fillStyle(0xffffff, 1).fillRect(13, 7, 6, 3).fillRect(17, 10, 3, 4).fillRect(14, 15, 4, 3).fillRect(14, 21, 4, 4);
    g.generateTexture("mon_unknown", 32, 32);
    g.destroy();
  }
}
