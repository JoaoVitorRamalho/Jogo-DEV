import type { TypeId } from "@/data/pokemon/types";
import canonicalData from "@/data/pokemon/move-data.json";
import descriptions from "@/data/pokemon/move-descriptions.pt.json";

export type StatId = "atk" | "def" | "spa" | "spd" | "spe";
export type StageStat = StatId | "accuracy" | "evasion";
export type StatusId = "burn" | "poison" | "paralysis" | "sleep" | "freeze";
export type MoveCategory = "physical" | "special" | "status";

export type MoveEffect =
  | { kind: "weather"; weather: "sun" | "rain" | "sand" }
  | { kind: "confuse"; chance: number }
  | { kind: "stage"; target: "self" | "foe"; stat: StageStat; stages: number; chance?: number }
  | { kind: "status"; status: StatusId; chance: number; perHit?: boolean }
  | { kind: "flinch"; chance: number }
  | { kind: "fixed"; damage: number };

export type MoveDef = {
  id: string;
  name: string;
  type: TypeId;
  category: MoveCategory;
  power: number;
  accuracy: number | null;
  pp: number;
  priority?: number;
  hits?: number;
  hitRange?: [number, number];
  drain?: number;
  highCrit?: boolean;
  powder?: boolean;
  effects?: MoveEffect[];
  description: string;
};

const list: MoveDef[] = [
  { id: "howl", name: "Uivo", type: "normal", category: "status", power: 0, accuracy: null, pp: 40, effects: [{ kind: "stage", target: "self", stat: "atk", stages: 1 }], description: "Um uivo que aumenta o Ataque do usuário." },
  { id: "scary_face", name: "Cara Assustadora", type: "normal", category: "status", power: 0, accuracy: 100, pp: 10, effects: [{ kind: "stage", target: "foe", stat: "spe", stages: -2 }], description: "Assusta o alvo e reduz muito sua Velocidade." },
  { id: "snarl", name: "Rosnado Sombrio", type: "dark", category: "special", power: 55, accuracy: 95, pp: 15, effects: [{ kind: "stage", target: "foe", stat: "spa", stages: -1 }], description: "Um grito que reduz o Ataque Especial do alvo." },
  { id: "twineedle", name: "Agulha Dupla", type: "bug", category: "physical", power: 25, accuracy: 100, pp: 20, hits: 2, effects: [{ kind: "status", status: "poison", chance: 0.2, perHit: true }], description: "Atinge duas vezes; cada acerto pode envenenar o alvo." },
  { id: "poison_jab", name: "Golpe Venenoso", type: "poison", category: "physical", power: 80, accuracy: 100, pp: 20, effects: [{ kind: "status", status: "poison", chance: 0.3 }], description: "Perfura o alvo com um golpe que pode envenenar." },
  { id: "thunder_shock", name: "Choque do Trovão", type: "electric", category: "special", power: 40, accuracy: 100, pp: 30, effects: [{ kind: "status", status: "paralysis", chance: 0.1 }], description: "Um choque elétrico que pode paralisar o alvo." },
  { id: "thunderbolt", name: "Raio do Trovão", type: "electric", category: "special", power: 90, accuracy: 100, pp: 15, effects: [{ kind: "status", status: "paralysis", chance: 0.1 }], description: "Uma descarga elétrica forte que pode paralisar o alvo." },
  { id: "sunny_day", name: "Dia Ensolarado", type: "fire", category: "status", power: 0, accuracy: null, pp: 5, effects: [{ kind: "weather", weather: "sun" }], description: "Invoca sol forte por cinco turnos." },
  { id: "rain_dance", name: "Dança da Chuva", type: "water", category: "status", power: 0, accuracy: null, pp: 5, effects: [{ kind: "weather", weather: "rain" }], description: "Invoca chuva por cinco turnos." },
  { id: "sandstorm", name: "Tempestade de Areia", type: "rock", category: "status", power: 0, accuracy: null, pp: 10, effects: [{ kind: "weather", weather: "sand" }], description: "Invoca uma tempestade de areia por cinco turnos." },
  { id: "sweet_kiss", name: "Beijo Doce", type: "fairy", category: "status", power: 0, accuracy: 75, pp: 10, effects: [{ kind: "confuse", chance: 1 }], description: "Deixa o alvo confuso." },
  { id: "supersonic", name: "Supersônico", type: "normal", category: "status", power: 0, accuracy: 55, pp: 20, effects: [{ kind: "confuse", chance: 1 }], description: "Ondas sonoras que confundem o alvo." },
  { id: "defense_curl", name: "Enrolar Defesa", type: "normal", category: "status", power: 0, accuracy: null, pp: 40, effects: [{ kind: "stage", target: "self", stat: "def", stages: 1 }], description: "Enrola o corpo para subir a Defesa." },
  { id: "headbutt", name: "Cabeçada", type: "normal", category: "physical", power: 70, accuracy: 100, pp: 15, effects: [{ kind: "flinch", chance: 0.3 }], description: "Uma cabeçada que pode fazer o alvo hesitar." },
  { id: "hyper_fang", name: "Hiperpresa", type: "normal", category: "physical", power: 80, accuracy: 90, pp: 15, effects: [{ kind: "flinch", chance: 0.1 }], description: "Morde com presas fortes." },
  { id: "charm", name: "Charme", type: "fairy", category: "status", power: 0, accuracy: 100, pp: 20, effects: [{ kind: "stage", target: "foe", stat: "atk", stages: -2 }], description: "Reduz muito o Ataque do alvo." },
  { id: "spark", name: "Faísca", type: "electric", category: "physical", power: 65, accuracy: 100, pp: 20, effects: [{ kind: "status", status: "paralysis", chance: 0.3 }], description: "Uma investida elétrica que pode paralisar." },
  { id: "nuzzle", name: "Afago Elétrico", type: "electric", category: "physical", power: 20, accuracy: 100, pp: 20, effects: [{ kind: "status", status: "paralysis", chance: 1 }], description: "Encosta as bochechas carregadas e paralisa." },
  { id: "swift", name: "Rapidez", type: "normal", category: "special", power: 60, accuracy: null, pp: 20, description: "Dispara estrelas que não erram." },
  { id: "thunder_wave", name: "Onda de Choque", type: "electric", category: "status", power: 0, accuracy: 90, pp: 20, effects: [{ kind: "status", status: "paralysis", chance: 1 }], description: "Uma corrente fraca que paralisa o alvo." },
  { id: "discharge", name: "Descarga", type: "electric", category: "special", power: 80, accuracy: 100, pp: 15, effects: [{ kind: "status", status: "paralysis", chance: 0.3 }], description: "Solta eletricidade pelo corpo inteiro." },
  { id: "agility", name: "Agilidade", type: "psychic", category: "status", power: 0, accuracy: null, pp: 30, effects: [{ kind: "stage", target: "self", stat: "spe", stages: 2 }], description: "Sobe muito a Velocidade." },
  { id: "air_slash", name: "Corte de Ar", type: "flying", category: "special", power: 75, accuracy: 95, pp: 15, effects: [{ kind: "flinch", chance: 0.3 }], description: "Uma lâmina de vento que pode fazer hesitar." },
  { id: "tackle", name: "Investida", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 35, description: "Avança com o corpo todo." },
  { id: "scratch", name: "Arranhão", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 35, description: "Garras afiadas raspam o alvo." },
  { id: "pound", name: "Pancada", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 35, description: "Um golpe com a pata ou a cauda." },
  { id: "quick_attack", name: "Ataque Rápido", type: "normal", category: "physical", power: 40, accuracy: 100, pp: 30, priority: 1, description: "Ataca antes quase sempre." },
  { id: "growl", name: "Rosnado", type: "normal", category: "status", power: 0, accuracy: 100, pp: 40, effects: [{ kind: "stage", target: "foe", stat: "atk", stages: -1 }], description: "Reduz o Ataque do alvo." },
  { id: "leer", name: "Olhar Feroz", type: "normal", category: "status", power: 0, accuracy: 100, pp: 30, effects: [{ kind: "stage", target: "foe", stat: "def", stages: -1 }], description: "Reduz a Defesa do alvo." },
  { id: "harden", name: "Endurecer", type: "normal", category: "status", power: 0, accuracy: null, pp: 30, effects: [{ kind: "stage", target: "self", stat: "def", stages: 1 }], description: "Aumenta a própria Defesa." },
  { id: "sand_attack", name: "Ataque de Areia", type: "ground", category: "status", power: 0, accuracy: 100, pp: 15, effects: [{ kind: "stage", target: "foe", stat: "accuracy", stages: -1 }], description: "Reduz a precisão do alvo." },
  { id: "ember", name: "Brasa", type: "fire", category: "special", power: 40, accuracy: 100, pp: 25, effects: [{ kind: "status", status: "burn", chance: 0.1 }], description: "Pode queimar o alvo." },
  { id: "peck", name: "Bicada", type: "flying", category: "physical", power: 35, accuracy: 100, pp: 35, description: "Bica o alvo com força." },
  { id: "double_kick", name: "Chute Duplo", type: "fighting", category: "physical", power: 30, accuracy: 100, pp: 30, hits: 2, description: "Chuta duas vezes seguidas." },
  { id: "vine_whip", name: "Chicote de Vinha", type: "grass", category: "physical", power: 45, accuracy: 100, pp: 25, description: "Açoita com vinhas finas." },
  { id: "razor_leaf", name: "Folha Navalha", type: "grass", category: "physical", power: 55, accuracy: 95, pp: 25, highCrit: true, description: "Folhas cortantes. Acerto crítico frequente." },
  { id: "poison_powder", name: "Pó Venenoso", type: "poison", category: "status", power: 0, accuracy: 75, pp: 35, powder: true, effects: [{ kind: "status", status: "poison", chance: 1 }], description: "Envenena o alvo." },
  { id: "sleep_powder", name: "Pó do Sono", type: "grass", category: "status", power: 0, accuracy: 75, pp: 15, powder: true, effects: [{ kind: "status", status: "sleep", chance: 1 }], description: "Faz o alvo dormir." },
  { id: "bubble", name: "Bolha", type: "water", category: "special", power: 40, accuracy: 100, pp: 30, effects: [{ kind: "stage", target: "foe", stat: "spe", stages: -1, chance: 0.1 }], description: "Pode reduzir a Velocidade." },
  { id: "water_gun", name: "Revólver d'Água", type: "water", category: "special", power: 40, accuracy: 100, pp: 25, description: "Jato de água sob pressão." },
  { id: "water_pulse", name: "Pulso d'Água", type: "water", category: "special", power: 60, accuracy: 100, pp: 20, effects: [{ kind: "confuse", chance: 0.2 }], description: "Uma onda de água concentrada." },
  { id: "string_shot", name: "Fio de Seda", type: "bug", category: "status", power: 0, accuracy: 95, pp: 40, effects: [{ kind: "stage", target: "foe", stat: "spe", stages: -2 }], description: "Reduz muito a Velocidade." },
  { id: "poison_sting", name: "Ferrão Venenoso", type: "poison", category: "physical", power: 15, accuracy: 100, pp: 35, effects: [{ kind: "status", status: "poison", chance: 0.3 }], description: "Pode envenenar." },
  { id: "bug_bite", name: "Picada", type: "bug", category: "physical", power: 60, accuracy: 100, pp: 20, description: "Morde com mandíbulas." },
  { id: "wing_attack", name: "Ataque de Asa", type: "flying", category: "physical", power: 60, accuracy: 100, pp: 35, description: "Golpeia com as asas abertas." },
  { id: "bite", name: "Mordida", type: "dark", category: "physical", power: 60, accuracy: 100, pp: 25, effects: [{ kind: "flinch", chance: 0.3 }], description: "Pode fazer o alvo hesitar." },
  { id: "dragon_rage", name: "Fúria do Dragão", type: "dragon", category: "special", power: 1, accuracy: 100, pp: 10, effects: [{ kind: "fixed", damage: 40 }], description: "Causa sempre 40 de dano." },
  { id: "dragon_breath", name: "Sopro do Dragão", type: "dragon", category: "special", power: 60, accuracy: 100, pp: 20, effects: [{ kind: "status", status: "paralysis", chance: 0.3 }], description: "Pode paralisar." },
  { id: "confusion", name: "Confusão", type: "psychic", category: "special", power: 50, accuracy: 100, pp: 25, effects: [{ kind: "confuse", chance: 0.1 }], description: "Uma onda psíquica." },
  { id: "psybeam", name: "Psicorraio", type: "psychic", category: "special", power: 65, accuracy: 100, pp: 20, effects: [{ kind: "confuse", chance: 0.1 }], description: "Um raio de energia psíquica." },
  { id: "shadow_claw", name: "Garra Sombria", type: "ghost", category: "physical", power: 70, accuracy: 100, pp: 15, highCrit: true, description: "Garras de sombra. Crítico frequente." },
  { id: "flame_wheel", name: "Roda de Fogo", type: "fire", category: "physical", power: 60, accuracy: 100, pp: 25, effects: [{ kind: "status", status: "burn", chance: 0.1 }], description: "Rola envolto em chamas." },
  { id: "take_down", name: "Desmantelar", type: "normal", category: "physical", power: 90, accuracy: 85, pp: 20, description: "Avança com o corpo todo." },
  { id: "slash", name: "Talho", type: "normal", category: "physical", power: 70, accuracy: 100, pp: 20, highCrit: true, description: "Corte rápido. Crítico frequente." },
  { id: "seed_bomb", name: "Bomba de Sementes", type: "grass", category: "physical", power: 80, accuracy: 100, pp: 15, description: "Dispara sementes duras." },
  { id: "giga_drain", name: "Gigadreno", type: "grass", category: "special", power: 75, accuracy: 100, pp: 10, description: "Suga a energia do alvo." },
  { id: "earthquake", name: "Terremoto", type: "ground", category: "physical", power: 100, accuracy: 100, pp: 10, description: "Sacode o chão com violência." },
  { id: "flamethrower", name: "Lança-chamas", type: "fire", category: "special", power: 90, accuracy: 100, pp: 15, effects: [{ kind: "status", status: "burn", chance: 0.1 }], description: "Um jato de fogo. Pode queimar." },
  { id: "blaze_kick", name: "Chute Labareda", type: "fire", category: "physical", power: 85, accuracy: 90, pp: 10, highCrit: true, effects: [{ kind: "status", status: "burn", chance: 0.1 }], description: "Chute em chamas. Crítico frequente." },
  { id: "sky_uppercut", name: "Gancho Alto", type: "fighting", category: "physical", power: 85, accuracy: 90, pp: 15, description: "Um soco de baixo para cima." },
  { id: "close_combat", name: "Combate Corpo a Corpo", type: "fighting", category: "physical", power: 120, accuracy: 100, pp: 5, effects: [{ kind: "stage", target: "self", stat: "def", stages: -1 }, { kind: "stage", target: "self", stat: "spd", stages: -1 }], description: "Ataque total. Baixa as próprias defesas." },
  { id: "surf", name: "Surfe", type: "water", category: "special", power: 90, accuracy: 100, pp: 15, description: "Uma onda enorme." },
  { id: "night_slash", name: "Talho Noturno", type: "dark", category: "physical", power: 70, accuracy: 100, pp: 15, highCrit: true, description: "Golpe nas sombras. Crítico frequente." },
  { id: "dark_pulse", name: "Pulso Sombrio", type: "dark", category: "special", power: 80, accuracy: 100, pp: 15, effects: [{ kind: "flinch", chance: 0.2 }], description: "Onda de energia sombria." },
  { id: "crunch", name: "Triturar", type: "dark", category: "physical", power: 80, accuracy: 100, pp: 15, effects: [{ kind: "stage", target: "foe", stat: "def", stages: -1, chance: 0.2 }], description: "Mordida forte. Pode baixar a Defesa." },
  { id: "aerial_ace", name: "Ás dos Céus", type: "flying", category: "physical", power: 60, accuracy: null, pp: 20, description: "Ataque veloz que nunca erra." },
  { id: "gust", name: "Lufada", type: "flying", category: "special", power: 40, accuracy: 100, pp: 35, description: "Levanta um vento forte." },
  { id: "bug_buzz", name: "Zumbido", type: "bug", category: "special", power: 90, accuracy: 100, pp: 10, effects: [{ kind: "stage", target: "foe", stat: "spd", stages: -1, chance: 0.1 }], description: "Vibração que fere os ouvidos." },
  { id: "dragon_claw", name: "Garra de Dragão", type: "dragon", category: "physical", power: 80, accuracy: 100, pp: 15, description: "Garras afiadas de dragão." },
  { id: "heat_wave", name: "Onda de Calor", type: "fire", category: "special", power: 95, accuracy: 90, pp: 10, effects: [{ kind: "status", status: "burn", chance: 0.1 }], description: "Explosão de ar quente." },
  { id: "flare_blitz", name: "Investida Flamejante", type: "fire", category: "physical", power: 120, accuracy: 100, pp: 15, effects: [{ kind: "status", status: "burn", chance: 0.1 }], description: "Investida em chamas totais." },
  { id: "water_shuriken", name: "Estrela Ninja", type: "water", category: "special", power: 15, accuracy: 100, pp: 20, hits: 3, priority: 1, description: "Shurikens d'água em rajada." },
];

/** Dados numéricos da PokéAPI; textos traduzidos e efeitos implementados ficam locais. */
export const MOVES: Record<string, MoveDef> = Object.fromEntries(list.map((definition) => {
  const canonical = canonicalData[definition.id as keyof typeof canonicalData];
  const min = canonical.minHits, max = canonical.maxHits;
  return [definition.id, {
    ...definition,
    type: canonical.type as TypeId,
    category: canonical.category as MoveCategory,
    power: canonical.power ?? 0,
    accuracy: canonical.accuracy,
    pp: canonical.pp,
    priority: canonical.priority,
    hits: min && min === max ? min : undefined,
    hitRange: min && max && max > min ? [min, max] : undefined,
    drain: Math.max(0, canonical.drain) / 100,
    description: descriptions[definition.id as keyof typeof descriptions],
  } satisfies MoveDef];
}));

export const CATEGORY_NAME: Record<MoveCategory, string> = { physical: "Físico", special: "Especial", status: "Status" };

export function movePower(definition: MoveDef): string {
  return definition.power > 0 ? String(definition.power) : "—";
}

export function moveAccuracy(definition: MoveDef): string {
  return definition.accuracy === null ? "—" : `${definition.accuracy}%`;
}

export function move(id: string): MoveDef {
  const found = MOVES[id];
  if (!found) throw new Error(`Golpe desconhecido: ${id}`);
  return found;
}

export const STATUS_NAME: Record<StatusId, string> = {
  burn: "QUE",
  poison: "ENV",
  paralysis: "PAR",
  sleep: "DOR",
  freeze: "CON",
};

export const STAT_NAME: Record<StageStat, string> = {
  atk: "Ataque",
  def: "Defesa",
  spa: "Ataque Especial",
  spd: "Defesa Especial",
  spe: "Velocidade",
  accuracy: "Precisão",
  evasion: "Evasão",
};
