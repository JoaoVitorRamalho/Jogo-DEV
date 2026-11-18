import type { TypeId } from "@/data/pokemon/types";

export type Stats = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
export type Growth = "fast" | "medium_fast" | "medium_slow" | "slow";

export type SpeciesDef = {
  id: string;
  dex: number;
  name: string;
  types: TypeId[];
  base: Stats;
  catchRate: number;
  baseExp: number;
  growth: Growth;
  learnset: [number, string][];
  evolution?: { level: number; into: string };
  sprite: string;
  category: string;
  description: string;
};

const s = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): Stats => ({ hp, atk, def, spa, spd, spe });

const list: SpeciesDef[] = [
  {
    id: "bulbasaur", dex: 1, name: "Bulbasaur", types: ["grass", "poison"], base: s(45, 49, 49, 65, 65, 45), catchRate: 45, baseExp: 64, growth: "medium_slow",
    learnset: [[1, "tackle"], [1, "growl"], [3, "vine_whip"], [7, "poison_powder"], [9, "sleep_powder"], [13, "razor_leaf"], [15, "take_down"]],
    evolution: { level: 16, into: "ivysaur" }, sprite: "bulbasaur", category: "Semente",
    description: "O bulbo nas costas guarda nutrientes. Cresce junto com o vínculo que cria.",
  },
  {
    id: "ivysaur", dex: 2, name: "Ivysaur", types: ["grass", "poison"], base: s(60, 62, 63, 80, 80, 60), catchRate: 45, baseExp: 142, growth: "medium_slow",
    learnset: [[1, "tackle"], [1, "growl"], [3, "vine_whip"], [7, "poison_powder"], [9, "sleep_powder"], [13, "razor_leaf"], [15, "take_down"], [20, "seed_bomb"], [28, "giga_drain"]],
    evolution: { level: 32, into: "venusaur" }, sprite: "bulbasaur", category: "Semente",
    description: "O botão nas costas pesa. Precisa de pernas fortes para sustentá-lo.",
  },
  {
    id: "venusaur", dex: 3, name: "Venusaur", types: ["grass", "poison"], base: s(80, 82, 83, 100, 100, 80), catchRate: 45, baseExp: 236, growth: "medium_slow",
    learnset: [[0, "earthquake"], [1, "tackle"], [1, "growl"], [3, "vine_whip"], [7, "poison_powder"], [9, "sleep_powder"], [13, "razor_leaf"], [15, "take_down"], [20, "seed_bomb"], [28, "giga_drain"]], sprite: "bulbasaur", category: "Semente",
    description: "A flor se abre ao sol e acalma quem está por perto.",
  },
  {
    id: "torchic", dex: 255, name: "Torchic", types: ["fire"], base: s(45, 60, 40, 70, 50, 45), catchRate: 45, baseExp: 62, growth: "medium_slow",
    learnset: [[1, "scratch"], [1, "growl"], [5, "ember"], [9, "sand_attack"], [13, "peck"]],
    evolution: { level: 16, into: "combusken" }, sprite: "torchic", category: "Pintinho",
    description: "Guarda uma chama na barriga. Abraçá-lo é como segurar uma brasa morna.",
  },
  {
    id: "combusken", dex: 256, name: "Combusken", types: ["fire", "fighting"], base: s(60, 85, 60, 85, 60, 55), catchRate: 45, baseExp: 142, growth: "medium_slow",
    learnset: [[0, "double_kick"], [1, "scratch"], [1, "growl"], [5, "ember"], [9, "sand_attack"], [13, "peck"], [17, "quick_attack"], [20, "flame_wheel"], [27, "slash"], [32, "blaze_kick"]],
    evolution: { level: 36, into: "blaziken" }, sprite: "torchic", category: "Jovem Ave",
    description: "Treina as pernas em corridas pelas colinas. Chuta dez vezes por segundo.",
  },
  {
    id: "blaziken", dex: 257, name: "Blaziken", types: ["fire", "fighting"], base: s(80, 120, 70, 110, 70, 80), catchRate: 45, baseExp: 239, growth: "medium_slow",
    learnset: [[0, "sky_uppercut"], [1, "double_kick"], [1, "scratch"], [5, "ember"], [9, "sand_attack"], [13, "peck"], [17, "quick_attack"], [20, "flame_wheel"], [27, "slash"], [32, "blaze_kick"], [42, "flamethrower"], [50, "close_combat"]], sprite: "torchic", category: "Chama",
    description: "Chamas saem dos pulsos quando enfrenta um rival à altura.",
  },
  {
    id: "froakie", dex: 656, name: "Froakie", types: ["water"], base: s(41, 56, 40, 62, 44, 71), catchRate: 45, baseExp: 63, growth: "medium_slow",
    learnset: [[1, "pound"], [1, "growl"], [5, "bubble"], [8, "quick_attack"], [13, "water_gun"]],
    evolution: { level: 16, into: "frogadier" }, sprite: "froakie", category: "Sapo Bolha",
    description: "As bolhas do pescoço amortecem golpes. Finge despreocupação, mas observa tudo.",
  },
  {
    id: "frogadier", dex: 657, name: "Frogadier", types: ["water"], base: s(54, 63, 52, 83, 56, 97), catchRate: 45, baseExp: 142, growth: "medium_slow",
    learnset: [[1, "pound"], [1, "growl"], [5, "bubble"], [8, "quick_attack"], [13, "water_gun"], [18, "water_pulse"], [22, "bite"], [28, "aerial_ace"], [33, "surf"]],
    evolution: { level: 36, into: "greninja" }, sprite: "froakie", category: "Sapo Bolha",
    description: "Ágil como poucos. Escala torres em segundos.",
  },
  {
    id: "greninja", dex: 658, name: "Greninja", types: ["water", "dark"], base: s(72, 95, 67, 103, 71, 122), catchRate: 45, baseExp: 239, growth: "medium_slow",
    learnset: [[0, "night_slash"], [1, "pound"], [5, "bubble"], [8, "quick_attack"], [13, "water_gun"], [18, "water_pulse"], [22, "bite"], [28, "aerial_ace"], [33, "surf"], [44, "dark_pulse"]], sprite: "froakie", category: "Ninja",
    description: "Some e reaparece como uma sombra na água.",
  },
  {
    id: "wurmple", dex: 265, name: "Wurmple", types: ["bug"], base: s(45, 45, 35, 20, 30, 20), catchRate: 255, baseExp: 56, growth: "medium_fast",
    learnset: [[1, "tackle"], [1, "string_shot"], [5, "poison_sting"], [6, "bug_bite"]],
    evolution: { level: 7, into: "silcoon" }, sprite: "wurmple", category: "Lagarta",
    description: "Usa os espinhos da cauda para afastar aves famintas.",
  },
  {
    id: "silcoon", dex: 266, name: "Silcoon", types: ["bug"], base: s(50, 35, 55, 25, 25, 15), catchRate: 120, baseExp: 72, growth: "medium_fast",
    learnset: [[0, "harden"], [1, "tackle"], [1, "string_shot"], [5, "poison_sting"], [6, "bug_bite"]],
    evolution: { level: 10, into: "beautifly" }, sprite: "wurmple", category: "Casulo",
    description: "Envolve-se em seda e espera, imóvel, o momento de mudar.",
  },
  {
    id: "beautifly", dex: 267, name: "Beautifly", types: ["bug", "flying"], base: s(60, 70, 50, 100, 50, 65), catchRate: 45, baseExp: 178, growth: "medium_fast",
    learnset: [[0, "gust"], [1, "tackle"], [1, "string_shot"], [6, "bug_bite"], [13, "aerial_ace"], [17, "psybeam"], [22, "giga_drain"], [27, "bug_buzz"]],
    sprite: "wurmple", category: "Borboleta",
    description: "Asas coloridas que espalham pó brilhante. Ataca com rajadas de vento.",
  },
  {
    id: "starly", dex: 396, name: "Starly", types: ["normal", "flying"], base: s(40, 55, 30, 30, 30, 60), catchRate: 255, baseExp: 49, growth: "medium_slow",
    learnset: [[1, "tackle"], [1, "growl"], [5, "quick_attack"], [9, "wing_attack"]],
    evolution: { level: 14, into: "staravia" }, sprite: "starly", category: "Estorninho",
    description: "Voa em bandos barulhentos sobre as rotas de Asteria.",
  },
  {
    id: "staravia", dex: 397, name: "Staravia", types: ["normal", "flying"], base: s(55, 75, 50, 40, 40, 80), catchRate: 120, baseExp: 119, growth: "medium_slow",
    learnset: [[1, "tackle"], [1, "growl"], [5, "quick_attack"], [9, "wing_attack"], [18, "aerial_ace"], [25, "take_down"]],
    evolution: { level: 34, into: "staraptor" }, sprite: "starly", category: "Estorninho",
    description: "Defende o território com bicadas ferozes.",
  },
  {
    id: "staraptor", dex: 398, name: "Staraptor", types: ["normal", "flying"], base: s(85, 120, 70, 50, 60, 100), catchRate: 45, baseExp: 218, growth: "medium_slow",
    learnset: [[0, "close_combat"], [1, "tackle"], [5, "quick_attack"], [9, "wing_attack"], [18, "aerial_ace"], [25, "take_down"]], sprite: "starly", category: "Predador",
    description: "Enfrenta adversários muito maiores sem recuar.",
  },
  {
    id: "gible", dex: 443, name: "Gible", types: ["dragon", "ground"], base: s(58, 70, 45, 40, 45, 42), catchRate: 45, baseExp: 60, growth: "slow",
    learnset: [[1, "tackle"], [1, "sand_attack"], [7, "dragon_rage"], [13, "bite"], [19, "slash"]],
    evolution: { level: 24, into: "gabite" }, sprite: "gible", category: "Tubarão Terrestre",
    description: "Pequeno e teimoso. Morde tudo o que se move, até o próprio treinador.",
  },
  {
    id: "gabite", dex: 444, name: "Gabite", types: ["dragon", "ground"], base: s(68, 90, 65, 50, 55, 82), catchRate: 45, baseExp: 144, growth: "slow",
    learnset: [[1, "tackle"], [1, "sand_attack"], [7, "dragon_rage"], [13, "bite"], [19, "slash"], [28, "dragon_claw"], [37, "take_down"]], evolution: { level: 48, into: "garchomp" }, sprite: "gible", category: "Caverna",
    description: "Guarda objetos brilhantes no fundo das cavernas.",
  },
  {
    id: "garchomp", dex: 445, name: "Garchomp", types: ["dragon", "ground"], base: s(108, 130, 95, 80, 85, 102), catchRate: 45, baseExp: 270, growth: "slow",
    learnset: [[0, "crunch"], [1, "tackle"], [7, "dragon_rage"], [13, "bite"], [19, "slash"], [28, "dragon_claw"], [37, "take_down"], [52, "earthquake"]], sprite: "gible", category: "Mach",
    description: "Voa na velocidade de um avião a jato.",
  },
  {
    id: "mew", dex: 151, name: "Mew", types: ["psychic"], base: s(100, 100, 100, 100, 100, 100), catchRate: 45, baseExp: 270, growth: "medium_slow",
    learnset: [[1, "pound"], [1, "confusion"], [20, "psybeam"]], sprite: "mew", category: "Nova Espécie",
    description: "Dizem que guarda o código genético de todos os Pokémon.",
  },
  {
    id: "giratina", dex: 487, name: "Giratina", types: ["ghost", "dragon"], base: s(150, 100, 120, 100, 120, 90), catchRate: 3, baseExp: 306, growth: "slow",
    learnset: [[1, "dragon_breath"], [1, "shadow_claw"]], sprite: "giratina", category: "Renegado",
    description: "Habita um mundo onde o tempo e o espaço se dobram.",
  },
];

export const SPECIES: Record<string, SpeciesDef> = Object.fromEntries(list.map((entry) => [entry.id, entry]));
export const DEX_ORDER: string[] = [...list].sort((a, b) => a.dex - b.dex).map((entry) => entry.id);

export function species(id: string): SpeciesDef {
  const found = SPECIES[id];
  if (!found) throw new Error(`Espécie desconhecida: ${id}`);
  return found;
}
