/**
 * Ampliação de pixel art sem a escadinha: Scale2x (EPX) duas vezes, 4× no total. Cada pixel vira
 * 2 × 2 e, onde duas bordas da mesma cor se encontram na diagonal, o canto é preenchido. A
 * diagonal sai lisa e o desenho continua o mesmo, sem borrar como a ampliação comum.
 * As folhas são ampliadas célula por célula (tile ou quadro), para um tile nunca puxar cor do
 * vizinho na folha; o mapa montado é ampliado com `bakeTiles`, que olha o vizinho de verdade.
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

/**
 * Quantos pixels do vizinho (no tamanho original) o Scale2x feito duas vezes enxerga. O resultado
 * ampliado de um tile só depende do próprio tile e desta faixa em volta.
 */
const APRON = 2;

export type Baked = Scaled & {
  /** Blocos por linha na folha. */
  cols: number;
  /** Quantos blocos diferentes o mapa tem. */
  count: number;
  /** Bloco de cada tile do mapa, linha por linha; -1 = tile vazio ou deixado de fora. */
  cells: Int32Array;
};

function sameRegion(a: Uint32Array, b: Uint32Array): boolean {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Amplia um mapa já montado (todas as camadas juntas, no tamanho original), tile por tile, mas
 * olhando os vizinhos. Na ampliação por célula o desenho que passa de um tile para o outro (a
 * sombra no capim, a franja da borda do caminho) é cortado reto na divisa e vira triângulo e
 * serrilha. Aqui cada tile é ampliado com a faixa do vizinho em volta e sai igual a ampliar o
 * mapa inteiro de uma vez. A borda `pad` de cada bloco também vem do vizinho de verdade, então o
 * filtro linear emenda um tile no outro sem linha.
 *
 * Tiles com a mesma vizinhança viram um bloco só: a folha cresce com a variedade do mapa, não
 * com o tamanho dele. `skip` deixa tiles de fora (os animados continuam pelo caminho antigo).
 */
export function bakeTiles(
  src: Uint32Array,
  width: number,
  height: number,
  tile: number,
  pad: number,
  skip?: (cx: number, cy: number) => boolean,
): Baked {
  if (pad > APRON) throw new Error(`bakeTiles: pad ${pad} maior que a faixa vista (${APRON})`);
  const mapW = Math.floor(width / tile);
  const mapH = Math.floor(height / tile);
  const side = tile + APRON * 2;
  const cells = new Int32Array(mapW * mapH).fill(-1);
  const byHash = new Map<string, number[]>();
  const regions: Uint32Array[] = [];
  const region = new Uint32Array(side * side);

  for (let cy = 0; cy < mapH; cy += 1) {
    for (let cx = 0; cx < mapW; cx += 1) {
      if (skip?.(cx, cy)) continue;
      let solid = false;
      for (let y = 0; y < tile && !solid; y += 1) {
        const row = (cy * tile + y) * width + cx * tile;
        for (let x = 0; x < tile; x += 1) {
          if (src[row + x] >>> 24 >= 24) {
            solid = true;
            break;
          }
        }
      }
      if (!solid) continue;
      // Recorte do tile com a faixa do vizinho; fora do mapa repete a borda, como antes.
      let h1 = 0x811c9dc5;
      let h2 = 0x2545f491;
      for (let y = 0; y < side; y += 1) {
        const sy = Math.min(height - 1, Math.max(0, cy * tile + y - APRON));
        for (let x = 0; x < side; x += 1) {
          const sx = Math.min(width - 1, Math.max(0, cx * tile + x - APRON));
          const v = src[sy * width + sx];
          region[y * side + x] = v;
          h1 = Math.imul(h1 ^ v, 0x01000193);
          h2 = Math.imul(h2 ^ v, 0x5bd1e995) ^ (h2 >>> 15);
        }
      }
      const hash = `${h1 >>> 0}:${h2 >>> 0}`;
      const same = byHash.get(hash);
      let id = same?.find((k) => sameRegion(regions[k], region));
      if (id === undefined) {
        id = regions.length;
        regions.push(region.slice());
        if (same) same.push(id);
        else byHash.set(hash, [id]);
      }
      cells[cy * mapW + cx] = id;
    }
  }

  const count = regions.length;
  const block = tile * SCALE + pad * 2;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const outW = cols * block;
  const outH = rows * block;
  const out = new Uint32Array(outW * outH);
  const bigSide = side * SCALE;
  const from = APRON * SCALE - pad;
  regions.forEach((cut, id) => {
    const big = scale2x(scale2x(cut, side, side), side * 2, side * 2);
    const ox = (id % cols) * block;
    const oy = Math.floor(id / cols) * block;
    for (let y = 0; y < block; y += 1) {
      const start = (from + y) * bigSide + from;
      out.set(big.subarray(start, start + block), (oy + y) * outW + ox);
    }
  });
  return { data: out, width: outW, height: outH, cols, count, cells };
}
