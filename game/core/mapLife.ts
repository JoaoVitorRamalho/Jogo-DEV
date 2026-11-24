/**
 * Contas do mapa vivo que não dependem do Phaser: qual tile é água e como o capim alto balança
 * quando o jogador entra nele. Os efeitos em si ficam em `game/phaser/life.ts`.
 */

/** Pixel de água: azul forte, bem acima do vermelho e do verde. A areia e a margem não passam. */
function isWaterPixel(r: number, g: number, b: number, a: number): boolean {
  return a >= 128 && b > 150 && b > r + 60 && b > g + 20;
}

/** Fração mínima de pixels de água para o tile contar como água aberta. */
const WATER_SHARE = 0.9;

/**
 * Marca os tiles de uma folha (RGBA, linha por linha) que são água: 1 = água, 0 = o resto.
 * Tile de margem, com areia ou pedra, fica de fora, e o brilho nunca cai em terra.
 */
export function waterMarks(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, tile: number): Uint8Array {
  const cols = Math.floor(width / tile);
  const rows = Math.floor(height / tile);
  const marks = new Uint8Array(cols * rows);
  const need = tile * tile * WATER_SHARE;
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      let count = 0;
      for (let y = 0; y < tile; y += 1) {
        let i = ((ty * tile + y) * width + tx * tile) * 4;
        for (let x = 0; x < tile; x += 1, i += 4) if (isWaterPixel(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])) count += 1;
      }
      marks[ty * cols + tx] = count >= need ? 1 : 0;
    }
  }
  return marks;
}

/** Quanto dura o balanço do capim depois que o pé entra. */
export const SWAY_MS = 340;

/**
 * Escala do capim por cima das pernas, `ageMs` depois de entrar no tile: abre para os lados,
 * fecha, abre de novo mais fraco e assenta; na altura, abaixa um pouco e volta.
 */
export function grassSway(ageMs: number): { sx: number; sy: number } {
  if (!(ageMs > 0) || ageMs >= SWAY_MS) return { sx: 1, sy: 1 };
  const k = ageMs / SWAY_MS;
  const fade = 1 - k;
  return {
    sx: 1 + 0.16 * Math.sin(k * Math.PI * 3) * fade,
    sy: 1 - 0.14 * Math.sin(k * Math.PI) * fade,
  };
}
