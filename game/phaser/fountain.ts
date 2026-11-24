import * as Phaser from "phaser";
import { TILE } from "@/game/phaser/constants";

/**
 * Água viva nos chafarizes das praças: o jato solta gotas que sobem e caem na bacia de cima,
 * anéis abrem e somem na água de baixo e uns brilhos piscam na superfície.
 *
 * O chafariz é um carimbo 3 × 3 do tileset "overworld" (canto na coluna 22, linha 9); a cena
 * acha cada um na camada "buildings" e põe o efeito em cima. Tudo é objeto da cena: some
 * sozinho quando o mapa troca.
 */

const FOUNTAIN_TILE = 9 * 40 + 22;
/** As texturas são desenhadas 4× maiores e reduzidas na tela: a gota fica redonda, sem serrilha. */
const HI = 4;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, w, h);
  const g = texture?.getContext();
  if (!texture || !g) return;
  draw(g);
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function makeTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, "fx_drop", 2 * HI, 2 * HI, (g) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(HI, HI, HI - 0.5, 0, Math.PI * 2);
    g.fill();
  });
  canvasTexture(scene, "fx_ring", 16 * HI, 8 * HI, (g) => {
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(8 * HI, 4 * HI, 8 * HI - 2, 4 * HI - 2, 0, 0, Math.PI * 2);
    g.stroke();
  });
  canvasTexture(scene, "fx_glint", 7 * HI, 7 * HI, (g) => {
    const c = 3.5 * HI;
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(c, 0);
    g.lineTo(c + 2.5, c - 2.5);
    g.lineTo(7 * HI, c);
    g.lineTo(c + 2.5, c + 2.5);
    g.lineTo(c, 7 * HI);
    g.lineTo(c - 2.5, c + 2.5);
    g.lineTo(0, c);
    g.lineTo(c - 2.5, c - 2.5);
    g.closePath();
    g.fill();
  });
}

/** Ponto ao acaso na água da bacia de baixo, fora do pedestal do meio. */
function waterSpot(x0: number, y0: number): { x: number; y: number } {
  for (let tries = 0; tries < 8; tries += 1) {
    const angle = Math.random() * Math.PI * 2;
    const t = 0.55 + Math.random() * 0.33;
    const x = x0 + 24 + Math.cos(angle) * 15 * t;
    const y = y0 + 24 + Math.sin(angle) * 9.5 * t;
    const px = (x - (x0 + 24.5)) / 10.5;
    const py = (y - (y0 + 18)) / 9.5;
    if (px * px + py * py > 1) return { x, y };
  }
  return { x: x0 + 24, y: y0 + 34 };
}

function ripple(scene: Phaser.Scene, x: number, y: number, size: number): void {
  const ring = scene.add.image(x, y, "fx_ring").setDepth(3).setAlpha(0.7).setScale(size * 0.35);
  scene.tweens.add({
    targets: ring,
    scale: size,
    alpha: 0,
    duration: 1000 + Math.random() * 300,
    ease: "Sine.easeOut",
    onComplete: () => ring.destroy(),
  });
}

function glint(scene: Phaser.Scene, x: number, y: number): void {
  const star = scene.add.image(x, y, "fx_glint").setDepth(4).setScale(0).setBlendMode(Phaser.BlendModes.ADD).setTint(0xe8fbff);
  scene.tweens.add({
    targets: star,
    scale: 0.2,
    duration: 220,
    yoyo: true,
    ease: "Sine.easeInOut",
    onComplete: () => star.destroy(),
  });
}

/** Põe a água em todos os chafarizes do mapa. */
export function addFountains(scene: Phaser.Scene, tilemap: Phaser.Tilemaps.Tilemap): void {
  const layer = tilemap.getLayer("buildings");
  const overworld = tilemap.getTileset("overworld");
  if (!layer || !overworld) return;
  const gid = overworld.firstgid + FOUNTAIN_TILE;
  const spots: { x0: number; y0: number }[] = [];
  for (let y = 0; y < tilemap.height; y += 1) {
    for (let x = 0; x < tilemap.width; x += 1) if (layer.data[y][x].index === gid) spots.push({ x0: x * TILE, y0: y * TILE });
  }
  if (!spots.length) return;
  makeTextures(scene);

  for (const { x0, y0 } of spots) {
    // Jato: sobe uns 6 px e cai espalhado na bacia de cima. Fica na altura do meio do chafariz:
    // quem está atrás dele vê a água por cima, quem está na frente cobre a água.
    scene.add
      .particles(x0 + 24, y0 + 4, "fx_drop", {
        speedX: { min: -17, max: 17 },
        speedY: { min: -56, max: -40 },
        gravityY: 200,
        lifespan: { min: 560, max: 720 },
        scale: { start: 0.2, end: 0.12 },
        alpha: { start: 0.95, end: 0.3 },
        tint: [0xffffff, 0xe0f6ff, 0xb4e4ff],
        frequency: 34,
      })
      .setDepth(y0 + 24);
  }

  scene.time.addEvent({
    delay: 420,
    loop: true,
    callback: () => {
      for (const { x0, y0 } of spots) {
        // Onde as gotas caem, na bacia de cima, e de vez em quando na água de baixo.
        ripple(scene, x0 + 24.5 + (Math.random() - 0.5) * 11, y0 + 15.5 + Math.random() * 2, 0.13);
        if (Math.random() < 0.55) {
          const at = waterSpot(x0, y0);
          ripple(scene, at.x, at.y, 0.22);
        }
        if (Math.random() < 0.5) {
          const at = waterSpot(x0, y0);
          glint(scene, at.x, at.y);
        }
      }
    },
  });
}
