import type { TypeId } from "@/data/pokemon/types";

export type StatId = "atk" | "def" | "spa" | "spd" | "spe";
export type StageStat = StatId | "accuracy" | "evasion";
export type StatusId = "burn" | "poison" | "paralysis" | "sleep" | "freeze";
export type MoveCategory = "physical" | "special" | "status";

export type MoveEffect =
  | { kind: "stage"; target: "self" | "foe"; stat: StageStat; stages: number; chance?: number }
  | { kind: "status"; status: StatusId; chance: number }
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
  highCrit?: boolean;
  powder?: boolean;
  effects?: MoveEffect[];
  description: string;
};

const list: MoveDef[] = [
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
  { id: "water_pulse", name: "Pulso d'Água", type: "water", category: "special", power: 60, accuracy: 100, pp: 20, description: "Uma onda de água concentrada." },
  { id: "string_shot", name: "Fio de Seda", type: "bug", category: "status", power: 0, accuracy: 95, pp: 40, effects: [{ kind: "stage", target: "foe", stat: "spe", stages: -2 }], description: "Reduz muito a Velocidade." },
  { id: "poison_sting", name: "Ferrão Venenoso", type: "poison", category: "physical", power: 15, accuracy: 100, pp: 35, effects: [{ kind: "status", status: "poison", chance: 0.3 }], description: "Pode envenenar." },
  { id: "bug_bite", name: "Picada", type: "bug", category: "physical", power: 60, accuracy: 100, pp: 20, description: "Morde com mandíbulas." },
  { id: "wing_attack", name: "Ataque de Asa", type: "flying", category: "physical", power: 60, accuracy: 100, pp: 35, description: "Golpeia com as asas abertas." },
  { id: "bite", name: "Mordida", type: "dark", category: "physical", power: 60, accuracy: 100, pp: 25, effects: [{ kind: "flinch", chance: 0.3 }], description: "Pode fazer o alvo hesitar." },
  { id: "dragon_rage", name: "Fúria do Dragão", type: "dragon", category: "special", power: 1, accuracy: 100, pp: 10, effects: [{ kind: "fixed", damage: 40 }], description: "Causa sempre 40 de dano." },
  { id: "dragon_breath", name: "Sopro do Dragão", type: "dragon", category: "special", power: 60, accuracy: 100, pp: 20, effects: [{ kind: "status", status: "paralysis", chance: 0.3 }], description: "Pode paralisar." },
  { id: "confusion", name: "Confusão", type: "psychic", category: "special", power: 50, accuracy: 100, pp: 25, description: "Uma onda psíquica." },
  { id: "psybeam", name: "Psicorraio", type: "psychic", category: "special", power: 65, accuracy: 100, pp: 20, description: "Um raio de energia psíquica." },
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
  { id: "close_combat", name: "Combate Corpo a Corpo", type: "fighting", category: "physical", power: 120, accuracy: 100, pp: 5, effects: [{ kind: "stage", target: "self", stat: "def", stages: -1 }], description: "Ataque total. Baixa a própria Defesa." },
  { id: "surf", name: "Surfe", type: "water", category: "special", power: 90, accuracy: 100, pp: 15, description: "Uma onda enorme." },
  { id: "night_slash", name: "Talho Noturno", type: "dark", category: "physical", power: 70, accuracy: 100, pp: 15, highCrit: true, description: "Golpe nas sombras. Crítico frequente." },
  { id: "dark_pulse", name: "Pulso Sombrio", type: "dark", category: "special", power: 80, accuracy: 100, pp: 15, effects: [{ kind: "flinch", chance: 0.2 }], description: "Onda de energia sombria." },
  { id: "crunch", name: "Triturar", type: "dark", category: "physical", power: 80, accuracy: 100, pp: 15, effects: [{ kind: "stage", target: "foe", stat: "def", stages: -1, chance: 0.2 }], description: "Mordida forte. Pode baixar a Defesa." },
  { id: "aerial_ace", name: "Ás dos Céus", type: "flying", category: "physical", power: 60, accuracy: null, pp: 20, description: "Ataque veloz que nunca erra." },
  { id: "gust", name: "Lufada", type: "flying", category: "special", power: 40, accuracy: 100, pp: 35, description: "Levanta um vento forte." },
  { id: "bug_buzz", name: "Zumbido", type: "bug", category: "special", power: 90, accuracy: 100, pp: 10, effects: [{ kind: "stage", target: "foe", stat: "spd", stages: -1, chance: 0.1 }], description: "Vibração que fere os ouvidos." },
  { id: "dragon_claw", name: "Garra de Dragão", type: "dragon", category: "physical", power: 80, accuracy: 100, pp: 15, description: "Garras afiadas de dragão." },
];

export const MOVES: Record<string, MoveDef> = Object.fromEntries(list.map((move) => [move.id, move]));

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
