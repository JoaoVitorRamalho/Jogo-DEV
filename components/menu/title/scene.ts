/**
 * Cena da tela de título: o entardecer em Brisamar visto do penhasco, desenhado pixel a
 * pixel num canvas pequeno e ampliado sem suavizar. Céu em faixas com pontilhado Bayer,
 * Via Láctea, nuvens acesas por baixo, sol se pondo, farol girando o facho, observatório
 * da Profª Lira, mar refletindo tudo com ondas e o caminho de brilho do sol, grama contra
 * a luz, vagalumes, o herói e o parceiro de costas olhando o mar e o logo letra a letra.
 * Tudo na mesma grade de pixels, para nada parecer colado por cima.
 */
import { petHeight } from "@/data/pokemon/heights";
import { BIG, SMALL } from "./glyphs";

export type TitleStage = "press" | "menu" | "overwrite";

export type TitleScene = {
  setHero(sheet: HTMLCanvasElement | null): void;
  setPartner(img: HTMLImageElement | null, species: string | null): void;
  setStage(stage: TitleStage): void;
  destroy(): void;
};

type RGB = [number, number, number];
type Sprite = { w: number; h: number; px: Uint32Array; bottom: number };
type Art = { w: number; h: number; px: Uint32Array; face: Uint8Array };
type Layout = {
  W: number;
  H: number;
  portrait: boolean;
  horizon: number;
  sunX: number;
  sunY: number;
  sunR: number;
  cliffY: number;
  edgeX: number;
  heroX: number;
  lightX: number;
  obsX: number;
  treeX: number;
  logoY: number;
  logoPressX: number;
  logoMenuX: number;
};

// ---------- cor ----------

const hex = (c: string): RGB => {
  const n = Number.parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const pack = (c: RGB): number => (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
const col = (c: string): number => pack(hex(c));
const unpack = (v: number): RGB => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** Mistura dois pixels já empacotados (ABGR), sem alocar. */
function blend(a: number, b: number, t: number): number {
  const ar = a & 255;
  const ag = (a >>> 8) & 255;
  const ab = (a >>> 16) & 255;
  const r = (ar + ((b & 255) - ar) * t) | 0;
  const g = (ag + (((b >>> 8) & 255) - ag) * t) | 0;
  const bl = (ab + (((b >>> 16) & 255) - ab) * t) | 0;
  return (0xff000000 | (bl << 16) | (g << 8) | r) >>> 0;
}

// ---------- pontilhado e ruído ----------

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bayer = (x: number, y: number): number => BAYER[((y & 3) << 2) | (x & 3)];
/** Fração entre duas cores → chance de pontilhar: faixas lisas, transição estreita. */
const band = (f: number): number => (f < 0.3 ? 0 : f > 0.7 ? 1 : (f - 0.3) / 0.4);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const wrap = (i: number, p: number): number => (p > 0 ? ((i % p) + p) % p : i);

function noise(x: number, seed: number, period = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(wrap(i, period), 0, seed) * (1 - u) + hash(wrap(i + 1, period), 0, seed) * u;
}

function fbm(x: number, seed: number, period = 0): number {
  return noise(x, seed, period) * 0.6 + noise(x * 2, seed + 1, period * 2) * 0.27 + noise(x * 4, seed + 2, period * 4) * 0.13;
}

function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}

function easeOutBounce(x: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}

// ---------- paleta ----------

const SKY = [
  "#0d0b26", "#151338", "#1f1b4c", "#2c245f", "#3e2c72", "#573683", "#77408f",
  "#9c4b96", "#c25894", "#e26a8a", "#f6857f", "#ffa27a", "#ffc286", "#ffe0a3",
].map(col);

const C = {
  night: col("#0b0820"),
  white: col("#ffffff"),
  sun0: col("#fffaf0"),
  sun1: col("#fff0c2"),
  sun2: col("#ffd994"),
  sunLow: col("#ffc785"),
  starDim: col("#6b60ad"),
  starMid: col("#bcb3f3"),
  starHot: col("#fff8e4"),
  haze: col("#a5547f"),
  land: col("#5f3167"),
  landTop: col("#7d3d70"),
  bldg: col("#4b2659"),
  bldgRim: col("#c46a7e"),
  dome: col("#57306a"),
  domeRim: col("#ee9a8a"),
  slit: col("#2a1538"),
  window: col("#ffd27a"),
  town: col("#ffd98a"),
  townDim: col("#b9785a"),
  rock: col("#4f2a5d"),
  rockTop: col("#e38f7e"),
  towerA: col("#7a4672"),
  towerB: col("#542a5f"),
  towerRim: col("#ffb58c"),
  iron: col("#3a1f4a"),
  lamp: col("#ffd98a"),
  lampHot: col("#fffbe6"),
  beam: col("#fff2c8"),
  horizon: col("#ffe9c2"),
  seaDeep: col("#15123c"),
  seaWarm: col("#c8566a"),
  crest: col("#ffd9bd"),
  glit0: col("#fff7de"),
  glit1: col("#ffe1a8"),
  glit2: col("#f4ad88"),
  foam: col("#e6defa"),
  grassRim: col("#d4825f"),
  grassA: col("#1b3138"),
  grassB: col("#21393e"),
  soil: col("#140f22"),
  rockBody: col("#1b1530"),
  rockLight: col("#2a2145"),
  ledge: col("#43284f"),
  rockDark: col("#110d20"),
  cliffRim: col("#c06873"),
  cliffRim2: col("#4a2648"),
  bladeTip: col("#ffc27c"),
  bladeRim: col("#c8775e"),
  flowerA: col("#ffd6ea"),
  flowerB: col("#fff1bd"),
  bark: col("#150f1f"),
  barkRim: col("#9a4f5e"),
  leaf: col("#101823"),
  leaf2: col("#16212e"),
  leafRim: col("#c9705d"),
  leafRim2: col("#4a2843"),
  seaRock: col("#1d1630"),
  seaRockRim: col("#dc8b73"),
  shadow: col("#0a0818"),
  fly: col("#d9c35c"),
  flyHot: col("#fff4a6"),
  flyGlow: col("#ffe27a"),
  bird: col("#2a1c46"),
  vignette: col("#090716"),
  logoOut: col("#170c26"),
  logoLow: col("#b8442b"),
  subInk: col("#ffdcae"),
  subLine: col("#d7924f"),
  subGem: col("#ffd47c"),
};

type CloudColors = { body: number; top: number; rim: number; hotBody: number; hotRim: number };
const CLOUD_HIGH: CloudColors = { body: col("#6b3f86"), top: col("#523279"), rim: col("#c45f8f"), hotBody: col("#8a4a8e"), hotRim: col("#f08a8a") };
const CLOUD_MID: CloudColors = { body: col("#5d3379"), top: col("#4a2a6a"), rim: col("#ff9e80"), hotBody: col("#7a3c7e"), hotRim: col("#ffd29a") };
const CLOUD_LOW: CloudColors = { body: col("#9a4c84"), top: col("#83407a"), rim: col("#ffcf9a"), hotBody: col("#c0607e"), hotRim: col("#fff0c4") };

const SHADE = hex("#2a1f4c");
const RIM = hex("#ffb98a");
const SKYRIM = hex("#9a6ab0");

// ---------- layout ----------

function layoutFor(W: number, H: number): Layout {
  const portrait = W / H <= 0.9;
  if (portrait) {
    const horizon = Math.round(H * 0.44);
    const sunR = Math.round(Math.min(W * 0.17, H * 0.085));
    return {
      W, H, portrait, horizon, sunR,
      sunX: Math.round(W * 0.57),
      sunY: horizon - Math.round(sunR * 0.35),
      cliffY: Math.round(H * 0.56),
      edgeX: Math.round(W * 0.66),
      heroX: Math.round(W * 0.27),
      lightX: Math.round(W * 0.87),
      obsX: -1,
      treeX: -1,
      logoY: Math.round(H * 0.075),
      logoPressX: Math.round(W / 2),
      logoMenuX: Math.round(W / 2),
    };
  }
  const horizon = Math.round(H * 0.6);
  const sunR = Math.round(clamp(H * 0.105, 14, 30));
  return {
    W, H, portrait, horizon, sunR,
    sunX: Math.round(W * 0.5),
    sunY: horizon - Math.round(sunR * 0.35),
    cliffY: Math.round(H * 0.83),
    edgeX: Math.round(W * 0.34),
    heroX: Math.round(W * 0.2),
    lightX: Math.round(W * 0.375),
    obsX: Math.round(W * 0.86),
    treeX: Math.round(W * 0.05),
    logoY: Math.round(H * 0.1),
    logoPressX: Math.round(W / 2),
    logoMenuX: Math.round(W * 0.345),
  };
}

// ---------- arte fixa: logo e subtítulo ----------

function outline(px: Uint32Array, w: number, h: number, color: number): void {
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && px[y * w + x] !== 0;
  const edge: number[] = [];
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1)
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) edge.push(y * w + x);
  for (const i of edge) px[i] = color;
}

function buildLogo(): Art {
  const word = [..."JORNADA"].map((ch) => BIG[ch]);
  const gap = 2;
  const ext = 4;
  const pad = 1;
  const gh = 16;
  const w = word.reduce((s, g) => s + g[0].length, 0) + gap * (word.length - 1) + pad * 2;
  const h = gh + ext + pad * 2;
  const face = new Uint8Array(w * h);
  let ox = pad;
  for (const g of word) {
    for (let y = 0; y < gh; y += 1) for (let x = 0; x < g[y].length; x += 1) if (g[y][x] === "#") face[(y + pad) * w + ox + x] = 1;
    ox += g[0].length + gap;
  }
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? face[y * w + x] : 0);
  const px = new Uint32Array(w * h);
  const ramp = ["#fffbe8", "#fff0b4", "#ffd47c", "#ffab5a", "#f27c3e", "#d9582e"].map(col);
  const depth = ["#8a3157", "#7a2c52", "#5e2149", "#4b1b42"].map(col);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (at(x, y)) {
        const t = ((y - pad) / (gh - 1)) * (ramp.length - 1.001);
        const i = Math.floor(t);
        let c = bayer(x, y) < band(t - i) ? ramp[i + 1] : ramp[i];
        if (!at(x, y - 1)) c = C.white;
        else if (!at(x, y + 1)) c = C.logoLow;
        px[y * w + x] = c;
        continue;
      }
      // extrusão: a letra "descendo" 4 px, mais escura quanto mais funda
      for (let k = 1; k <= ext; k += 1) {
        if (at(x, y - k)) {
          px[y * w + x] = depth[k - 1];
          break;
        }
      }
    }
  }
  outline(px, w, h, C.logoOut);
  return { w, h, px, face };
}

function buildSubtitle(): Art {
  const glyphs = [..."REGIÃO DE ASTERIA"].map((ch) => SMALL[ch] ?? SMALL[" "]);
  const gap = 1;
  const gh = 8;
  const pad = 1;
  const orn = 15;
  const textW = glyphs.reduce((s, g) => s + g[0].length, 0) + gap * (glyphs.length - 1);
  const w = textW + (pad + orn) * 2;
  const h = gh + pad * 2;
  const px = new Uint32Array(w * h);
  let ox = pad + orn;
  for (const g of glyphs) {
    for (let y = 0; y < gh; y += 1) for (let x = 0; x < g[y].length; x += 1) if (g[y][x] === "#") px[(y + pad) * w + ox + x] = C.subInk;
    ox += g[0].length + gap;
  }
  // fio dourado com uma gema na ponta, dos dois lados
  const my = pad + 5;
  for (let x = 4; x < orn - 3; x += 1) {
    px[my * w + x] = C.subLine;
    px[my * w + (w - 1 - x)] = C.subLine;
  }
  for (const gx of [2, w - 3]) {
    px[(my - 1) * w + gx] = C.subGem;
    px[(my + 1) * w + gx] = C.subGem;
    px[my * w + gx - 1] = C.subGem;
    px[my * w + gx] = C.white;
    px[my * w + gx + 1] = C.subGem;
  }
  outline(px, w, h, C.logoOut);
  return { w, h, px, face: new Uint8Array(0) };
}

// ---------- sprites: luz de contra ----------

/** Escurece para o roxo do entardecer e acende a borda virada para o sol. */
function grade(src: Uint8ClampedArray, w: number, h: number, sunRight: boolean): Sprite {
  const alpha = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? src[(y * w + x) * 4 + 3] : 0);
  const px = new Uint32Array(w * h);
  let bottom = 0;
  const side = sunRight ? 1 : -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (alpha(x, y) < 128) continue;
      const i = (y * w + x) * 4;
      let c: RGB = [src[i], src[i + 1], src[i + 2]];
      c = mixRGB(c, SHADE, 0.48);
      if (alpha(x, y - 1) < 128 || alpha(x + side, y) < 128) c = mixRGB(c, RIM, 0.72);
      else if (alpha(x - side, y) < 128) c = mixRGB(c, SKYRIM, 0.35);
      else if (alpha(x, y - 2) < 128 || alpha(x + side * 2, y) < 128) c = mixRGB(c, RIM, 0.22);
      px[y * w + x] = pack(c);
      bottom = y;
    }
  }
  return { w, h, px, bottom };
}

// ---------- a cena ----------

type Star = { x: number; y: number; kind: number; ph: number; sp: number };
type Band = { cells: Int16Array; speed: number; colors: CloudColors };
type Fly = { x: number; y: number; ph: number; sp: number; rx: number; ry: number };
type Blade = { x: number; h: number; flower: number };

const FADE_IN = 0.9;
const STILL_TIME = 31.4;

export function createTitleScene(
  canvas: HTMLCanvasElement,
  opts: { reduced: boolean; onScale?: (cssPx: number) => void },
): TitleScene {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D indisponível");
  const g2d = ctx;
  let L = layoutFor(320, 200);
  let image = g2d.createImageData(1, 1);
  let buf = new Uint32Array(image.data.buffer);
  let sky = new Uint32Array(0);
  let far = new Uint32Array(0);
  let fg = new Uint32Array(0);
  let vig = new Uint8Array(0);
  let surface = new Int16Array(0);
  let face = new Int16Array(0);
  let stars: Star[] = [];
  let bands: Band[] = [];
  let flies: Fly[] = [];
  let blades: Blade[] = [];
  let lights: { x: number; y: number; ph: number }[] = [];
  let rocks: { x: number; y: number; w: number }[] = [];
  let lamp = { x: -1, y: -1 };
  let win = { x: -1, y: -1 };
  let heroSheet: HTMLCanvasElement | null = null;
  let hero: Sprite | null = null;
  let partnerImg: HTMLImageElement | null = null;
  let partnerSpecies: string | null = null;
  let partner: Sprite | null = null;
  let stage: TitleStage = "press";
  let logoX = 0;
  let hopAt = -10;
  let raf = 0;
  let last = 0;
  let resizeRaf = 0;
  const born = performance.now();
  const logo = buildLogo();
  const subtitle = buildSubtitle();

  // ---------- construção (a cada redimensionamento) ----------

  function milky(x: number, y: number): number {
    const u = x / L.W;
    const v = y / L.horizon;
    const fade = (0.8 - v) / 0.3;
    if (fade <= 0) return 0;
    const d = (v - (0.66 - 0.6 * u)) / 0.1;
    if (d > 3 || d < -3) return 0;
    const n = noise2(x * 0.11, y * 0.11, 5) * 0.65 + noise2(x * 0.29, y * 0.29, 6) * 0.35;
    return Math.exp(-d * d) * Math.min(1, fade) * (0.25 + 0.75 * n);
  }

  function paintSky(): void {
    const { W, H, horizon, sunX, sunY, sunR } = L;
    sky = new Uint32Array(W * H);
    for (let y = 0; y < horizon; y += 1) {
      const t = y / horizon;
      const base = Math.pow(t, 1.65) * 11.3;
      for (let x = 0; x < W; x += 1) {
        const dx = (x - sunX) / (sunR * 3.8);
        const dy = (y - sunY) / (sunR * 2.3);
        let idx = base + Math.exp(-(dx * dx + dy * dy)) * (0.8 + 2.6 * t) + milky(x, y) * 1.3;
        if (idx > 12.999) idx = 12.999;
        const i = idx | 0;
        sky[y * W + x] = bayer(x, y) < band(idx - i) ? SKY[i + 1] : SKY[i];
      }
    }
    // o sol, em três anéis com pontilhado entre eles, achatado no horizonte
    for (let y = Math.max(0, sunY - sunR - 3); y < horizon; y += 1) {
      for (let x = Math.max(0, sunX - sunR - 3); x <= Math.min(W - 1, sunX + sunR + 3); x += 1) {
        const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY) / sunR;
        const i = y * W + x;
        if (d > 1) {
          if (d < 1.14 && bayer(x, y) < 0.5) sky[i] = blend(sky[i], C.sun2, 0.45);
          continue;
        }
        const b = bayer(x, y);
        let c = d < 0.55 ? C.sun0 : d < 0.62 ? (b < (d - 0.55) / 0.07 ? C.sun1 : C.sun0) : d < 0.82 ? C.sun1 : d < 0.88 ? (b < (d - 0.82) / 0.06 ? C.sun2 : C.sun1) : C.sun2;
        if (horizon - y <= 2) c = C.sunLow;
        sky[i] = c;
      }
    }
  }

  function placeStars(): void {
    stars = [];
    const { W, horizon } = L;
    for (let y = 1; y < horizon * 0.78; y += 1) {
      const v = y / horizon;
      for (let x = 1; x < W - 1; x += 1) {
        const dens = (0.007 + milky(x, y) * 0.03) * Math.min(1, (0.78 - v) / 0.45);
        if (hash(x, y, 21) >= dens) continue;
        const k = hash(x, y, 22);
        stars.push({ x, y, kind: k < 0.07 ? 2 : k < 0.32 ? 1 : 0, ph: hash(x, y, 23) * 6.283, sp: 0.5 + hash(x, y, 24) * 2.2 });
      }
    }
  }

  function makeBand(baseY: number, amp: number, coverage: number, seed: number, speed: number, colors: CloudColors): Band {
    const { W } = L;
    const p1 = Math.max(3, Math.round(W / 26));
    const s1 = W / p1;
    const p2 = Math.max(6, Math.round(W / 7));
    const s2 = W / p2;
    const cells: number[] = [];
    for (let x = 0; x < W; x += 1) {
      const c = (fbm(x / s1, seed, p1) - (1 - coverage)) / coverage;
      if (c <= 0.12) continue;
      const thick = Math.pow(c, 0.6) * amp;
      const top = baseY - Math.round(thick * (0.55 + noise(x / s2, seed + 9, p2) * 0.6));
      const bottom = baseY + Math.round(thick * 0.25);
      for (let y = top; y <= bottom; y += 1) cells.push(x, y, y === bottom ? 2 : y === top ? 1 : 0);
    }
    return { cells: Int16Array.from(cells), speed, colors };
  }

  function paintFar(): void {
    const { W, H, horizon } = L;
    far = new Uint32Array(W * H);
    lights = [];
    win = { x: -1, y: -1 };
    const put = (x: number, y: number, c: number) => {
      if (x >= 0 && x < W && y >= 0 && y < horizon) far[y * W + x] = c;
    };
    if (L.obsX > 0) {
      // o cabo do outro lado da baía, em duas camadas de névoa
      const x0 = Math.round(W * 0.63);
      const frontTop = (x: number) => {
        const r = clamp((x - x0 - 10) / (W - x0 - 10), 0, 1);
        return horizon - Math.round(1 + Math.sqrt(r) * 9 + fbm(x / 5, 37) * 3);
      };
      for (let x = x0; x < W; x += 1) {
        const r = (x - x0) / (W - x0);
        const back = horizon - Math.round(1 + r * 15 + fbm(x / 9, 31) * 6);
        for (let y = back; y < horizon; y += 1) put(x, y, C.haze);
        if (x > x0 + 10) {
          const top = frontTop(x);
          for (let y = top; y < horizon; y += 1) put(x, y, y === top ? C.landTop : C.land);
        }
      }
      // observatório da Profª Lira
      const ox = L.obsX;
      const base = frontTop(ox) + 1;
      for (let y = base - 5; y < base; y += 1) for (let x = ox - 5; x < ox + 5; x += 1) put(x, y, x === ox - 5 ? C.bldgRim : C.bldg);
      for (let dy = 0; dy <= 5; dy += 1) {
        const hw = Math.round(Math.sqrt(25 - dy * dy));
        for (let x = ox - hw; x < ox + hw; x += 1) put(x, base - 6 - dy, x === ox - hw ? C.domeRim : C.dome);
      }
      for (let y = base - 11; y < base - 7; y += 1) put(ox + 1, y, C.slit);
      put(ox + 2, base - 11, C.iron);
      put(ox + 3, base - 12, C.iron);
      put(ox + 4, base - 13, C.iron);
      win = { x: ox - 3, y: base - 3 };
      // luzes da vila na beira d'água
      for (let k = 0; k < 7; k += 1) {
        const x = Math.round(x0 + 16 + hash(k, 1, 81) * (W - x0 - 22));
        const y = Math.max(frontTop(x) + 1, horizon - 1 - Math.round(hash(k, 2, 81) * 3));
        lights.push({ x, y, ph: hash(k, 3, 81) * 6.283 });
      }
    }
    // a ilhota do farol
    const lx = L.lightX;
    const sunRight = L.sunX > lx;
    for (let dx = -12; dx <= 12; dx += 1) {
      const r = dx / 12;
      const hh = Math.max(0, Math.round(5.5 * (1 - r * r) + (noise(dx / 3 + 40, 41) - 0.5) * 2));
      for (let y = horizon - hh; y < horizon; y += 1) put(lx + dx, y, y === horizon - hh ? C.rockTop : C.rock);
    }
    const foot = horizon - 5;
    const towerH = L.portrait ? 18 : 22;
    for (let j = 0; j < towerH; j += 1) {
      const y = foot - j;
      const half = 3 - Math.round((j / towerH) * 1.2);
      const stripe = Math.floor(j / 4) % 2 === 0 ? C.towerA : C.towerB;
      for (let x = lx - half; x < lx + half; x += 1) put(x, y, stripe);
      put(sunRight ? lx + half - 1 : lx - half, y, C.towerRim);
    }
    const top = foot - towerH;
    for (let x = lx - 3; x < lx + 3; x += 1) put(x, top, C.iron);
    for (let j = 1; j <= 3; j += 1) {
      put(lx - 2, top - j, C.iron);
      put(lx + 1, top - j, C.iron);
    }
    for (let x = lx - 2; x < lx + 2; x += 1) put(x, top - 4, C.iron);
    put(lx - 1, top - 5, C.iron);
    put(lx, top - 5, C.iron);
    put(lx, top - 6, C.iron);
    lamp = { x: lx - 1, y: top - 3 };
  }

  function paintForeground(): void {
    const { W, H, edgeX, cliffY } = L;
    fg = new Uint32Array(W * H);
    surface = new Int16Array(W).fill(-1);
    face = new Int16Array(H).fill(-1);
    const put = (x: number, y: number, c: number) => {
      if (x >= 0 && x < W && y >= 0 && y < H) fg[y * W + x] = c;
    };
    const rise = L.portrait ? 7 : 11;
    for (let x = 0; x <= edgeX + 2 && x < W; x += 1) {
      const rel = Math.min(1, x / edgeX);
      let s = cliffY - Math.round(Math.pow(1 - rel, 1.7) * rise) + Math.round((noise(x / 6, 51) - 0.5) * 2.4);
      const toEdge = edgeX - x;
      if (toEdge < 4) s += [5, 3, 1, 0][Math.max(0, toEdge)];
      surface[x] = s;
    }
    for (let y = 0; y < H; y += 1) {
      const below = Math.max(0, y - cliffY);
      face[y] = edgeX - Math.round(below * (L.portrait ? 0.18 : 0.1)) + Math.round((noise(y / 4, 53) - 0.5) * 4);
    }
    for (let x = 0; x <= edgeX + 2 && x < W; x += 1) {
      const s = surface[x];
      const grass = 3 + Math.round(noise(x / 4, 55) * 2);
      for (let y = Math.max(0, s); y < H; y += 1) {
        if (x > face[y]) continue;
        let c: number;
        if (y === s) c = C.grassRim;
        else if (y < s + grass) c = bayer(x, y) < 0.5 ? C.grassA : C.grassB;
        else if (y === s + grass) c = C.soil;
        else {
          const n = noise2(x / 7, y / 2.2, 59);
          c = n > 0.66 ? (noise2(x / 7, (y - 1) / 2.2, 59) <= 0.66 ? C.ledge : C.rockLight) : n < 0.18 ? C.rockDark : C.rockBody;
        }
        if (y > s + 1 && x === face[y]) c = C.cliffRim;
        else if (y > s + 2 && x === face[y] - 1) c = C.cliffRim2;
        put(x, y, c);
      }
    }
    // pedras no mar, com a crista acesa
    const seaH = H - L.horizon;
    rocks = L.portrait
      ? [{ x: edgeX + 16, y: Math.min(H - 3, cliffY + 30), w: 7 }]
      : [
          { x: edgeX + 12, y: L.horizon + Math.round(seaH * 0.66), w: 9 },
          { x: edgeX + 36, y: L.horizon + Math.round(seaH * 0.32), w: 5 },
        ];
    for (const r of rocks) {
      const rh = Math.max(2, Math.round(r.w * 0.45));
      const mask = (x: number, y: number) => {
        const dy = r.y - y;
        if (dy < 0 || dy >= rh) return false;
        const half = (r.w / 2) * Math.sqrt(1 - (dy / rh) * (dy / rh));
        return Math.abs(x + 0.5 - r.x) <= half;
      };
      for (let y = r.y - rh; y <= r.y; y += 1)
        for (let x = r.x - r.w; x <= r.x + r.w; x += 1)
          if (mask(x, y)) put(x, y, !mask(x, y - 1) || !mask(x + 1, y) ? C.seaRockRim : C.seaRock);
    }
    if (L.treeX >= 0) paintTree(put);
  }

  /** Pinheiro torto pelo vento na beira do penhasco: tronco grosso afinando, galhos e copas em
   *  almofadas, com a borda virada para o sol acesa e a de cima pegando o roxo do céu. */
  function paintTree(put: (x: number, y: number, c: number) => void): void {
    const { W, H, treeX } = L;
    const base = surface[treeX];
    const height = Math.round(H * 0.5);
    const s = H / 215;
    const lean = H * 0.09;
    const trunkAt = (k: number) => treeX + lean * Math.pow(k, 1.4) + Math.sin(k * 5.2) * 1.8;
    // 1 = madeira, 2 = folha (folha cobre madeira)
    const mask = new Uint8Array(W * H);
    const mark = (x: number, y: number, v: number) => {
      if (x >= 0 && x < W && y >= 0 && y < H && mask[y * W + x] < v) mask[y * W + x] = v;
    };
    for (let j = 0; j <= height; j += 1) {
      const k = j / height;
      const cx = trunkAt(k);
      const w = 6.5 - 4.5 * k + Math.max(0, 3 - j);
      for (let x = Math.round(cx - w / 2); x < Math.round(cx + w / 2); x += 1) mark(x, base - j, 1);
    }
    // [ponto no tronco, deslocamento da copa, raio x, raio y]
    const pads: [number, number, number, number][] = [
      [1, 3, 0.075, 0.026],
      [0.8, 17, 0.062, 0.022],
      [0.62, -9, 0.05, 0.02],
      [0.46, 24, 0.056, 0.019],
    ];
    pads.forEach(([k, dx, rx, ry], index) => {
      const bx = trunkAt(k);
      const by = base - k * height;
      const px = bx + dx * s;
      const py = by - 3 * s;
      const steps = Math.ceil(Math.abs(px - bx)) + 1;
      for (let i = 0; i <= steps; i += 1) {
        const q = i / steps;
        const x = Math.round(bx + (px - bx) * q);
        const y = Math.round(by + (py - by) * q - Math.sin(q * Math.PI) * 1.5);
        mark(x, y, 1);
        mark(x, y + 1, 1);
      }
      const RX = rx * H;
      const RY = ry * H;
      for (let y = Math.floor(py - RY * 1.7); y <= Math.ceil(py + RY); y += 1) {
        for (let x = Math.floor(px - RX - 1); x <= Math.ceil(px + RX + 1); x += 1) {
          const u = (x - px) / RX;
          const above = y < py;
          const v = (y - py) / (RY * (above ? 0.85 + noise(x / 2.2, 64 + index) * 0.8 : 0.6));
          if (u * u + v * v < 1) mark(x, y, 2);
        }
      }
    });
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);
    // pontas de agulha saindo por cima das copas
    const tufts: number[] = [];
    for (let y = 1; y < H; y += 1)
      for (let x = 0; x < W; x += 1) if (mask[y * W + x] === 2 && !at(x, y - 1) && hash(x, y, 68) < 0.3) tufts.push((y - 1) * W + x);
    for (const i of tufts) mask[i] = 2;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const m = mask[y * W + x];
        if (!m) continue;
        let c: number;
        if (m === 1) c = at(x + 1, y) === 0 ? C.barkRim : C.bark;
        else if (!at(x + 1, y) || (!at(x, y - 1) && !at(x + 1, y - 1))) c = C.leafRim;
        else if (!at(x + 2, y) || !at(x, y - 1)) c = C.leafRim2;
        else if (!at(x, y + 1)) c = C.bark;
        else c = noise2(x / 3, y / 2, 65) > 0.6 ? C.leaf2 : C.leaf;
        put(x, y, c);
      }
    }
  }

  function placeLife(): void {
    const { W, edgeX, cliffY, portrait } = L;
    blades = [];
    for (let x = 0; x < Math.min(W, edgeX - 1); x += 1) {
      if (hash(x, 1, 71) >= 0.55) continue;
      const h = 1 + Math.round(noise(x / 2.5, 73) * 3 + hash(x, 2, 74) * 1.4);
      const f = hash(x, 3, 75);
      blades.push({ x, h, flower: f < 0.035 ? 1 : f < 0.07 ? 2 : 0 });
    }
    flies = [];
    const count = portrait ? 8 : 13;
    for (let k = 0; k < count; k += 1) {
      flies.push({
        x: 4 + hash(k, 1, 91) * (edgeX + 14),
        y: cliffY - 6 - hash(k, 2, 91) * (portrait ? 28 : 42),
        ph: hash(k, 3, 91) * 6.283,
        sp: 0.25 + hash(k, 4, 91) * 0.35,
        rx: 4 + hash(k, 5, 91) * 9,
        ry: 2 + hash(k, 6, 91) * 5,
      });
    }
  }

  function paintVignette(): void {
    const { W, H } = L;
    vig = new Uint8Array(W * H);
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const u = x / W - 0.5;
        const v = y / H - 0.5;
        const f = clamp((u * u * 1.5 + v * v * 1.9 - 0.22) * 1.3, 0, 0.36);
        vig[y * W + x] = Math.floor(f * 8 + bayer(x, y));
      }
    }
  }

  function rebuild(W: number, H: number): void {
    L = layoutFor(W, H);
    image = g2d.createImageData(W, H);
    buf = new Uint32Array(image.data.buffer);
    paintSky();
    placeStars();
    const h = L.horizon;
    bands = [
      makeBand(Math.round(h * 0.47), 4, 0.36, 11, 0.5, CLOUD_HIGH),
      makeBand(Math.round(h * 0.71), 7, 0.42, 17, 0.8, CLOUD_MID),
      makeBand(Math.round(h * 0.9), 3, 0.34, 23, 1.2, CLOUD_LOW),
    ];
    paintFar();
    paintForeground();
    placeLife();
    paintVignette();
    logoX = stage === "press" ? L.logoPressX : L.logoMenuX;
    hero = heroSheet ? buildHero(heroSheet) : null;
    partner = partnerImg && partnerSpecies ? buildPartner(partnerImg, partnerSpecies) : null;
  }

  function measure(): void {
    const host = canvas.parentElement;
    const vw = host?.clientWidth || window.innerWidth;
    const vh = host?.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const dw = vw * dpr;
    const dh = vh * dpr;
    const portrait = vw / vh <= 0.9;
    const P = Math.max(2, Math.round(portrait ? Math.min(dw / 132, dh / 250) : Math.min(dh / 210, dw / 300)));
    const W = Math.ceil(dw / P);
    const H = Math.ceil(dh / P);
    const css = P / dpr;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * css}px`;
    canvas.style.height = `${H * css}px`;
    canvas.style.left = `${Math.floor((vw - W * css) / 2)}px`;
    canvas.style.top = `${Math.floor((vh - H * css) / 2)}px`;
    opts.onScale?.(css);
    rebuild(W, H);
  }

  // ---------- sprites ----------

  function buildHero(sheet: HTMLCanvasElement): Sprite | null {
    const g = sheet.getContext("2d");
    if (!g) return null;
    // linha 2 = de costas, coluna 0 = parado
    const data = g.getImageData(0, 64, 16, 32).data;
    return grade(data, 16, 32, L.sunX > L.heroX);
  }

  function buildPartner(img: HTMLImageElement, species: string): Sprite | null {
    const probe = document.createElement("canvas");
    probe.width = img.width;
    probe.height = img.height;
    const pg = probe.getContext("2d");
    if (!pg) return null;
    pg.drawImage(img, 0, 0);
    const data = pg.getImageData(0, 0, img.width, img.height).data;
    let x0 = img.width;
    let y0 = img.height;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < img.height; y += 1)
      for (let x = 0; x < img.width; x += 1)
        if (data[(y * img.width + x) * 4 + 3] > 24) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const th = petHeight(species);
    const tw = Math.max(1, Math.round((w * th) / h));
    const out = document.createElement("canvas");
    out.width = tw;
    out.height = th;
    const og = out.getContext("2d");
    if (!og) return null;
    og.imageSmoothingEnabled = true;
    og.imageSmoothingQuality = "high";
    og.drawImage(probe, x0, y0, w, h, 0, 0, tw, th);
    const pixels = og.getImageData(0, 0, tw, th).data;
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = pixels[i] > 110 ? 255 : 0;
    return grade(pixels, tw, th, true);
  }

  // ---------- desenho por quadro ----------

  function blitLayer(layer: Uint32Array): void {
    for (let i = 0; i < layer.length; i += 1) if (layer[i] !== 0) buf[i] = layer[i];
  }

  function drawStars(t: number): void {
    const { W } = L;
    for (const s of stars) {
      const tw = Math.sin(t * s.sp + s.ph);
      const i = s.y * W + s.x;
      if (s.kind === 0) {
        if (tw > -0.4) buf[i] = C.starDim;
      } else if (s.kind === 1) {
        buf[i] = tw > 0.15 ? C.starMid : C.starDim;
      } else {
        buf[i] = C.starHot;
        if (tw > -0.5) {
          buf[i - 1] = blend(buf[i - 1], C.starMid, 0.7);
          buf[i + 1] = blend(buf[i + 1], C.starMid, 0.7);
        }
        if (tw > 0.35 && s.y > 1) {
          buf[i - W] = blend(buf[i - W], C.starMid, 0.7);
          buf[i + W] = blend(buf[i + W], C.starMid, 0.7);
        }
      }
    }
  }

  function drawShootingStar(t: number): void {
    const cycle = 13;
    const n = Math.floor(t / cycle);
    const p = (t - n * cycle) / 0.75;
    if (p >= 1 || n % 2 === 1) return;
    const { W, horizon } = L;
    const sx = (0.3 + hash(n, 1, 93) * 0.6) * W;
    const sy = (0.05 + hash(n, 2, 93) * 0.22) * horizon;
    const hx = sx - p * 46;
    const hy = sy + p * 17;
    for (let k = 0; k < 10; k += 1) {
      const x = Math.round(hx + k * 2.7);
      const y = Math.round(hy - k);
      if (x < 0 || x >= W || y < 0 || y >= horizon * 0.7) continue;
      const a = (1 - k / 10) * (p < 0.8 ? 1 : (1 - p) / 0.2);
      const i = y * W + x;
      buf[i] = blend(buf[i], k === 0 ? C.starHot : C.starMid, a);
    }
  }

  function drawClouds(t: number): void {
    const { W, horizon, sunX, sunR } = L;
    for (const b of bands) {
      const off = Math.floor(t * b.speed);
      const cells = b.cells;
      for (let k = 0; k < cells.length; k += 3) {
        const lx = cells[k];
        const y = cells[k + 1];
        const cls = cells[k + 2];
        if (y < 0 || y >= horizon) continue;
        if (cls === 1 && bayer(lx, y) > 0.55) continue;
        const x = (lx + off) % W;
        const hot = Math.abs(x - sunX) < sunR * 2.4;
        const cc = b.colors;
        buf[y * W + x] = cls === 2 ? (hot ? cc.hotRim : cc.rim) : cls === 1 ? cc.top : hot ? cc.hotBody : cc.body;
      }
    }
  }

  function drawBirds(t: number): void {
    const cycle = 26;
    const p = (t % cycle) / 15;
    if (p >= 1) return;
    const { W, horizon } = L;
    const flock: [number, number][] = [[0, 0], [7, -3], [12, 1]];
    const bx = W + 14 - p * (W + 40);
    const by = horizon * 0.4 + Math.sin(t * 0.9) * 2;
    flock.forEach(([ox, oy], k) => {
      const x = Math.round(bx + ox);
      const y = Math.round(by + oy + Math.sin(t * 1.3 + k) * 1.2);
      const up = (Math.floor(t * 5 + k * 1.7) & 1) === 0;
      const pts: [number, number][] = up
        ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]]
        : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]];
      for (const [dx, dy] of pts) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < W && yy >= 0 && yy < horizon) buf[yy * W + xx] = C.bird;
      }
    });
  }

  function drawLights(t: number): void {
    const { W } = L;
    const facing = Math.cos(t * 0.85);
    const lampColor = facing > 0.5 ? C.lampHot : C.lamp;
    for (let dy = 0; dy < 3; dy += 1) for (let dx = 0; dx < 2; dx += 1) buf[(lamp.y + dy) * W + lamp.x + dx] = lampColor;
    if (win.x >= 0) {
      const on = Math.sin(t * 0.37) > -0.9;
      buf[win.y * W + win.x] = on ? C.window : C.bldg;
      buf[win.y * W + win.x + 1] = on ? C.window : C.bldg;
    }
    for (const l of lights) buf[l.y * W + l.x] = Math.sin(t * 1.3 + l.ph) > -0.3 ? C.town : C.townDim;
  }

  /** O facho gira: visto de frente vira clarão, de lado vira uma faixa longa. */
  function drawBeam(t: number): void {
    const { W, horizon } = L;
    const a = t * 0.85;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const cx = lamp.x + 1;
    const cy = lamp.y + 1;
    const len = Math.round(W * 0.42 * Math.abs(s));
    const dir = s >= 0 ? 1 : -1;
    const strength = 0.32 + 0.3 * Math.max(0, c);
    for (let r = 2; r < len; r += 1) {
      const x = cx + dir * r;
      if (x < 0 || x >= W) break;
      const half = 0.6 + r * 0.07;
      const fade = (1 - r / len) * strength;
      const span = Math.ceil(half);
      for (let dy = -span; dy <= span; dy += 1) {
        const y = cy + dy;
        if (y < 0 || y >= horizon) continue;
        const k = fade * (1 - Math.abs(dy) / (half + 0.6));
        if (k <= 0) continue;
        const level = Math.floor(k * 4 + bayer(x, y)) / 4;
        if (level > 0) buf[y * W + x] = blend(buf[y * W + x], C.beam, level * 0.6);
      }
    }
    if (c > 0.8) {
      const rad = 1.5 + ((c - 0.8) / 0.2) * 4;
      const R = Math.ceil(rad * 2.6);
      for (let dy = -R; dy <= R; dy += 1) {
        for (let dx = -R; dx <= R; dx += 1) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || x >= W || y < 0 || y >= horizon) continue;
          const d = Math.hypot(dx, dy * 1.6) / rad;
          const ray = dy === 0 ? Math.max(0, 1 - Math.abs(dx) / (rad * 2.6)) : 0;
          const k = Math.max(1 - d, ray * 0.9);
          if (k > 0 && bayer(x, y) < k) buf[y * W + x] = blend(buf[y * W + x], C.lampHot, 0.7);
        }
      }
    }
  }

  function drawSea(t: number): void {
    const { W, H, horizon, sunX, sunR } = L;
    const seaH = H - horizon;
    for (let y = horizon; y < H; y += 1) {
      const d = y - horizon;
      const depth = d / seaH;
      const src = Math.max(0, horizon - 1 - d) * W;
      const amp = 0.4 + depth * 2.6;
      const off = Math.round(Math.sin(d * 0.85 + t * 2) * amp + Math.sin(d * 0.31 - t * 1.1) * amp * 0.5);
      const k = 0.22 + depth * 0.4;
      const seg = 3 + Math.round(depth * 9);
      const drift = t * (2 + depth * 6) * (d & 1 ? 1 : -0.6) + d * 13;
      const row = y * W;
      for (let x = 0; x < W; x += 1) {
        let sx = x + off;
        if (sx < 0) sx = 0;
        else if (sx >= W) sx = W - 1;
        const hv = hash(Math.floor((x + drift) / seg), d, 77);
        const from = buf[src + sx];
        const bright = (from & 255) * 2 + ((from >>> 8) & 255) * 5 + ((from >>> 16) & 255) > 1500;
        const trough = bright ? (hv < 0.38 ? 0.3 : 0) : hv < 0.2 ? 0.16 : 0;
        let kk = Math.floor((k + trough) * 10 + bayer(x, y)) / 10;
        if (kk > 0.9) kk = 0.9;
        let c = blend(from, bright ? C.seaWarm : C.seaDeep, kk);
        if (hv > 0.965) c = blend(c, C.crest, 0.35 * (1 - depth * 0.5));
        buf[row + x] = c;
      }
      // caminho de brilho do sol
      const gw = sunR * (0.55 + depth * 1.6);
      const tick = Math.floor(t * 4 + d * 0.37);
      const glit = depth < 0.25 ? C.glit0 : depth < 0.6 ? C.glit1 : C.glit2;
      for (let x = Math.max(0, Math.floor(sunX - gw)); x <= Math.min(W - 1, Math.ceil(sunX + gw)); x += 1) {
        const e = 1 - Math.abs(x - sunX) / gw;
        if (e <= 0) continue;
        if (hash(Math.floor((x + d * 2) / 2), d, tick) < e * e * (0.5 - depth * 0.25)) buf[row + x] = glit;
      }
    }
    // a linha clara onde o mar encontra o céu
    const hr = horizon * W;
    for (let x = 0; x < W; x += 1) buf[hr + x] = blend(buf[hr + x], C.horizon, 0.45);
  }

  function drawSurf(t: number): void {
    const { W, H, horizon } = L;
    const tick = Math.floor(t * 2.5);
    for (const r of rocks) {
      for (let x = r.x - Math.ceil(r.w / 2) - 1; x <= r.x + Math.ceil(r.w / 2) + 1; x += 1) {
        if (x < 0 || x >= W || r.y + 1 >= H) continue;
        if (hash(x, tick, 61) < 0.5) buf[(r.y + 1) * W + x] = C.foam;
      }
    }
    for (let y = Math.max(horizon + 4, L.cliffY + 4); y < H; y += 1) {
      const x = face[y] + 1;
      if (x > 0 && x < W && hash(y, tick, 62) < 0.4) buf[y * W + x] = C.foam;
    }
  }

  function drawBlades(t: number): void {
    const { W } = L;
    for (const b of blades) {
      const s = surface[b.x];
      const sway = Math.sin(t * 1.6 + b.x * 0.23) * 0.7 + Math.sin(t * 0.55 + b.x * 0.05) * 0.8;
      let tipX = b.x;
      for (let j = 1; j <= b.h; j += 1) {
        const q = j / b.h;
        const x = b.x + Math.round(sway * q * q * b.h * 0.45);
        const y = s - j;
        if (x < 0 || x >= W || y < 0) continue;
        buf[y * W + x] = j === b.h ? C.bladeTip : j === b.h - 1 ? C.bladeRim : C.grassA;
        tipX = x;
      }
      if (b.flower) {
        const y = s - b.h - 1;
        if (y >= 0 && tipX >= 0 && tipX < W) buf[y * W + tipX] = b.flower === 1 ? C.flowerA : C.flowerB;
      }
    }
  }

  function drawSprite(s: Sprite, x0: number, y0: number, split: number): void {
    const { W, H } = L;
    const put = (r: number, dy: number) => {
      const y = y0 + r + dy;
      if (y < 0 || y >= H) return;
      for (let c = 0; c < s.w; c += 1) {
        const v = s.px[r * s.w + c];
        const x = x0 + c;
        if (v !== 0 && x >= 0 && x < W) buf[y * W + x] = v;
      }
    };
    for (let r = Math.max(0, split); r < s.h; r += 1) put(r, 0);
    for (let r = 0; r < Math.min(split < 0 ? s.h : split, s.h); r += 1) put(r, split < 0 ? 0 : 1);
  }

  function shadowAt(cx: number, feet: number, width: number): void {
    const { W, H } = L;
    const half = Math.max(3, Math.round(width * 0.4));
    for (let dx = -half; dx <= half; dx += 1) {
      const x = cx + dx;
      if (x < 0 || x >= W) continue;
      if (feet < H) buf[feet * W + x] = blend(buf[feet * W + x], C.shadow, 0.55);
      if (Math.abs(dx) < half - 1 && feet + 1 < H) buf[(feet + 1) * W + x] = blend(buf[(feet + 1) * W + x], C.shadow, 0.35);
    }
  }

  function drawCharacters(t: number): void {
    const surf = (x: number) => surface[clamp(x, 0, surface.length - 1)];
    if (partner) {
      const half = Math.ceil(partner.w / 2);
      let px = L.heroX + 11 + half;
      if (px + half > L.edgeX - 2) px = L.heroX - 11 - half;
      const feet = surf(px);
      const since = t - hopAt;
      const hop = since >= 0 && since < 0.7 ? Math.round(Math.abs(Math.sin((since / 0.7) * Math.PI * 2)) * 3) : 0;
      const idle = !opts.reduced && hop === 0 && (t + 1.1) % 2.1 < 0.35;
      shadowAt(px, feet, partner.w);
      drawSprite(partner, px - half, feet - partner.bottom - hop, idle ? partner.h - 3 : -1);
    }
    if (hero) {
      const feet = surf(L.heroX);
      const breath = !opts.reduced && t % 3.2 < 1.2;
      shadowAt(L.heroX, feet, 12);
      drawSprite(hero, L.heroX - 8, feet - hero.bottom, breath ? 19 : -1);
    }
  }

  function drawFlies(t: number): void {
    const { W, H } = L;
    for (const f of flies) {
      const x = Math.round(f.x + Math.sin(t * f.sp + f.ph) * f.rx);
      const y = Math.round(f.y + Math.sin(t * f.sp * 1.37 + f.ph * 2) * f.ry);
      if (x < 1 || x >= W - 1 || y < 1 || y >= H - 1) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + f.ph * 3);
      if (pulse < 0.25) continue;
      const i = y * W + x;
      buf[i] = pulse > 0.6 ? C.flyHot : C.fly;
      if (pulse > 0.72) {
        buf[i - 1] = blend(buf[i - 1], C.flyGlow, 0.4);
        buf[i + 1] = blend(buf[i + 1], C.flyGlow, 0.4);
        buf[i - W] = blend(buf[i - W], C.flyGlow, 0.4);
        buf[i + W] = blend(buf[i + W], C.flyGlow, 0.4);
      }
    }
  }

  function applyVignette(): void {
    const f = [0, 0.125, 0.25, 0.375];
    for (let i = 0; i < vig.length; i += 1) {
      const lv = vig[i];
      if (lv) buf[i] = blend(buf[i], C.vignette, f[lv] ?? 0.375);
    }
  }

  function blitArt(art: Art, x0: number, y0: number, alpha: number): void {
    const { W, H } = L;
    for (let y = 0; y < art.h; y += 1) {
      const yy = y0 + y;
      if (yy < 0 || yy >= H) continue;
      for (let x = 0; x < art.w; x += 1) {
        const v = art.px[y * art.w + x];
        const xx = x0 + x;
        if (v === 0 || xx < 0 || xx >= W) continue;
        if (alpha < 1 && bayer(xx, yy) >= alpha) continue;
        buf[yy * W + xx] = v;
      }
    }
  }

  function drawLogo(t: number, dt: number): void {
    const { W, H } = L;
    const target = stage === "press" ? L.logoPressX : L.logoMenuX;
    logoX += (target - logoX) * (opts.reduced ? 1 : 1 - Math.exp(-dt * 7));
    const cx = Math.round(logoX);
    let drop = 0;
    if (!opts.reduced) {
      const p = (t - 0.4) / 1.0;
      const from = L.logoY + logo.h + 4;
      if (p < 0) drop = -from;
      else if (p < 1) drop = -Math.round((1 - easeOutBounce(p)) * from);
    }
    const lx = cx - (logo.w >> 1);
    const ly = L.logoY + drop;
    blitArt(logo, lx, ly, 1);
    // brilho passando na diagonal
    const per = 5.2;
    const since = t - 1.9;
    if (since > 0 && since % per < 0.65) {
      const g = ((since % per) / 0.65) * (logo.w + logo.h) - logo.h;
      for (let y = 0; y < logo.h; y += 1) {
        for (let x = 0; x < logo.w; x += 1) {
          if (!logo.face[y * logo.w + x]) continue;
          const k = x + (logo.h - y) * 0.6 - g;
          if (k < 0 || k >= 2.2) continue;
          const xx = lx + x;
          const yy = ly + y;
          if (xx >= 0 && xx < W && yy >= 0 && yy < H) buf[yy * W + xx] = blend(buf[yy * W + xx], C.white, 0.75);
        }
      }
    }
    // estrela piscando no canto do logo
    const sp = (t % 3.4) / 3.4;
    const size = sp < 0.1 ? 1 : sp < 0.2 ? 2 : sp < 0.3 ? 1 : 0;
    if (size > 0 && t > 1.6) {
      const sx = lx + logo.w - 3;
      const sy = ly + 1;
      const dot = (x: number, y: number, c: number) => {
        if (x >= 0 && x < W && y >= 0 && y < H) buf[y * W + x] = c;
      };
      dot(sx, sy, C.white);
      for (let k = 1; k <= size; k += 1) {
        const c = k === size ? C.subGem : C.white;
        dot(sx - k, sy, c);
        dot(sx + k, sy, c);
        dot(sx, sy - k, c);
        dot(sx, sy + k, c);
      }
    }
    const subAlpha = opts.reduced ? 1 : clamp((t - 1.35) / 0.5, 0, 1);
    if (subAlpha > 0) blitArt(subtitle, cx - (subtitle.w >> 1), ly + logo.h + 2, subAlpha);
  }

  function dissolve(a: number): void {
    const { W, H } = L;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (bayer(x, y) >= a) buf[y * W + x] = C.night;
  }

  function draw(t: number, dt: number): void {
    if (!sky.length) return;
    buf.set(sky);
    drawStars(t);
    drawShootingStar(t);
    drawClouds(t);
    drawBirds(t);
    blitLayer(far);
    drawLights(t);
    drawBeam(t);
    drawSea(t);
    blitLayer(fg);
    drawSurf(t);
    drawBlades(t);
    drawCharacters(t);
    drawFlies(t);
    applyVignette();
    drawLogo(t, dt);
    if (!opts.reduced && t < FADE_IN) dissolve(1 - Math.pow(1 - t / FADE_IN, 2));
    g2d.putImageData(image, 0, 0);
  }

  const still = () => draw(STILL_TIME, 1);

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    if (now - last < 32) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
    last = now;
    draw((now - born) / 1000, dt);
  }

  function onResize(): void {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      measure();
      if (opts.reduced) still();
    });
  }

  measure();
  window.addEventListener("resize", onResize);
  if (opts.reduced) still();
  else raf = requestAnimationFrame(frame);

  return {
    setHero(sheet) {
      heroSheet = sheet;
      hero = sheet ? buildHero(sheet) : null;
      if (opts.reduced) still();
    },
    setPartner(img, species) {
      partnerImg = img;
      partnerSpecies = species;
      partner = img && species ? buildPartner(img, species) : null;
      if (opts.reduced) still();
    },
    setStage(next) {
      if (next === stage) return;
      if (stage === "press" && next === "menu") hopAt = (performance.now() - born) / 1000;
      stage = next;
      if (opts.reduced) still();
    },
    destroy() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
    },
  };
}

export const __test = { layoutFor, buildLogo, buildSubtitle, unpack };
