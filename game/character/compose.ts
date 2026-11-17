import {
  type Appearance,
  CLOTH,
  type Direction,
  EYES,
  HAIR_COLORS,
  SKIN,
} from "@/game/character/appearance";

export const FRAME_W = 16;
export const FRAME_H = 32;
export const SHEET_W = 64;
export const SHEET_H = 128;
export const DIR_ROWS: Direction[] = ["down", "right", "up", "left"];

type RGB = [number, number, number];
type Cls = "empty" | "outline" | "skin" | "shade" | "shadow";

const OUTLINE: RGB = [23, 23, 23];

function hex(value: string): RGB {
  const v = value.replace("#", "");
  return [Number.parseInt(v.slice(0, 2), 16), Number.parseInt(v.slice(2, 4), 16), Number.parseInt(v.slice(4, 6), 16)];
}

function near(r: number, g: number, b: number, target: RGB): boolean {
  return Math.abs(r - target[0]) < 12 && Math.abs(g - target[1]) < 12 && Math.abs(b - target[2]) < 12;
}

class Frame {
  cls: Cls[][];
  out: Uint8ClampedArray;
  added = new Set<number>();
  headTop = 0;

  constructor(
    private base: Uint8ClampedArray,
    private ox: number,
    private oy: number,
    public dir: Direction,
  ) {
    this.out = new Uint8ClampedArray(FRAME_W * FRAME_H * 4);
    this.cls = [];
    let top = -1;
    for (let y = 0; y < FRAME_H; y += 1) {
      const row: Cls[] = [];
      for (let x = 0; x < FRAME_W; x += 1) {
        const i = ((oy + y) * SHEET_W + ox + x) * 4;
        const [r, g, b, a] = [base[i], base[i + 1], base[i + 2], base[i + 3]];
        let c: Cls = "empty";
        if (a > 0 && a < 200) c = "shadow";
        else if (a >= 200 && near(r, g, b, OUTLINE)) c = "outline";
        else if (a >= 200 && near(r, g, b, [232, 212, 178])) c = "skin";
        else if (a >= 200 && near(r, g, b, [191, 167, 135])) c = "shade";
        else if (a >= 200) c = "outline";
        row.push(c);
        const o = (y * FRAME_W + x) * 4;
        this.out[o] = r;
        this.out[o + 1] = g;
        this.out[o + 2] = b;
        this.out[o + 3] = a;
        if (c === "outline" && top < 0) top = y;
      }
      this.cls.push(row);
    }
    this.headTop = Math.max(0, top);
  }

  at(x: number, y: number): Cls {
    if (x < 0 || y < 0 || x >= FRAME_W || y >= FRAME_H) return "empty";
    return this.cls[y][x];
  }

  body(x: number, y: number): boolean {
    const c = this.at(x, y);
    return c === "skin" || c === "shade";
  }

  set(x: number, y: number, rgb: RGB): void {
    if (x < 0 || y < 0 || x >= FRAME_W || y >= FRAME_H) return;
    const o = (y * FRAME_W + x) * 4;
    this.out[o] = rgb[0];
    this.out[o + 1] = rgb[1];
    this.out[o + 2] = rgb[2];
    this.out[o + 3] = 255;
    const c = this.cls[y][x];
    if (c === "empty" || c === "shadow") this.added.add(y * FRAME_W + x);
  }

  y(rel: number): number {
    return this.headTop + rel;
  }

  bounds(rel: number): { L: number; R: number } | null {
    const y = this.y(rel);
    if (y < 0 || y >= FRAME_H) return null;
    let L = -1;
    let R = -1;
    for (let x = 0; x < FRAME_W; x += 1) {
      if (this.cls[y][x] === "outline") {
        if (L < 0) L = x;
        R = x;
      }
    }
    return L < 0 ? null : { L, R };
  }

  interior(rel: number): number[] {
    const b = this.bounds(rel);
    if (!b) return [];
    const xs: number[] = [];
    for (let x = b.L + 1; x < b.R; x += 1) if (this.body(x, this.y(rel))) xs.push(x);
    return xs;
  }

  runs(rel: number): number[][] {
    const y = this.y(rel);
    const result: number[][] = [];
    let current: number[] = [];
    for (let x = 0; x < FRAME_W; x += 1) {
      if (this.body(x, y)) current.push(x);
      else if (current.length) {
        result.push(current);
        current = [];
      }
    }
    if (current.length) result.push(current);
    return result;
  }

  outline(): void {
    const add: number[] = [];
    for (const index of this.added) {
      const x = index % FRAME_W;
      const y = Math.floor(index / FRAME_W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= FRAME_W || ny >= FRAME_H) continue;
        const key = ny * FRAME_W + nx;
        if (this.added.has(key)) continue;
        const c = this.cls[ny][nx];
        if (c === "empty" || c === "shadow") add.push(key);
      }
    }
    for (const key of add) {
      const x = key % FRAME_W;
      const y = Math.floor(key / FRAME_W);
      const o = (y * FRAME_W + x) * 4;
      this.out[o] = OUTLINE[0];
      this.out[o + 1] = OUTLINE[1];
      this.out[o + 2] = OUTLINE[2];
      this.out[o + 3] = 255;
    }
  }
}

function paintSkinAndEyes(f: Frame, a: Appearance): void {
  const skin = SKIN[a.skin];
  const main = hex(skin.main);
  const shade = hex(skin.shade);
  for (let y = 0; y < FRAME_H; y += 1) {
    for (let x = 0; x < FRAME_W; x += 1) {
      const c = f.at(x, y);
      if (c === "skin") f.set(x, y, main);
      if (c === "shade") f.set(x, y, shade);
    }
  }
  if (f.dir === "up") return;
  const eye = hex(EYES[a.eyes].color);
  const columns = new Map<number, number[]>();
  for (let rel = 5; rel <= 9; rel += 1) {
    const y = f.y(rel);
    for (let x = 1; x < FRAME_W - 1; x += 1) {
      if (f.at(x, y) === "outline" && f.body(x - 1, y) && f.body(x + 1, y)) {
        columns.set(x, [...(columns.get(x) ?? []), y]);
      }
    }
  }
  for (const [x, ys] of columns) {
    const bottom = Math.max(...ys);
    const topY = Math.min(...ys);
    if (ys.length > 1) f.set(x, bottom, eye);
    if (a.sex === "female") {
      const side = f.dir === "down" ? (x < 8 ? -1 : 1) : f.dir === "right" ? 1 : -1;
      f.set(x + side, topY - 1, OUTLINE);
    }
  }
}

function armInfo(f: Frame): { isArm: (x: number, rel: number) => boolean; innerL: number; innerR: number } {
  if (f.dir === "down" || f.dir === "up") {
    const y = f.y(13);
    const xs: number[] = [];
    for (let x = 0; x < FRAME_W; x += 1) if (f.at(x, y) === "outline") xs.push(x);
    const innerL = xs.length >= 4 ? xs[1] : 4;
    const innerR = xs.length >= 4 ? xs[xs.length - 2] : 11;
    return { isArm: (x) => x < innerL || x > innerR, innerL, innerR };
  }
  const backRight = f.dir === "left";
  return {
    innerL: 5,
    innerR: 10,
    isArm: (x, rel) => {
      if (rel < 13) return false;
      const runs = f.runs(rel);
      if (runs.length < 2) return false;
      const arm = backRight ? runs[runs.length - 1] : runs[0];
      return arm.includes(x);
    },
  };
}

function paintClothes(f: Frame, a: Appearance): void {
  const top = CLOTH[a.topColor];
  const topMain = hex(top.main);
  const topShade = hex(top.shade);
  const { isArm, innerL, innerR } = armInfo(f);
  for (let rel = 11; rel <= 14; rel += 1) {
    const y = f.y(rel);
    for (let x = 0; x < FRAME_W; x += 1) {
      if (!f.body(x, y)) continue;
      const arm = isArm(x, rel);
      const hand = arm && rel >= 14;
      let covered = false;
      if (a.top === "tshirt" || a.top === "dress") covered = !arm || rel <= 12;
      else if (a.top === "tank") covered = !arm && !(rel === 11 && (x <= innerL || x >= innerR));
      else covered = !hand;
      if (!covered) continue;
      f.set(x, y, f.at(x, y) === "shade" ? topShade : topMain);
      if (a.top === "jacket" && f.dir === "down" && !arm && (x === 7 || x === 8)) f.set(x, y, hex("#f4f4f6"));
      if (a.top === "hoodie" && f.dir === "up" && rel === 11 && !arm) f.set(x, y, topShade);
      if (a.top === "hoodie" && f.dir === "down" && rel === 13 && !arm && x > innerL + 1 && x < innerR - 1) f.set(x, y, topShade);
    }
  }

  const bottomColor = CLOTH[a.bottomColor];
  const shoes = CLOTH[a.shoesColor];
  const skin = SKIN[a.skin];
  const legMain = a.top === "dress" ? topMain : hex(bottomColor.main);
  const legShade = a.top === "dress" ? topShade : hex(bottomColor.shade);
  const skirted = a.top === "dress" || a.bottom === "skirt";
  for (let rel = 15; rel <= 19; rel += 1) {
    const y = f.y(rel);
    for (let x = 0; x < FRAME_W; x += 1) {
      if (!f.body(x, y)) continue;
      const foot = !f.body(x, y + 1);
      if (foot && rel >= 16) {
        if (a.shoes === "sandals") f.set(x, y, x % 2 ? hex(shoes.main) : hex(skin.shade));
        else f.set(x, y, hex(shoes.main));
        continue;
      }
      if (a.shoes === "boots" && rel >= 16) {
        f.set(x, y, hex(shoes.shade));
        continue;
      }
      if (rel === 15 || (!skirted && a.bottom === "pants")) {
        f.set(x, y, f.at(x, y) === "shade" ? legShade : legMain);
      }
    }
  }
  if (skirted) {
    const b = f.bounds(15);
    if (b) {
      const y = f.y(15);
      for (const x of [b.L, b.R]) {
        if (f.at(x, y) === "outline") f.set(x, y, legShade);
      }
      f.set(b.L - 1, y, legShade);
      f.set(b.R + 1, y, legShade);
    }
  }
}

type HairPainter = (x: number, y: number) => void;

function paintHair(f: Frame, a: Appearance): void {
  const palette = HAIR_COLORS[a.hairColor];
  const main = hex(palette.main);
  const shade = hex(palette.shade);
  const light = hex(palette.light);
  const style = a.hairStyle;
  const capped = a.headwear !== "none";
  const hair = new Set<number>();
  const mark: HairPainter = (x, y) => {
    if (x < 0 || y < 0 || x >= FRAME_W || y >= FRAME_H) return;
    if (capped && y < f.headTop) return;
    hair.add(y * FRAME_W + x);
  };
  const full = (from: number, to: number) => {
    for (let rel = from; rel <= to; rel += 1) for (const x of f.interior(rel)) mark(x, f.y(rel));
  };
  const sides = (from: number, to: number, width: number) => {
    for (let rel = from; rel <= to; rel += 1) {
      const b = f.bounds(rel);
      if (!b) continue;
      for (const x of f.interior(rel)) if (x - b.L <= width || b.R - x <= width) mark(x, f.y(rel));
    }
  };
  const backHalf = (from: number, to: number) => {
    for (let rel = from; rel <= to; rel += 1) {
      const b = f.bounds(rel);
      if (!b) continue;
      const mid = Math.floor((b.L + b.R) / 2);
      for (const x of f.interior(rel)) if (f.dir === "right" ? x <= mid : x >= mid) mark(x, f.y(rel));
    }
  };
  const outside = (side: "left" | "right" | "back" | "both", from: number, to: number, width = 1) => {
    for (let rel = from; rel <= to; rel += 1) {
      const b = f.bounds(rel) ?? f.bounds(10);
      if (!b) continue;
      const y = f.y(rel);
      const wantLeft = side === "left" || side === "both" || (side === "back" && f.dir === "right");
      const wantRight = side === "right" || side === "both" || (side === "back" && f.dir === "left");
      for (let k = 1; k <= width; k += 1) {
        if (wantLeft) mark(b.L - k + (rel > 10 ? 1 : 0), y);
        if (wantRight) mark(b.R + k - (rel > 10 ? 1 : 0), y);
      }
    }
  };
  const crown = (rows: number, spread: number) => {
    const b = f.bounds(0);
    if (!b) return;
    for (let r = 1; r <= rows; r += 1) {
      for (let x = b.L + r - 1 - spread; x <= b.R - r + 1 + spread; x += 1) mark(x, f.y(-r));
    }
  };
  const isFront = f.dir === "down";
  const isBack = f.dir === "up";

  if (style === "buzz") {
    if (isBack) full(1, 6);
    else if (isFront) full(1, 2);
    else {
      full(1, 2);
      backHalf(3, 6);
    }
  } else if (style === "short" || style === "spiky") {
    if (isBack) full(1, 7);
    else if (isFront) {
      full(1, 3);
      sides(4, 6, 1);
    } else {
      full(1, 3);
      backHalf(4, 7);
    }
    if (style === "spiky") {
      const b = f.bounds(0);
      if (b) {
        for (let x = b.L; x <= b.R; x += 1) if ((x - b.L) % 2 === 0) mark(x, f.y(-1));
        mark(b.L + 1, f.y(-2));
        mark(b.R - 1, f.y(-2));
        if (!isFront) mark(f.dir === "right" ? b.L - 1 : b.R + 1, f.y(1));
      }
    }
  } else if (style === "fringe") {
    if (isBack) full(1, 8);
    else if (isFront) {
      full(1, 4);
      const b = f.bounds(5);
      if (b) for (const x of f.interior(5)) if ((x - b.L) % 3 !== 0) mark(x, f.y(5));
      sides(5, 8, 1);
    } else {
      full(1, 4);
      backHalf(5, 8);
    }
  } else if (style === "bob") {
    if (isBack) {
      full(1, 10);
      outside("both", 6, 10);
    } else if (isFront) {
      full(1, 3);
      sides(4, 9, 2);
      outside("both", 6, 9);
    } else {
      full(1, 3);
      backHalf(4, 10);
      outside("back", 5, 10);
    }
  } else if (style === "long") {
    if (isBack) {
      full(1, 10);
      for (let rel = 11; rel <= 14; rel += 1) for (const x of f.interior(rel)) if (x >= 4 && x <= 11) mark(x, f.y(rel));
      outside("both", 5, 13);
    } else if (isFront) {
      full(1, 3);
      sides(4, 10, 2);
      outside("both", 5, 14);
    } else {
      full(1, 3);
      backHalf(4, 10);
      outside("back", 4, 14, 2);
    }
  } else if (style === "ponytail") {
    if (isBack) {
      full(1, 8);
      for (let rel = 9; rel <= 14; rel += 1) {
        mark(7, f.y(rel));
        mark(8, f.y(rel));
      }
    } else if (isFront) {
      full(1, 3);
      sides(4, 6, 1);
    } else {
      full(1, 3);
      backHalf(4, 8);
      outside("back", 3, 10, 2);
    }
  } else if (style === "twintails") {
    if (isBack) {
      full(1, 8);
      outside("both", 4, 12, 2);
    } else if (isFront) {
      full(1, 3);
      sides(4, 6, 1);
      outside("both", 4, 12, 2);
    } else {
      full(1, 3);
      backHalf(4, 8);
      outside("back", 4, 12, 2);
    }
  } else if (style === "bun") {
    if (isBack) full(1, 9);
    else if (isFront) {
      full(1, 3);
      sides(4, 6, 1);
    } else {
      full(1, 3);
      backHalf(4, 8);
    }
    const b = f.bounds(0);
    if (b) {
      const cx = isFront || isBack ? Math.floor((b.L + b.R) / 2) : f.dir === "right" ? b.L + 1 : b.R - 1;
      for (let x = cx - 1; x <= cx + 2; x += 1) mark(x, f.y(-1));
      for (let x = cx - 1; x <= cx + 2; x += 1) mark(x, f.y(-2));
      for (let x = cx; x <= cx + 1; x += 1) mark(x, f.y(-3));
    }
  } else if (style === "afro") {
    if (isBack) full(1, 9);
    else if (isFront) {
      full(1, 4);
      sides(5, 8, 2);
    } else {
      full(1, 4);
      backHalf(5, 9);
    }
    crown(2, 1);
    if (isFront || isBack) outside("both", 0, 8, 2);
    else outside("back", 0, 9, 2);
  }

  for (const key of hair) {
    const x = key % FRAME_W;
    const y = Math.floor(key / FRAME_W);
    const color = style === "buzz" ? shade : main;
    f.set(x, y, color);
  }
  for (const key of hair) {
    const x = key % FRAME_W;
    const y = Math.floor(key / FRAME_W);
    if (style !== "buzz" && f.body(x, y + 1) && !hair.has((y + 1) * FRAME_W + x)) f.set(x, y, shade);
  }
  if (style !== "buzz" && !isBack && !capped) {
    const b = f.bounds(2);
    if (b) for (let x = b.L + 2; x <= b.L + 4; x += 1) if (hair.has(f.y(2) * FRAME_W + x)) f.set(x, f.y(2), light);
  }
}

function paintHeadwear(f: Frame, a: Appearance): void {
  if (a.headwear === "none") return;
  const color = CLOTH[a.headwearColor];
  const main = hex(color.main);
  const shade = hex(color.shade);
  const top = f.bounds(0);
  if (!top) return;
  if (a.headwear === "cap") {
    for (let rel = 0; rel <= 3; rel += 1) {
      const b = f.bounds(rel);
      if (!b) continue;
      for (let x = b.L + 1; x < b.R; x += 1) if (rel > 0 || x > top.L) f.set(x, f.y(rel), main);
    }
    if (f.dir === "down") {
      const b = f.bounds(4);
      if (b) for (let x = b.L + 1; x < b.R; x += 1) f.set(x, f.y(4), shade);
    } else if (f.dir === "up") {
      const b = f.bounds(4);
      if (b) for (let x = b.L + 1; x < b.R; x += 1) f.set(x, f.y(4), main);
    } else {
      const b = f.bounds(4);
      if (b) {
        const front = f.dir === "right" ? b.R : b.L;
        const dir = f.dir === "right" ? 1 : -1;
        for (let k = -2; k <= 2; k += 1) f.set(front + dir * k, f.y(4), shade);
      }
    }
  } else if (a.headwear === "hat") {
    for (let x = top.L + 1; x < top.R; x += 1) f.set(x, f.y(-1), main);
    for (let rel = 0; rel <= 2; rel += 1) {
      const b = f.bounds(rel);
      if (!b) continue;
      for (let x = b.L + 1; x < b.R; x += 1) f.set(x, f.y(rel), rel === 2 ? shade : main);
    }
    const brim = f.bounds(3);
    if (brim) for (let x = brim.L - 1; x <= brim.R + 1; x += 1) f.set(x, f.y(3), shade);
  } else if (a.headwear === "beanie") {
    for (let x = top.L + 1; x < top.R; x += 1) f.set(x, f.y(-1), main);
    for (let rel = 0; rel <= 3; rel += 1) {
      const b = f.bounds(rel);
      if (!b) continue;
      for (let x = b.L + 1; x < b.R; x += 1) f.set(x, f.y(rel), rel === 3 ? shade : main);
    }
  }
}

function paintExtra(f: Frame, a: Appearance): void {
  if (a.extra === "none") return;
  const color = CLOTH[a.extraColor];
  const main = hex(color.main);
  const shade = hex(color.shade);
  if (a.extra === "glasses" && f.dir !== "up") {
    const y = f.y(7);
    const eyes: number[] = [];
    for (let x = 1; x < FRAME_W - 1; x += 1) {
      const lower = f.y(8);
      if (f.at(x, y) === "outline" && f.body(x - 1, y) && f.body(x + 1, y) && f.at(x, lower) === "outline") eyes.push(x);
    }
    if (eyes.length) {
      const frame = hex("#2a3044");
      const lens = hex("#a8d8f4");
      for (let x = Math.min(...eyes) - 1; x <= Math.max(...eyes) + 1; x += 1) if (f.body(x, y)) f.set(x, y, frame);
      for (const x of eyes) f.set(x, y, lens);
    }
  }
  if (a.extra === "scarf") {
    const y = f.y(11);
    for (let x = 0; x < FRAME_W; x += 1) if (f.body(x, y) || f.at(x, y) === "outline") if (f.body(x, y)) f.set(x, y, main);
    if (f.dir === "down") {
      f.set(7, f.y(12), shade);
      f.set(8, f.y(13), shade);
    }
  }
  if (a.extra === "backpack") {
    const info = armInfo(f);
    if (f.dir === "up") {
      for (let rel = 11; rel <= 14; rel += 1) {
        for (let x = info.innerL + 1; x < info.innerR; x += 1) {
          const edge = rel === 11 || rel === 14 || x === info.innerL + 1 || x === info.innerR - 1;
          f.set(x, f.y(rel), edge ? shade : main);
        }
      }
    } else if (f.dir === "down") {
      for (let rel = 11; rel <= 12; rel += 1) {
        if (f.body(info.innerL + 1, f.y(rel))) f.set(info.innerL + 1, f.y(rel), shade);
        if (f.body(info.innerR - 1, f.y(rel))) f.set(info.innerR - 1, f.y(rel), shade);
      }
    } else {
      for (let rel = 11; rel <= 14; rel += 1) {
        const b = f.bounds(rel);
        if (!b) continue;
        const edgeX = f.dir === "right" ? b.L : b.R;
        const dir = f.dir === "right" ? -1 : 1;
        f.set(edgeX + dir, f.y(rel), rel === 11 || rel === 14 ? shade : main);
        f.set(edgeX + dir * 2, f.y(rel), shade);
      }
    }
  }
}

export function composeSheet(base: Uint8ClampedArray, appearance: Appearance): Uint8ClampedArray {
  const out = new Uint8ClampedArray(SHEET_W * SHEET_H * 4);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const frame = new Frame(base, col * FRAME_W, row * FRAME_H, DIR_ROWS[row]);
      paintSkinAndEyes(frame, appearance);
      paintClothes(frame, appearance);
      if (frame.dir === "up") paintExtra(frame, appearance);
      paintHair(frame, appearance);
      paintHeadwear(frame, appearance);
      if (frame.dir !== "up") paintExtra(frame, appearance);
      frame.outline();
      for (let y = 0; y < FRAME_H; y += 1) {
        for (let x = 0; x < FRAME_W; x += 1) {
          const s = (y * FRAME_W + x) * 4;
          const d = ((row * FRAME_H + y) * SHEET_W + col * FRAME_W + x) * 4;
          out[d] = frame.out[s];
          out[d + 1] = frame.out[s + 1];
          out[d + 2] = frame.out[s + 2];
          out[d + 3] = frame.out[s + 3];
        }
      }
    }
  }
  return out;
}

let baseCache: Promise<Uint8ClampedArray> | null = null;

export function loadBase(url = "/assets/sprites/body_base.png"): Promise<Uint8ClampedArray> {
  if (!baseCache) {
    baseCache = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = SHEET_W;
        canvas.height = SHEET_H;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Canvas indisponível"));
        context.drawImage(image, 0, 0);
        resolve(context.getImageData(0, 0, SHEET_W, SHEET_H).data);
      };
      image.onerror = () => reject(new Error("Base do personagem ausente"));
      image.src = url;
    });
  }
  return baseCache;
}

export async function renderSheet(appearance: Appearance): Promise<HTMLCanvasElement> {
  const base = await loadBase();
  const pixels = composeSheet(base, appearance);
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_W;
  canvas.height = SHEET_H;
  const context = canvas.getContext("2d");
  if (context) context.putImageData(new ImageData(new Uint8ClampedArray(pixels), SHEET_W, SHEET_H), 0, 0);
  return canvas;
}
