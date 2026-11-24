import * as Phaser from "phaser";
import { bakeTiles } from "@/game/core/pixelScale";
import { canvasOf, PAD, shrink, smoothOn, sourceArt } from "@/game/phaser/smooth";

/**
 * Modo Suave sem triângulo nem serrilha no mapa.
 *
 * As folhas de tiles são ampliadas célula por célula, e o desenho que passa de um tile para o
 * outro (a sombra no capim, a franja da borda do caminho) saía cortado reto na divisa. Aqui o
 * mapa é montado no tamanho original, com as camadas paradas juntas, e ampliado olhando os
 * vizinhos de cada tile (`bakeTiles`). O resultado vira um mapa à parte, desenhado por cima dos
 * tiles originais, que ficam escondidos. Colisão, capim alto e tudo o que lê as camadas continua
 * igual, porque os dados das camadas não mudam.
 *
 * Os tiles animados (o mar de Brisamar) ficam de fora e seguem pelo caminho antigo.
 */

const GROUPS = [
  { name: "chao", layers: ["ground", "detail", "buildings"], depth: 0 },
  { name: "acima", layers: ["above"], depth: 100000 },
];

/** Maior textura que vale a pena pedir para a placa de vídeo do celular. */
const MAX_SIDE = 4096;

export type MapBake = { destroy(): void; stats: { ms: number; blocks: number[] } };

let serial = 0;

export function bakeMap(
  scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
  layers: Record<string, Phaser.Tilemaps.TilemapLayer>,
  live: Set<number>,
): MapBake | null {
  if (!smoothOn(scene)) return null;
  const started = performance.now();
  const T = tilemap.tileWidth;
  const W = tilemap.width;
  const H = tilemap.height;
  const sheets = tilemap.tilesets.map((set) => ({ set, image: sourceArt(scene, set.name) }));
  const sheetOf = (gid: number) => sheets.find(({ set }) => gid >= set.firstgid && gid < set.firstgid + set.total);

  const baked = scene.make.tilemap({ width: W, height: H, tileWidth: T, tileHeight: T });
  const keys: string[] = [];
  const hidden: Phaser.Tilemaps.Tile[] = [];
  const blocks: number[] = [];
  let firstgid = 1;
  serial += 1;

  for (const group of GROUPS) {
    const own = group.layers.map((name) => layers[name]).filter(Boolean);
    if (!own.length) continue;
    const [flat, context] = canvasOf(W * T, H * T);
    const skip = new Uint8Array(W * H);
    let missing = false;
    for (const layer of own) {
      layer.layer.data.forEach((row, y) =>
        row.forEach((tile, x) => {
          if (!tile || tile.index < 1) return;
          if (live.has(tile.index)) skip[y * W + x] = 1;
          const sheet = sheetOf(tile.index);
          if (!sheet?.image) {
            missing = true;
            return;
          }
          const local = tile.index - sheet.set.firstgid;
          const cols = Math.floor(sheet.image.width / T);
          context.drawImage(sheet.image, (local % cols) * T, Math.floor(local / cols) * T, T, T, x * T, y * T, T, T);
        }),
      );
    }
    if (missing) continue;

    const pixels = new Uint32Array(context.getImageData(0, 0, W * T, H * T).data.buffer);
    const result = bakeTiles(pixels, W * T, H * T, T, PAD, (cx, cy) => skip[cy * W + cx] === 1);
    if (!result.count || result.width > MAX_SIDE || result.height > MAX_SIDE) continue;
    const key = `bake_${group.name}_${serial}`;
    const [canvas, big] = canvasOf(result.width, result.height);
    big.putImageData(new ImageData(new Uint8ClampedArray(result.data.buffer as ArrayBuffer), result.width, result.height), 0, 0);
    const texture = scene.textures.addCanvas(key, canvas);
    if (!texture) continue;
    keys.push(key);
    const { margin, spacing } = shrink(texture, result.width, result.height);
    const set = baked.addTilesetImage(key, key, T, T, margin, spacing, firstgid);
    const layer = set && baked.createBlankLayer(group.name, set, 0, 0, W, H);
    if (!set || !layer) continue;
    firstgid += result.count;
    blocks.push(result.count);
    const rows: number[][] = [];
    for (let y = 0; y < H; y += 1) {
      const row: number[] = [];
      for (let x = 0; x < W; x += 1) {
        const id = result.cells[y * W + x];
        row.push(id < 0 ? -1 : set.firstgid + id);
      }
      rows.push(row);
    }
    layer.putTilesAt(rows, 0, 0, false);
    layer.setDepth(group.depth);
    // O que foi assado sai da camada original; o animado continua nela.
    for (const original of own) {
      original.layer.data.forEach((row, y) =>
        row.forEach((tile, x) => {
          if (!tile || tile.index < 1 || skip[y * W + x]) return;
          tile.visible = false;
          hidden.push(tile);
        }),
      );
    }
  }

  let gone = false;
  const destroy = () => {
    if (gone) return;
    gone = true;
    for (const tile of hidden) tile.visible = true;
    baked.destroy();
    for (const key of keys) if (scene.textures.exists(key)) scene.textures.remove(key);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  return { destroy, stats: { ms: Math.round(performance.now() - started), blocks } };
}
