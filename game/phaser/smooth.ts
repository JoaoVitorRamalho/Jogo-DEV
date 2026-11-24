import * as Phaser from "phaser";
import { SCALE, upscaleCells } from "@/game/core/pixelScale";
import { useSettings } from "@/lib/settings/store";

/**
 * Mapa e personagens em alta: as folhas (tilesets e bonecos) são ampliadas 4× com o Scale2x e
 * desenhadas com filtro linear. O tile e o quadro continuam com 16 px no mundo: a textura diz ao
 * Phaser que mede 1/4 do tamanho real, então posição, colisão e quadros não mudam em nada, só a
 * placa de vídeo lê mais detalhe. "Gráficos: Pixel" nas Opções volta ao quadradinho original.
 */

type Art = { image: CanvasImageSource & { width: number; height: number }; cellW: number; cellH: number; frames: boolean };

const PAD = 2;
const store = new WeakMap<Phaser.Game, Map<string, Art>>();

function arts(scene: Phaser.Scene): Map<string, Art> {
  let map = store.get(scene.sys.game);
  if (!map) {
    map = new Map();
    store.set(scene.sys.game, map);
  }
  return map;
}

function smoothOn(scene: Phaser.Scene): boolean {
  return scene.sys.game.renderer.type === Phaser.WEBGL && useSettings.getState().smooth;
}

function canvasOf(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D];
}

function build(scene: Phaser.Scene, key: string, art: Art): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { width, height } = art.image;
  const cols = Math.floor(width / art.cellW);
  const rows = Math.floor(height / art.cellH);
  const [flat, flatContext] = canvasOf(width, height);
  flatContext.drawImage(art.image, 0, 0);

  if (!smoothOn(scene)) {
    const texture = scene.textures.addCanvas(key, flat);
    if (texture && art.frames) {
      for (let i = 0; i < cols * rows; i += 1) texture.add(i, 0, (i % cols) * art.cellW, Math.floor(i / cols) * art.cellH, art.cellW, art.cellH);
    }
    return;
  }

  const pixels = new Uint32Array(flatContext.getImageData(0, 0, width, height).data.buffer);
  const big = upscaleCells(pixels, width, height, art.cellW, art.cellH, PAD);
  const [canvas, context] = canvasOf(big.width, big.height);
  context.putImageData(new ImageData(new Uint8ClampedArray(big.data.buffer as ArrayBuffer), big.width, big.height), 0, 0);
  const texture = scene.textures.addCanvas(key, canvas);
  if (!texture) return;

  // Tamanho "virtual": 1/4 do real. Os quadros e os tiles são medidos nele.
  const vw = big.width / SCALE;
  const vh = big.height / SCALE;
  const source = texture.source[0];
  source.width = vw;
  source.height = vh;
  if (source.glTexture) {
    source.glTexture.width = vw;
    source.glTexture.height = vh;
  }
  texture.get("__BASE").setSize(vw, vh);
  const margin = PAD / SCALE;
  (texture.customData as Record<string, unknown>).smooth = { margin, spacing: margin * 2 };
  if (art.frames) {
    const stepX = art.cellW + margin * 2;
    const stepY = art.cellH + margin * 2;
    for (let i = 0; i < cols * rows; i += 1) texture.add(i, 0, margin + (i % cols) * stepX, margin + Math.floor(i / cols) * stepY, art.cellW, art.cellH);
  }
  texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/**
 * Registra uma folha e cria a textura dela (ampliada ou não, conforme a opção). Imagens do
 * carregador: passe só a chave, a imagem original fica guardada na primeira vez.
 */
export function addArt(scene: Phaser.Scene, key: string, cellW: number, cellH: number, frames: boolean, image?: Art["image"], from = key): void {
  const map = arts(scene);
  if (image) map.set(key, { image, cellW, cellH, frames });
  else if (!map.has(key)) {
    if (!scene.textures.exists(from)) return;
    map.set(key, { image: scene.textures.get(from).getSourceImage() as Art["image"], cellW, cellH, frames });
  }
  build(scene, key, map.get(key) as Art);
}

/** Margem e espaço entre tiles da folha ampliada (0 e 0 na original). */
export function tileGap(scene: Phaser.Scene, key: string): [number, number] {
  const smooth = scene.textures.exists(key) ? ((scene.textures.get(key).customData as Record<string, unknown>).smooth as { margin: number; spacing: number } | undefined) : undefined;
  return smooth ? [smooth.margin, smooth.spacing] : [0, 0];
}

/** Refaz todas as folhas depois de trocar a opção. Devolve as chaves refeitas. */
export function rebuildArt(scene: Phaser.Scene): Set<string> {
  const map = arts(scene);
  for (const [key, art] of map) build(scene, key, art);
  return new Set(map.keys());
}
