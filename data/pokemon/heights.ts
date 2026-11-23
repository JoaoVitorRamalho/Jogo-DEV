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

/** Altura em pixels do jogo (o herói tem uns 24 px ≈ 1,4 m); curva suave para o pequeno não sumir. */
export function petHeight(speciesId: string): number {
  const m = HEIGHT_M[speciesId] ?? 0.8;
  return Math.round(Math.min(40, 8 + 14 * Math.pow(m, 0.6)));
}

