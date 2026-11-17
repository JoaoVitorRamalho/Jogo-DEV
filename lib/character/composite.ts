import type { AnimName, Appearance, Catalog, PaletteId, Sex } from "@/lib/character/types";
import { NONE } from "@/lib/character/types";

export type Sheet = {
  canvas: HTMLCanvasElement;
  columns: number;
  rows: number;
};

type Pair = { s: [number, number, number]; t: [number, number, number] };
type DrawLayer = { z: number; path: string; materials: string[]; slot: string };

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
const recolorCache = new Map<string, HTMLCanvasElement>();
const sheetCache = new Map<string, Sheet>();
const inflight = new Map<string, Promise<Sheet>>();

const MATERIAL_ORDER = ["eye", "hair", "cloth", "metal", "body"];

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
  imageCache.set(url, pending);
  return pending;
}

function hex(color: string): [number, number, number] {
  const value = color.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function chosenColor(material: string, slot: string, appearance: Appearance): string | null {
  if (material === "body") return appearance.skin;
  if (material === "eye") return appearance.eyes;
  if (material === "hair") return appearance.hairColor;
  if (material === "cloth" || material === "metal") {
    if (slot === "shirt") return appearance.shirtColor;
    if (slot === "legs") return appearance.legsColor;
    if (slot === "shoes") return appearance.shoesColor;
    if (slot === "hat") return appearance.hatColor;
    if (slot === "glasses") return appearance.glassesColor;
  }
  return null;
}

function pairsFor(catalog: Catalog, materials: string[], slot: string, appearance: Appearance): Pair[] {
  const pairs: Pair[] = [];
  const ordered = [...materials].sort(
    (a, b) => MATERIAL_ORDER.indexOf(a) - MATERIAL_ORDER.indexOf(b),
  );
  for (const material of ordered) {
    const book = catalog.palettes[material as PaletteId];
    const targetName = chosenColor(material, slot, appearance);
    if (!book || !targetName || targetName === book.base) continue;
    const source = book.colors[book.base];
    const target = book.colors[targetName];
    if (!source || !target) continue;
    const count = Math.min(source.length, target.length);
    for (let index = 0; index < count; index += 1) {
      pairs.push({ s: hex(source[index]), t: hex(target[index]) });
    }
  }
  return pairs;
}

function paint(image: HTMLImageElement | HTMLCanvasElement, pairs: Pair[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  if (pairs.length === 0) return canvas;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] === 0) continue;
    for (const pair of pairs) {
      if (
        Math.abs(pixels[index] - pair.s[0]) <= 2 &&
        Math.abs(pixels[index + 1] - pair.s[1]) <= 2 &&
        Math.abs(pixels[index + 2] - pair.s[2]) <= 2
      ) {
        pixels[index] = pair.t[0];
        pixels[index + 1] = pair.t[1];
        pixels[index + 2] = pair.t[2];
        break;
      }
    }
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

async function coloredLayer(
  url: string,
  pairs: Pair[],
): Promise<HTMLCanvasElement | HTMLImageElement | null> {
  const image = await loadImage(url);
  if (!image) return null;
  if (pairs.length === 0) return image;
  const key = `${url}|${JSON.stringify(pairs)}`;
  const cached = recolorCache.get(key);
  if (cached) return cached;
  const canvas = paint(image, pairs);
  recolorCache.set(key, canvas);
  return canvas;
}

function collect(catalog: Catalog, appearance: Appearance): DrawLayer[] {
  const sex: Sex = appearance.sex;
  const layers: DrawLayer[] = [];
  const push = (
    source: { layers: { z: number; paths: Partial<Record<Sex, string>> }[]; materials: string[] } | null,
    slot: string,
  ) => {
    if (!source) return;
    for (const layer of source.layers) {
      const path = layer.paths[sex];
      if (path) layers.push({ z: layer.z, path, materials: source.materials, slot });
    }
  };
  push(catalog.shadow, "shadow");
  push(catalog.body, "body");
  for (const slot of [
    "expression",
    "eyebrows",
    "hair",
    "beard",
    "shirt",
    "legs",
    "shoes",
    "hat",
    "glasses",
  ] as const) {
    const id = appearance[slot];
    if (!id || id === NONE) continue;
    const item = catalog.items.find((entry) => entry.id === id && entry.slot === slot);
    if (!item || !item.sexes.includes(sex)) continue;
    push(item, slot);
  }
  layers.sort((a, b) => a.z - b.z);
  return layers;
}

async function composeNow(catalog: Catalog, appearance: Appearance, anim: AnimName): Promise<Sheet> {
  const layers = collect(catalog, appearance);
  const body = layers.find((layer) => layer.slot === "body");
  if (!body) throw new Error("Corpo ausente.");
  const bodyUrl = `/lpc/sprites/${body.path}${anim}.png`;
  const bodyImage = await loadImage(bodyUrl);
  if (!bodyImage) {
    if (anim === "run") return compose(catalog, appearance, "walk");
    throw new Error("Sprite de corpo ausente.");
  }

  const sheet = document.createElement("canvas");
  sheet.width = bodyImage.width;
  sheet.height = bodyImage.height;
  const context = sheet.getContext("2d");
  if (!context) throw new Error("Canvas indisponível.");
  context.imageSmoothingEnabled = false;

  for (const layer of layers) {
    const url = `/lpc/sprites/${layer.path}${anim}.png`;
    const pairs = pairsFor(catalog, layer.materials, layer.slot, appearance);
    const image = await coloredLayer(url, pairs);
    if (image) context.drawImage(image, 0, 0);
  }

  return {
    canvas: sheet,
    columns: Math.floor(sheet.width / catalog.frame),
    rows: Math.floor(sheet.height / catalog.frame),
  };
}

export function compose(catalog: Catalog, appearance: Appearance, anim: AnimName): Promise<Sheet> {
  const key = `${anim}|${JSON.stringify(appearance)}`;
  const ready = sheetCache.get(key);
  if (ready) return Promise.resolve(ready);
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = composeNow(catalog, appearance, anim).then((sheet) => {
    sheetCache.set(key, sheet);
    inflight.delete(key);
    if (sheetCache.size > 24) {
      const oldest = sheetCache.keys().next().value;
      if (oldest) sheetCache.delete(oldest);
    }
    return sheet;
  });
  inflight.set(key, promise);
  return promise;
}

export function blitFrame(sheet: Sheet, column: number, row: number, destination: HTMLCanvasElement): void {
  const size = 64;
  const context = destination.getContext("2d");
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, size, size);
  const col = Math.max(0, Math.min(sheet.columns - 1, column));
  const line = Math.max(0, Math.min(sheet.rows - 1, row));
  context.drawImage(sheet.canvas, col * size, line * size, size, size, 0, 0, size, size);
}
