/**
 * Bíblia rápida de personagens — espelha GERO.md para o código e diálogos.
 * Uso: import { CHARACTERS, ORGANIZATION } from "@/data/story/characters"
 */

export type CharacterRole = "aliado" | "rival" | "mentor" | "antagonista" | "misterio" | "npc";

export type CharacterDef = {
  id: string;
  name: string;
  role: CharacterRole;
  hook: string;
  firstChapter: string;
  voice: string;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: "hero",
    name: "{nome}",
    role: "aliado",
    hook: "Treina por necessidade (mãe doente), não por gosto de batalha.",
    firstChapter: "c1_brisamar",
    voice: "Curto, guardado, pensa mais do que fala.",
  },
  {
    id: "mother",
    name: "Mãe",
    role: "aliado",
    hook: "Doença crônica; tratamento em Oráculo; foto com homem de boné vermelho (Red).",
    firstChapter: "c1_brisamar",
    voice: "Cansaço, humor seco, amor sem drama.",
  },
  {
    id: "lira",
    name: "Profª Lira",
    role: "mentor",
    hook: "Pesquisa migração Pokémon e anomalias de energia no observatório.",
    firstChapter: "c1_brisamar",
    voice: "Científica, firme, confia no protagonista.",
  },
  {
    id: "ren",
    name: "Ren",
    role: "rival",
    hook: "Vizinho de infância; linhagem de treinador de Kanto; quer ser Campeão.",
    firstChapter: "c1_brisamar",
    voice: "Alto, animado, competitivo mas leal.",
  },
  {
    id: "thomas",
    name: "Thomas (Thomas Group)",
    role: "antagonista",
    hook: "Patrocinador da Liga e ginásios; ligação com organização criminosa (ato 3).",
    firstChapter: "c1_brisamar (pista) / c3_verdelume",
    voice: "Corporativo, simpático na superfície.",
  },
  {
    id: "giovanni",
    name: "Giovanni",
    role: "antagonista",
    hook: "Chefe da organização; batalha final com Giratina distorcida.",
    firstChapter: "c12_distorcao",
    voice: "Frio, calculista.",
  },
  {
    id: "champion",
    name: "Campeão (filho de Jessie e James)",
    role: "misterio",
    hook: "Campeão antes da distorção final; referência Rocket.",
    firstChapter: "c11_liga",
    voice: "Teatral, herança dos pais.",
  },
];

export const ORGANIZATION = {
  workingName: "Equipe Distorção",
  signs: ["Thomas Group", "instalações em Floraviva/Noctária", "páginas arrancadas em Velária"],
  finalBoss: "Giovanni + Giratina",
} as const;

export const FORESHADOW_FLAGS = [
  "saw_thomas_ad",
  "photo_hint_red",
  "met_ren_route1",
  "reached_forest",
] as const;