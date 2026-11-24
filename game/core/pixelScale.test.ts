import { describe, expect, it } from "vitest";
import { bakeTiles, scale2x, upscaleCells } from "@/game/core/pixelScale";

const A = 0xff0000ff;
const B = 0xffffffff;

describe("pixelScale", () => {
  it("enche o canto da diagonal e mantém o pixel solto", () => {
    // diagonal: A no canto de cima à esquerda, B no resto
    const src = new Uint32Array([A, A, B, A, B, B, B, B, B]);
    const out = scale2x(src, 3, 3);
    // o centro (B) tem A em cima e à esquerda: o canto de cima à esquerda vira A
    expect(out[2 * 6 + 2]).toBe(A);
    expect(out[3 * 6 + 3]).toBe(B);
    // pixel sozinho no meio do xadrez continua igual
    const lone = scale2x(new Uint32Array([B, B, B, B, A, B, B, B, B]), 3, 3);
    expect([lone[2 * 6 + 2], lone[2 * 6 + 3], lone[3 * 6 + 2], lone[3 * 6 + 3]]).toEqual([A, A, A, A]);
  });

  it("amplia 4× por célula, com borda repetida e sem misturar vizinhas", () => {
    const src = new Uint32Array([A, A, B, B, A, A, B, B]);
    const out = upscaleCells(src, 4, 2, 2, 2, 2);
    expect(out.width).toBe(2 * (8 + 4));
    expect(out.height).toBe(8 + 4);
    // a borda da primeira célula repete A, a da segunda repete B
    expect(out.data[0]).toBe(A);
    expect(out.data[11]).toBe(A);
    expect(out.data[12]).toBe(B);
    expect(out.data[out.width * out.height - 1]).toBe(B);
  });
});

describe("bakeTiles", () => {
  // Mapa de 3 × 3 tiles de 4 px, com desenho que atravessa as divisas.
  const T = 4;
  const W = 3 * T;
  function scribble(): Uint32Array {
    const src = new Uint32Array(W * W).fill(B);
    let seed = 7;
    for (let i = 0; i < src.length; i += 1) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      if ((seed >>> 16) % 3 === 0) src[i] = A;
    }
    return src;
  }

  it("o tile do meio sai igual a ampliar o mapa inteiro, com a borda vinda do vizinho", () => {
    const src = scribble();
    const whole = scale2x(scale2x(src, W, W), W * 2, W * 2);
    const baked = bakeTiles(src, W, W, T, 2);
    const id = baked.cells[1 * 3 + 1];
    const block = T * 4 + 4;
    const ox = (id % baked.cols) * block;
    const oy = Math.floor(id / baked.cols) * block;
    const got: number[] = [];
    const want: number[] = [];
    for (let y = 0; y < block; y += 1) {
      for (let x = 0; x < block; x += 1) {
        got.push(baked.data[(oy + y) * baked.width + ox + x]);
        want.push(whole[(T * 4 - 2 + y) * W * 4 + T * 4 - 2 + x]);
      }
    }
    expect(got).toEqual(want);
  });

  it("junta vizinhanças iguais e deixa de fora o tile vazio e o pulado", () => {
    const flat = new Uint32Array(W * W).fill(B);
    const one = bakeTiles(flat, W, W, T, 2);
    expect(one.count).toBe(1);
    expect(Array.from(one.cells)).toEqual(Array(9).fill(0));

    const hole = flat.slice();
    for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) hole[y * W + x] = 0;
    const some = bakeTiles(hole, W, W, T, 2, (cx, cy) => cx === 2 && cy === 2);
    expect(some.cells[0]).toBe(-1);
    expect(some.cells[8]).toBe(-1);
    expect(some.cells[4]).toBeGreaterThanOrEqual(0);
    expect(() => bakeTiles(flat, W, W, T, 3)).toThrow();
  });
});
