export type ChapterStatus = "jogável" | "planejado";

export type GiftEvent = {
  id: string;
  flag: string;
  species: string;
  level: number;
  requires: { badges?: number; flags?: string[] };
  location: string;
  status: ChapterStatus;
};

export type ChapterDef = {
  id: string;
  act: number;
  title: string;
  unlock: { badges?: number; flags?: string[] };
  beats: string[];
  status: ChapterStatus;
};

export const ACTS = [
  { act: 1, title: "A necessidade" },
  { act: 2, title: "A descoberta do mundo" },
  { act: 3, title: "Os segredos de Asteria" },
  { act: 4, title: "O legado de Red" },
  { act: 5, title: "Liga e ameaça final" },
];

export const CHAPTERS: ChapterDef[] = [
  {
    id: "c1_brisamar",
    act: 1,
    title: "Brisamar",
    unlock: {},
    beats: [
      "Acordar no quarto",
      "Conversa com a mãe sobre a doença e a Liga",
      "Laboratório da Profª Lira e escolha do inicial",
      "Primeiro encontro e batalha com Ren",
      "Pokédex e orientações de viagem",
      "Rota 1 liberada",
    ],
    status: "jogável",
  },
  { id: "c2_aster", act: 2, title: "Floresta de Aster e Ferrúria", unlock: { flags: ["reached_forest"] }, beats: ["Floresta de Aster", "Rota 2 (dois caminhos e o bosque)", "Primeiro ginásio (Inseto)"], status: "jogável" },
  { id: "c3_verdelume", act: 2, title: "Ecos sob a Pedra", unlock: { badges: 1 }, beats: ["Bosque do Orvalho", "Resgate na Galeria do Eco", "Primeiro confronto com a Rocket reorganizada, ainda sem identidade confirmada", "Patrocínio de Thomas em Verdelume", "Segundo ginásio (Lutador)"], status: "planejado" },
  { id: "c4_porto", act: 2, title: "Porto Coral", unlock: { badges: 2 }, beats: ["Navio de pesquisa", "Terceiro ginásio (Voador)"], status: "planejado" },
  { id: "c5_oraculo", act: 2, title: "Oráculo", unlock: { badges: 3 }, beats: ["Sonhos compartilhados", "Quarto ginásio (Psíquico)"], status: "planejado" },
  { id: "c6_velaria", act: 3, title: "Velária", unlock: { badges: 4 }, beats: ["Arquivos sobre distorção", "Quinto ginásio (Fantasma)"], status: "planejado" },
  { id: "c7_draconia", act: 3, title: "Dracônia", unlock: { badges: 5 }, beats: ["Estátua de Cynthia", "Gible da descendente de Cynthia (opcional)", "Sexto ginásio (Dragão)"], status: "planejado" },
  { id: "c8_floraviva", act: 3, title: "Floraviva", unlock: { badges: 6 }, beats: ["Sétimo ginásio (Fada)"], status: "planejado" },
  { id: "c9_noctaria", act: 3, title: "Noctária", unlock: { badges: 7 }, beats: ["Ligação entre Thomas e a organização", "Oitavo ginásio (Sombrio)"], status: "planejado" },
  { id: "c10_legado", act: 4, title: "O legado de Red", unlock: { badges: 8 }, beats: ["Batalha decisiva com Ren", "A mãe revela o avô", "Mew"], status: "planejado" },
  { id: "c11_liga", act: 5, title: "Liga Pokémon", unlock: { flags: ["got_mew"] }, beats: ["Elite Four", "Campeão, filho de Jessie e James"], status: "planejado" },
  { id: "c12_distorcao", act: 5, title: "Mundo Distorcido", unlock: { flags: ["champion_defeated"] }, beats: ["Thomas e Giovanni em batalha dupla", "Giovanni unido a Giratina", "Encerramento"], status: "planejado" },
];

export const GIFTS: GiftEvent[] = [
  { id: "gift_starter", flag: "got_starter", species: "starter", level: 5, requires: { flags: ["talked_mother"] }, location: "lab", status: "jogável" },
  { id: "gift_gible", flag: "got_gible", species: "gible", level: 25, requires: { badges: 5 }, location: "draconia_cynthia_house", status: "planejado" },
  { id: "gift_mew", flag: "got_mew", species: "mew", level: 50, requires: { badges: 8, flags: ["rival_final_done"] }, location: "house_1f", status: "planejado" },
];
