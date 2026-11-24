import { describe, expect, it } from "vitest";
import { scale2x, upscaleCells } from "@/game/core/pixelScale";

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
