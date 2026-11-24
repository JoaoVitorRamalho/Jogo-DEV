import { MEGA_DEFS } from "@/data/pokemon/mega";
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
  evolution?: { level: number; into: string; alternatives?: string[] };
  sprite: string;
  category: string;
  description: string;
};

const s = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): Stats => ({ hp, atk, def, spa, spd, spe });

const list: SpeciesDef[] = [
  {
    id: "poochyena", dex: 261, name: "Poochyena", types: ["dark"], base: s(35, 55, 35, 30, 30, 35), catchRate: 255, baseExp: 56, growth: "medium_fast",
    learnset: [[1, "tackle"], [4, "howl"], [7, "sand_attack"], [10, "bite"], [25, "scary_face"], [34, "crunch"], [40, "take_down"]],
    evolution: { level: 18, into: "mightyena" }, sprite: "poochyena", category: "Mordida",
    description: "Persegue o que se move e afasta ameaças mostrando suas presas.",
  },
  {
    id: "mightyena", dex: 262, name: "Mightyena", types: ["dark"], base: s(70, 90, 70, 60, 60, 70), catchRate: 127, baseExp: 147, growth: "medium_fast",
    learnset: [[0, "snarl"], [1, "tackle"], [1, "crunch"], [4, "howl"], [7, "sand_attack"], [10, "bite"], [28, "scary_face"], [40, "crunch"], [48, "take_down"]],
    sprite: "mightyena", category: "Mordida",
    description: "Caça em grupos e segue com lealdade o treinador em quem confia.",
  },
  {
    id: "weedle", dex: 13, name: "Weedle", types: ["bug", "poison"], base: s(40, 35, 30, 20, 20, 50), catchRate: 255, baseExp: 39, growth: "medium_fast",
    learnset: [[1, "poison_sting"], [1, "string_shot"], [9, "bug_bite"]],
    evolution: { level: 7, into: "kakuna" }, sprite: "weedle", category: "Lagarta Peluda",
    description: "Usa o ferrão venenoso na cabeça para se proteger enquanto procura folhas.",
  },
  {
    id: "kakuna", dex: 14, name: "Kakuna", types: ["bug", "poison"], base: s(45, 25, 50, 25, 25, 35), catchRate: 120, baseExp: 72, growth: "medium_fast",
    learnset: [[0, "harden"], [1, "poison_sting"], [1, "string_shot"], [1, "harden"]],
    evolution: { level: 10, into: "beedrill" }, sprite: "kakuna", category: "Casulo",
    description: "Espera sua transformação protegido por uma carapaça resistente.",
  },
  {
    id: "beedrill", dex: 15, name: "Beedrill", types: ["bug", "poison"], base: s(65, 90, 40, 45, 80, 75), catchRate: 45, baseExp: 178, growth: "medium_fast",
    learnset: [[0, "twineedle"], [1, "twineedle"], [35, "poison_jab"], [38, "agility"]],
    sprite: "beedrill", category: "Abelha Venenosa",
    description: "Defende seu território com os ferrões dos braços e da cauda.",
  },
  {
    id: "pikachu", dex: 25, name: "Pikachu", types: ["electric"], base: s(35, 55, 40, 50, 50, 90), catchRate: 190, baseExp: 112, growth: "medium_fast",
    learnset: [[1, "thunder_shock"], [5, "growl"], [10, "quick_attack"], [13, "thunder_wave"], [23, "nuzzle"], [29, "thunderbolt"], [37, "agility"], [42, "discharge"]],
    sprite: "pikachu", category: "Rato Elétrico",
    description: "Armazena eletricidade nas bochechas e a libera quando precisa se defender.",
  },
  {
    id: "pachirisu", dex: 417, name: "Pachirisu", types: ["electric"], base: s(60, 45, 70, 45, 90, 95), catchRate: 200, baseExp: 142, growth: "medium_fast",
    learnset: [[1, "growl"], [1, "quick_attack"], [5, "quick_attack"], [9, "charm"], [13, "spark"], [19, "nuzzle"], [21, "swift"], [29, "sweet_kiss"], [33, "thunder_wave"], [41, "discharge"], [49, "hyper_fang"]],
    sprite: "pachirisu", category: "Esquilo Elétrico",
    description: "Armazena eletricidade nas bochechas e na cauda felpuda.",
  },
  {
    id: "bidoof", dex: 399, name: "Bidoof", types: ["normal"], base: s(59, 45, 40, 35, 40, 31), catchRate: 255, baseExp: 50, growth: "medium_fast",
    learnset: [[1, "tackle"], [1, "growl"], [5, "defense_curl"], [13, "headbutt"], [17, "hyper_fang"], [25, "crunch"], [29, "take_down"]],
    evolution: { level: 15, into: "bibarel" }, sprite: "bidoof", category: "Rato Dentudo",
    description: "Roe troncos e pedras para manter os dentes afiados.",
  },
  {
    id: "bibarel", dex: 400, name: "Bibarel", types: ["normal", "water"], base: s(79, 85, 60, 55, 60, 71), catchRate: 127, baseExp: 144, growth: "medium_fast",
    learnset: [[0, "water_gun"], [1, "tackle"], [1, "growl"], [5, "defense_curl"], [13, "headbutt"], [18, "hyper_fang"], [28, "crunch"], [33, "take_down"], [45, "surf"]],
    sprite: "bibarel", category: "Castor",
    description: "Constrói barragens firmes com os troncos que recolhe.",
  },
  {
    id: "pidgey", dex: 16, name: "Pidgey", types: ["normal", "flying"], base: s(40, 45, 40, 35, 35, 56), catchRate: 255, baseExp: 50, growth: "medium_slow",
    learnset: [[1, "tackle"], [5, "sand_attack"], [9, "gust"], [13, "quick_attack"], [29, "agility"], [33, "wing_attack"], [49, "air_slash"]],
    evolution: { level: 18, into: "pidgeotto" }, sprite: "pidgey", category: "Passarinho",
    description: "Procura sementes entre a grama e levanta poeira ao fugir.",
  },
  {
    id: "pidgeotto", dex: 17, name: "Pidgeotto", types: ["normal", "flying"], base: s(63, 60, 55, 50, 50, 71), catchRate: 120, baseExp: 122, growth: "medium_slow",
    learnset: [[1, "tackle"], [5, "sand_attack"], [9, "gust"], [13, "quick_attack"], [32, "agility"], [37, "wing_attack"], [57, "air_slash"]],
    evolution: { level: 36, into: "pidgeot" }, sprite: "pidgeotto", category: "Ave",
    description: "Patrulha seu território de cima das árvores.",
  },
  {
    id: "pidgeot", dex: 18, name: "Pidgeot", types: ["normal", "flying"], base: s(83, 80, 75, 70, 70, 101), catchRate: 45, baseExp: 216, growth: "medium_slow",
    learnset: [[1, "tackle"], [5, "sand_attack"], [9, "gust"], [13, "quick_attack"], [32, "agility"], [38, "wing_attack"], [62, "air_slash"]],
    sprite: "pidgeot", category: "Ave",
    description: "Suas asas fortes sustentam voos rápidos sobre toda a ilha.",
  },
  {
    id: "caterpie", dex: 10, name: "Caterpie", types: ["bug"], base: s(45, 30, 35, 20, 20, 45), catchRate: 255, baseExp: 39, growth: "medium_fast",
    learnset: [[1, "tackle"], [1, "string_shot"], [9, "bug_bite"]],
    evolution: { level: 7, into: "metapod" }, sprite: "caterpie", category: "Lagarta",
    description: "As ventosas dos pés o ajudam a subir pelos galhos.",
  },
  {
    id: "metapod", dex: 11, name: "Metapod", types: ["bug"], base: s(50, 20, 55, 25, 25, 30), catchRate: 120, baseExp: 72, growth: "medium_fast",
    learnset: [[0, "harden"], [1, "tackle"], [1, "string_shot"], [1, "harden"], [9, "bug_bite"]],
    evolution: { level: 10, into: "butterfree" }, sprite: "metapod", category: "Casulo",
    description: "Protege-se dentro da carapaça enquanto se transforma.",
  },
  {
    id: "butterfree", dex: 12, name: "Butterfree", types: ["bug", "flying"], base: s(60, 45, 50, 90, 80, 70), catchRate: 45, baseExp: 178, growth: "medium_fast",
    learnset: [[0, "gust"], [1, "confusion"], [1, "gust"], [11, "confusion"], [13, "poison_powder"], [13, "sleep_powder"], [17, "psybeam"], [23, "supersonic"], [31, "bug_buzz"], [43, "air_slash"]],
    sprite: "butterfree", category: "Borboleta",
    description: "Carrega pólen e espalha um pó fino com suas asas.",
  },
  {
    id: "cascoon", dex: 268, name: "Cascoon", types: ["bug"], base: s(50, 35, 55, 25, 25, 15), catchRate: 120, baseExp: 72, growth: "medium_fast",
    learnset: [[0, "harden"], [1, "tackle"], [1, "string_shot"], [1, "harden"], [5, "poison_sting"], [6, "bug_bite"]],
    evolution: { level: 10, into: "dustox" }, sprite: "cascoon", category: "Casulo",
    description: "Observa o mundo por dentro de um casulo de seda resistente.",
  },
  {
    id: "dustox", dex: 269, name: "Dustox", types: ["bug", "poison"], base: s(60, 50, 70, 50, 90, 65), catchRate: 45, baseExp: 173, growth: "medium_fast",
    learnset: [[0, "gust"], [1, "gust"], [12, "confusion"], [15, "poison_powder"], [22, "psybeam"], [35, "bug_buzz"]],
    sprite: "dustox", category: "Mariposa",
    description: "Sai ao entardecer e espalha pó venenoso pelas asas.",
  },
  {
    id: "bulbasaur", dex: 1, name: "Bulbasaur", types: ["grass", "poison"], base: s(45, 49, 49, 65, 65, 45), catchRate: 45, baseExp: 64, growth: "medium_slow",
    learnset: [[1, "tackle"], [1, "growl"], [3, "vine_whip"], [7, "poison_powder"], [9, "sleep_powder"], [13, "razor_leaf"], [15, "take_down"]],
    evolution: { level: 16, into: "ivysaur" }, sprite: "bulbasaur", category: "Semente",
    description: "O bulbo nas costas guarda nutrientes. Cresce junto com o vínculo que cria.",
  },
  {
    id: "ivysaur", dex: 2, name: "Ivysaur", types: ["grass", "poison"], base: s(60, 62, 63, 80, 80, 60), catchRate: 45, baseExp: 142, growth: "medium_slow",
    learnset: [[1, "tackle"], [1, "growl"], [3, "vine_whip"], [7, "poison_powder"], [9, "sleep_powder"], [13, "razor_leaf"], [15, "take_down"], [20, "seed_bomb"], [28, "giga_drain"]],
    evolution: { level: 32, into: "venusaur" }, sprite: "ivysaur", category: "Semente",
    description: "O botão nas costas pesa. Precisa de pernas fortes para sustentá-lo.",
  },
  {
    id: "venusaur", dex: 3, name: "Venusaur", types: ["grass", "poison"], base: s(80, 82, 83, 100, 100, 80), catchRate: 45, baseExp: 236, growth: "medium_slow",
    learnset: [[0, "earthquake"], [1, "tackle"], [1, "growl"], [3, "vine_whip"], [7, "poison_powder"], [9, "sleep_powder"], [13, "razor_leaf"], [15, "take_down"], [20, "seed_bomb"], [28, "giga_drain"]], sprite: "venusaur", category: "Semente",
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
    evolution: { level: 36, into: "blaziken" }, sprite: "combusken", category: "Jovem Ave",
    description: "Treina as pernas em corridas pelas colinas. Chuta dez vezes por segundo.",
  },
  {
    id: "blaziken", dex: 257, name: "Blaziken", types: ["fire", "fighting"], base: s(80, 120, 70, 110, 70, 80), catchRate: 45, baseExp: 239, growth: "medium_slow",
    learnset: [[0, "sky_uppercut"], [1, "double_kick"], [1, "scratch"], [5, "ember"], [9, "sand_attack"], [13, "peck"], [17, "quick_attack"], [20, "flame_wheel"], [27, "slash"], [32, "blaze_kick"], [42, "flamethrower"], [50, "close_combat"]], sprite: "blaziken", category: "Chama",
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
    evolution: { level: 36, into: "greninja" }, sprite: "frogadier", category: "Sapo Bolha",
    description: "Ágil como poucos. Escala torres em segundos.",
  },
  {
    id: "greninja", dex: 658, name: "Greninja", types: ["water", "dark"], base: s(72, 95, 67, 103, 71, 122), catchRate: 45, baseExp: 239, growth: "medium_slow",
    learnset: [[0, "night_slash"], [1, "pound"], [5, "bubble"], [8, "quick_attack"], [13, "water_gun"], [18, "water_pulse"], [22, "bite"], [28, "aerial_ace"], [33, "surf"], [44, "dark_pulse"]], sprite: "greninja", category: "Ninja",
    description: "Some e reaparece como uma sombra na água.",
  },
  {
    id: "wurmple", dex: 265, name: "Wurmple", types: ["bug"], base: s(45, 45, 35, 20, 30, 20), catchRate: 255, baseExp: 56, growth: "medium_fast",
    learnset: [[1, "tackle"], [1, "string_shot"], [5, "poison_sting"], [6, "bug_bite"]],
    evolution: { level: 7, into: "silcoon", alternatives: ["cascoon"] }, sprite: "wurmple", category: "Lagarta",
    description: "Usa os espinhos da cauda para afastar aves famintas.",
  },
  {
    id: "silcoon", dex: 266, name: "Silcoon", types: ["bug"], base: s(50, 35, 55, 25, 25, 15), catchRate: 120, baseExp: 72, growth: "medium_fast",
    learnset: [[0, "harden"], [1, "tackle"], [1, "string_shot"], [5, "poison_sting"], [6, "bug_bite"]],
    evolution: { level: 10, into: "beautifly" }, sprite: "silcoon", category: "Casulo",
    description: "Envolve-se em seda e espera, imóvel, o momento de mudar.",
  },
  {
    id: "beautifly", dex: 267, name: "Beautifly", types: ["bug", "flying"], base: s(60, 70, 50, 100, 50, 65), catchRate: 45, baseExp: 178, growth: "medium_fast",
    learnset: [[0, "gust"], [1, "tackle"], [1, "string_shot"], [6, "bug_bite"], [13, "aerial_ace"], [17, "psybeam"], [22, "giga_drain"], [27, "bug_buzz"]],
    sprite: "beautifly", category: "Borboleta",
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
    evolution: { level: 34, into: "staraptor" }, sprite: "staravia", category: "Estorninho",
    description: "Defende o território com bicadas ferozes.",
  },
  {
    id: "staraptor", dex: 398, name: "Staraptor", types: ["normal", "flying"], base: s(85, 120, 70, 50, 60, 100), catchRate: 45, baseExp: 218, growth: "medium_slow",
    learnset: [[0, "close_combat"], [1, "tackle"], [5, "quick_attack"], [9, "wing_attack"], [18, "aerial_ace"], [25, "take_down"]], sprite: "staraptor", category: "Predador",
    description: "Enfrenta adversários muito maiores sem recuar.",
  },
  {
    id: "gible", dex: 443, name: "Gible", types: ["dragon", "ground"], base: s(58, 70, 45, 40, 45, 42), catchRate: 45, baseExp: 60, growth: "slow",
    learnset: [[1, "tackle"], [1, "sand_attack"], [7, "dragon_rage"], [13, "bite"], [13, "sandstorm"], [19, "slash"]],
    evolution: { level: 24, into: "gabite" }, sprite: "gible", category: "Tubarão Terrestre",
    description: "Pequeno e teimoso. Morde tudo o que se move, até o próprio treinador.",
  },
  {
    id: "gabite", dex: 444, name: "Gabite", types: ["dragon", "ground"], base: s(68, 90, 65, 50, 55, 82), catchRate: 45, baseExp: 144, growth: "slow",
    learnset: [[1, "tackle"], [1, "sand_attack"], [7, "dragon_rage"], [13, "bite"], [13, "sandstorm"], [19, "slash"], [28, "dragon_claw"], [37, "take_down"]], evolution: { level: 48, into: "garchomp" }, sprite: "gabite", category: "Caverna",
    description: "Guarda objetos brilhantes no fundo das cavernas.",
  },
  {
    id: "garchomp", dex: 445, name: "Garchomp", types: ["dragon", "ground"], base: s(108, 130, 95, 80, 85, 102), catchRate: 45, baseExp: 270, growth: "slow",
    learnset: [[0, "crunch"], [1, "tackle"], [7, "dragon_rage"], [13, "bite"], [13, "sandstorm"], [19, "slash"], [28, "dragon_claw"], [37, "take_down"], [52, "earthquake"]], sprite: "garchomp", category: "Mach",
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
  {
    id: "charizard", dex: 6, name: "Charizard", types: ["fire", "flying"], base: s(78, 84, 78, 109, 85, 100), catchRate: 45, baseExp: 240, growth: "medium_slow",
    learnset: [[1, "scratch"], [1, "growl"], [7, "ember"], [13, "flamethrower"], [21, "wing_attack"], [36, "heat_wave"]], sprite: "charizard", category: "Chama",
    description: "Voa alto em busca de presas fortes. A cauda arde mais quente quanto mais batalhas vence.",
  },
];

const megaSpecies: SpeciesDef[] = MEGA_DEFS.map((m) => ({
  id: m.id,
  dex: m.dex,
  name: m.name,
  types: m.types,
  base: m.baseStats,
  catchRate: 3,
  baseExp: 300,
  growth: "slow",
  learnset: m.learnset,
  sprite: m.sprite,
  category: m.category,
  description: m.description,
}));

const all = [...list, ...megaSpecies];

export const SPECIES: Record<string, SpeciesDef> = Object.fromEntries(all.map((entry) => [entry.id, entry]));
export const DEX_ORDER: string[] = [...all].sort((a, b) => a.dex - b.dex).map((entry) => entry.id);

export function species(id: string): SpeciesDef {
  const found = SPECIES[id];
  if (!found) throw new Error(`Espécie desconhecida: ${id}`);
  return found;
}
