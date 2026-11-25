import type { FieldObstacleKind, PuzzleStatus } from "@/data/field/types";

/**
 * Um obstáculo que pede golpe de campo. A posição mora no mapa: objeto na camada `fields` de
 * scripts/build_maps.py (`m.field(id, x, y, kind)`), com o mesmo id daqui. O tile é sólido até o
 * jogador limpar; aí a flag `clearedFlag` liga e o obstáculo some de vez.
 */
export type FieldGate = {
  id: string;
  map: string;
  kind: FieldObstacleKind;
  status: PuzzleStatus;
  /** Flag gravada no save quando o jogador limpa o obstáculo. */
  clearedFlag: string;
  /** Capítulo sugerido para dar a HM. */
  chapter?: string;
  notes: string;
};

/** Obstáculos que o motor já sabe limpar. Os outros só mostram o texto de OBSTACLE_TEXT. */
export const PLAYABLE_KINDS: ReadonlySet<FieldObstacleKind> = new Set(["cut_bush", "smash_rock"]);

/** Quadro do obstáculo em public/assets/tilesets/field_obstacles.png (scripts/build_field_tiles.py). */
export const FIELD_FRAME: Partial<Record<FieldObstacleKind, number>> = {
  cut_bush: 0,
  smash_rock: 1,
  push_boulder: 2,
  defog_mist: 3,
};

/** O que o jogador lê ao olhar o obstáculo sem poder limpar. */
export const OBSTACLE_TEXT: Record<FieldObstacleKind, string> = {
  cut_bush: "Uma moita fina fecha a passagem. Dá para cortar.",
  smash_rock: "Uma rocha rachada bloqueia o caminho. Um golpe forte quebraria.",
  push_boulder: "Um pedregulho pesado. Quem tivesse muita força empurraria.",
  surf_water: "A água é funda. Só nadando para atravessar.",
  waterfall: "Uma cachoeira forte. Seria preciso subir pela água.",
  flash_dark: "Está escuro demais para seguir.",
  dive_spot: "A água aqui é calma e funda. Dá para ver algo lá embaixo.",
  defog_mist: "Uma névoa espessa não deixa ver o caminho.",
};

/**
 * Catálogo dos obstáculos. "rascunho" = ainda não está em mapa; "jogável" = no mapa e limpável.
 * JOÃO: a hora de dar cada HM é da história (sugestão em docs/HM-TM-CAMPO.md).
 */
export const FIELD_GATES: FieldGate[] = [
  {
    id: "route2_bush_shortcut",
    map: "route2",
    kind: "cut_bush",
    status: "jogável",
    clearedFlag: "gate_route2_bush_shortcut",
    chapter: "c2_aster",
    notes: "Moita no bosque a leste do começo da Rota 2. Atrás dela, uma clareira com um Doce Raro.",
  },
  {
    id: "ferruria_rock_mart",
    map: "ferruria",
    kind: "smash_rock",
    status: "rascunho",
    clearedFlag: "gate_ferruria_rock_mart",
    chapter: "c2_aster",
    notes: "JOÃO: pedra bloqueando atalho atrás da loja. HM06 depois do ginásio ou achada na rota.",
  },
  {
    id: "route3_boulder_gap",
    map: "route3",
    kind: "push_boulder",
    status: "rascunho",
    clearedFlag: "gate_route3_boulder",
    chapter: "c3_verdelume",
    notes: "JOÃO: Força abre passagem lateral para item raro ou área de treino.",
  },
  {
    id: "echo_cave_flash_room",
    map: "echo_cave",
    kind: "flash_dark",
    status: "rascunho",
    clearedFlag: "gate_echo_cave_lit",
    chapter: "c3_verdelume",
    notes: "JOÃO: sala escura na Galeria do Eco. HM05 ou missão de Verdelume.",
  },
  {
    id: "echo_cave_smash_wall",
    map: "echo_cave",
    kind: "smash_rock",
    status: "rascunho",
    clearedFlag: "gate_echo_cave_smash",
    chapter: "c3_verdelume",
    notes: "JOÃO: pedra esconde entrada secundária ou item da história.",
  },
  {
    id: "porto_surf_dock",
    map: "porto_coral",
    kind: "surf_water",
    status: "rascunho",
    clearedFlag: "gate_porto_surf",
    chapter: "c4_porto",
    notes: "JOÃO: píer bloqueado até a HM03 (ginásio Voador ou navio de pesquisa).",
  },
  {
    id: "cordilheira_waterfall",
    map: "passagem_cordilheira",
    kind: "waterfall",
    status: "rascunho",
    clearedFlag: "gate_cordilheira_waterfall",
    chapter: "c7_draconia",
    notes: "JOÃO: cachoeira rumo a Dracônia. HM07.",
  },
  {
    id: "floraviva_dive_lagoon",
    map: "planalto_flores",
    kind: "dive_spot",
    status: "rascunho",
    clearedFlag: "gate_floraviva_dive",
    chapter: "c8_floraviva",
    notes: "JOÃO: lago calmo com item submerso. HM08.",
  },
];

const byId = new Map(FIELD_GATES.map((gate) => [gate.id, gate]));

export function fieldGate(id: string): FieldGate | undefined {
  return byId.get(id);
}

export function gatesForMap(map: string): FieldGate[] {
  return FIELD_GATES.filter((gate) => gate.map === map);
}
