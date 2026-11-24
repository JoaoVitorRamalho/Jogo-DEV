import { describe, expect, it } from "vitest";
import { SWAY_MS, grassSway, waterMarks } from "@/game/core/mapLife";

/** Folha 2 × 1 tiles de 4 px: o primeiro é todo água, o segundo é água com um canto de areia. */
function sheet(sandPixels: number): Uint8ClampedArray {
  const width = 8;
  const rgba = new Uint8ClampedArray(width * 4 * 4);
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const sand = x >= 4 && y * 4 + (x - 4) < sandPixels;
      rgba.set(sand ? [232, 208, 144, 255] : [48, 120, 232, 255], i);
    }
  }
  return rgba;
}

describe("waterMarks", () => {
  it("marca só o tile que é quase todo água", () => {
    expect([...waterMarks(sheet(0), 8, 4, 4)]).toEqual([1, 1]);
    expect([...waterMarks(sheet(1), 8, 4, 4)]).toEqual([1, 1]);
    expect([...waterMarks(sheet(2), 8, 4, 4)]).toEqual([1, 0]);
  });

  it("ignora pixel transparente e verde", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < rgba.length; i += 4) rgba.set([48, 120, 232, 0], i);
    expect([...waterMarks(rgba, 4, 4, 4)]).toEqual([0]);
    for (let i = 0; i < rgba.length; i += 4) rgba.set([58, 190, 65, 255], i);
    expect([...waterMarks(rgba, 4, 4, 4)]).toEqual([0]);
  });
});

describe("grassSway", () => {
  it("começa e termina parado", () => {
    expect(grassSway(0)).toEqual({ sx: 1, sy: 1 });
    expect(grassSway(SWAY_MS)).toEqual({ sx: 1, sy: 1 });
    expect(grassSway(Number.NaN)).toEqual({ sx: 1, sy: 1 });
  });

  it("abre e abaixa no meio, sem exagero", () => {
    const early = grassSway(SWAY_MS / 6);
    expect(early.sx).toBeGreaterThan(1.05);
    const mid = grassSway(SWAY_MS / 2);
    expect(mid.sy).toBeLessThan(0.95);
    for (let t = 0; t <= SWAY_MS; t += 10) {
      const s = grassSway(t);
      expect(Math.abs(s.sx - 1)).toBeLessThan(0.2);
      expect(s.sy).toBeGreaterThan(0.85);
    }
  });
});
