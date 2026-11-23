/** Altura real (m, PokeAPI): o tamanho no mapa acompanha o Pokémon, pequeno fica pequeno e grande fica grande. */
const HEIGHT_M: Record<string, number> = {
  bulbasaur: 0.7, ivysaur: 1.0, venusaur: 2.0,
  torchic: 0.4, combusken: 0.9, blaziken: 1.9,
  froakie: 0.3, frogadier: 0.6, greninja: 1.5,
  wurmple: 0.3, silcoon: 0.6, cascoon: 0.7, beautifly: 1.0, dustox: 1.2,
  starly: 0.3, staravia: 0.6, staraptor: 1.2,
  gible: 0.7, gabite: 1.4, garchomp: 1.9,
  mew: 0.4, giratina: 4.5, charmander: 0.6, charmeleon: 1.1, charizard: 1.7, pikachu: 0.4,
};

/** Altura real em metros (sem dado, um Pokémon médio de 0,8 m). */
export function heightMeters(speciesId: string): number {
  return HEIGHT_M[speciesId] ?? 0.8;
}

const HERO_PX = 24;

/**
 * Tamanho do Pokémon que segue o herói, em pixels do jogo (o herói tem 24 de altura).
 *
 * Regra dos jogos com Pokémon seguidor: o herói e quase todo Pokémon cabem na mesma caixa
 * de 32 × 32, e só os gigantes ganham uma de 64 × 64. Escala real não funciona (um Pokémon
 * de 2 m cobriria o herói), então a altura real só ordena os tamanhos:
 * - pequeno, até 0,5 m: metade do herói (12 px);
 * - médio, perto de 1 m: três quartos (18 px);
 * - grande, de 1,5 m para cima: para um pouco abaixo dele (21 px);
 * - lendário de 3 m ou mais: passa um pouco do herói (26 px).
 * A largura também tem teto, para o bicho largo não virar um borrão maior que o herói.
 */
export function petSize(speciesId: string): { height: number; width: number } {
  const m = heightMeters(speciesId);
  if (m >= 3) return { height: 26, width: 30 };
  const height = Math.round(Math.min(21, Math.max(12, HERO_PX * Math.pow(m / 2, 0.45))));
  return { height, width: 24 };
}

