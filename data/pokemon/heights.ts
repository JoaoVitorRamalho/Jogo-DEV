/** Altura real (m, PokeAPI): o tamanho no mapa acompanha o Pokémon, pequeno fica pequeno e grande fica grande. */
const HEIGHT_M: Record<string, number> = {
  poochyena: 0.5, mightyena: 1.0, weedle: 0.3, kakuna: 0.6, beedrill: 1.0,
  pachirisu: 0.4, bidoof: 0.5, bibarel: 1.0,
  pidgey: 0.3, pidgeotto: 1.1, pidgeot: 1.5,
  caterpie: 0.3, metapod: 0.7, butterfree: 1.1,
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
 * Escala real não funciona (um Pokémon de 2 m cobriria o herói e um de 30 cm sumiria), então a
 * altura real só ordena os tamanhos, puxada para perto do herói como nos jogos com seguidor:
 * - pequeno, até 0,5 m: dois terços do herói (16 px);
 * - médio, perto de 1 m: quase do tamanho dele (22 px);
 * - grande, de 1,5 m para cima: passa um pouco da cabeça dele (27 a 30 px);
 * - lendário de 3 m ou mais: bem maior que o herói (38 px).
 * A largura também tem teto, para o bicho largo não virar um borrão do tamanho de dois tiles.
 */
export function petSize(speciesId: string): { height: number; width: number } {
  const m = heightMeters(speciesId);
  if (m >= 3) return { height: 38, width: 44 };
  const height = Math.round(Math.min(30, Math.max(16, HERO_PX * Math.sqrt(m / 1.2))));
  return { height, width: 32 };
}
