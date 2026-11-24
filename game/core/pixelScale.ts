/**
 * Ampliação de pixel art sem a escadinha: Scale2x (EPX) duas vezes, 4× no total. Cada pixel vira
 * 2 × 2 e, onde duas bordas da mesma cor se encontram na diagonal, o canto é preenchido. A
 * diagonal sai lisa e o desenho continua o mesmo, sem borrar como a ampliação comum.
 * Trabalha célula por célula (tile ou quadro), para um tile nunca puxar cor do vizinho na folha.
 */

export const SCALE = 4;

/** Mesma cor para o desenho: transparente com transparente, ou diferença que o olho não vê. */
function same(a: number, b: number): boolean {
  if (a === b) return true;
  const aa = a >>> 24;
  const ba = b >>> 24;
  if (aa < 24 && ba < 24) return true;
  if (Math.abs(aa - ba) > 24) return false;
  const dr = Math.abs((a & 255) - (b & 255));
  const dg = Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255));
  const db = Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255));
  return dr + dg + db <= 18;
}

/** Scale2x numa imagem w × h (pixels RGBA em Uint32). A borda repete o próprio pixel. */
export function scale2x(src: Uint32Array, w: number, h: number): Uint32Array {
  const ow = w * 2;
  const out = new Uint32Array(ow * h * 2);
  for (let y = 0; y < h; y += 1) {
    const up = (y > 0 ? y - 1 : 0) * w;
    const down = (y < h - 1 ? y + 1 : y) * w;
    const row = y * w;
    for (let x = 0; x < w; x += 1) {
      const left = x > 0 ? x - 1 : 0;
      const right = x < w - 1 ? x + 1 : x;
      const e = src[row + x];
      const b = src[up + x];
      const d = src[row + left];
      const f = src[row + right];
      const hh = src[down + x];
      let e0 = e;
      let e1 = e;
      let e2 = e;
      let e3 = e;
      if (!same(b, hh) && !same(d, f)) {
        if (same(d, b)) e0 = d;
        if (same(b, f)) e1 = f;
        if (same(d, hh)) e2 = d;
        if (same(hh, f)) e3 = f;
      }
      const o = y * 2 * ow + x * 2;
      out[o] = e0;
      out[o + 1] = e1;
      out[o + ow] = e2;
      out[o + ow + 1] = e3;
    }
  }
  return out;
}

export type Scaled = { data: Uint32Array; width: number; height: number };

/**
 * Amplia uma folha de células cellW × cellH. Cada célula ganha `pad` pixels de borda repetida
 * em volta: o filtro linear da placa de vídeo lê um pouco além do quadro e, sem essa folga,
 * apareceria uma linha fina da célula vizinha entre os tiles.
 */
export function upscaleCells(src: Uint32Array, width: number, height: number, cellW: number, cellH: number, pad: number): Scaled {
  const cols = Math.floor(width / cellW);
  const rows = Math.floor(height / cellH);
  const bw = cellW * SCALE;
  const bh = cellH * SCALE;
  const stepX = bw + pad * 2;
  const stepY = bh + pad * 2;
  const outW = cols * stepX;
  const outH = rows * stepY;
  const out = new Uint32Array(outW * outH);
  const cell = new Uint32Array(cellW * cellH);
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      for (let y = 0; y < cellH; y += 1) {
        const from = (cy * cellH + y) * width + cx * cellW;
        cell.set(src.subarray(from, from + cellW), y * cellW);
      }
      const big = scale2x(scale2x(cell, cellW, cellH), cellW * 2, cellH * 2);
      const ox = cx * stepX + pad;
      const oy = cy * stepY + pad;
      for (let y = -pad; y < bh + pad; y += 1) {
        const sy = y < 0 ? 0 : y >= bh ? bh - 1 : y;
        const line = (oy + y) * outW + ox;
        for (let x = -pad; x < bw + pad; x += 1) {
          const sx = x < 0 ? 0 : x >= bw ? bw - 1 : x;
          out[line + x] = big[sy * bw + sx];
        }
      }
    }
  }
  return { data: out, width: outW, height: outH };
}
