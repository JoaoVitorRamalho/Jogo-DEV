import type { TypeId } from "@/data/pokemon/types";

export type CityStatus = "jogável" | "planejado";

export type CityDef = {
  id: string;
  name: string;
  order: number;
  region: "Costa Oeste" | "Costa Sul" | "Interior Central" | "Costa Leste" | "Norte Elevado";
  influence: string;
  gym: { type: TypeId; badge: string; leader: string } | null;
  maps: string[];
  routeIn: string | null;
  landmarks: string[];
  story: string;
  status: CityStatus;
};

export const CITIES: CityDef[] = [
  {
    id: "brisamar",
    name: "Vila Brisamar",
    order: 0,
    region: "Costa Oeste",
    influence: "Pallet e vilas costeiras de Hoenn",
    gym: null,
    maps: ["brisamar", "house_1f", "house_2f", "neighbor", "lab"],
    routeIn: null,
    landmarks: ["Casa do protagonista", "Laboratório da Profª Lira", "Praça da fonte", "Praia e cais"],
    story: "A mãe doente, a escolha do inicial e o primeiro encontro com Ren.",
    status: "jogável",
  },
  {
    id: "ferruria",
    name: "Ferrúria",
    order: 1,
    region: "Costa Oeste",
    influence: "Viridian e a mata de Kanto",
    gym: { type: "bug", badge: "Insígnia Casulo", leader: "Cora" },
    maps: ["ferruria", "ferruria_center", "ferruria_gym", "ferruria_lab", "ferruria_mart", "ferruria_house"],
    routeIn: "forest_aster",
    landmarks: ["Viveiro-labirinto", "Laboratório ecológico", "Centro de Cura", "Loja do Seu Joca", "Lago da praça"],
    story: "Pokémon da floresta abandonam o habitat sem motivo aparente.",
    status: "jogável",
  },
  {
    id: "verdelume",
    name: "Verdelume",
    order: 2,
    region: "Costa Oeste",
    influence: "Cidades de treino de Kanto",
    gym: { type: "fighting", badge: "Insígnia Punho", leader: "a definir" },
    maps: ["verdelume", "verdelume_center", "verdelume_gym", "verdelume_mart", "verdelume_house"],
    routeIn: "route3",
    landmarks: ["Dojo", "Campo de treinamento"],
    story: "Eventos patrocinados por Thomas recrutam jovens treinadores.",
    status: "planejado",
  },
  {
    id: "porto_coral",
    name: "Porto Coral",
    order: 3,
    region: "Costa Sul",
    influence: "Slateport, Lilycove e Vermilion",
    gym: { type: "flying", badge: "Insígnia Vento", leader: "a definir" },
    maps: [],
    routeIn: "route_mares",
    landmarks: ["Farol", "Mercado regional", "Estaleiro"],
    story: "Tempestades fora de época e um navio de pesquisa que some por horas.",
    status: "planejado",
  },
  {
    id: "oraculo",
    name: "Oráculo",
    order: 4,
    region: "Interior Central",
    influence: "Saffron e centros de pesquisa de Sinnoh",
    gym: { type: "psychic", badge: "Insígnia Mente", leader: "a definir" },
    maps: [],
    routeIn: "rota_colinas",
    landmarks: ["Instituto", "Observatório menor"],
    story: "Sonhos compartilhados com uma paisagem impossível.",
    status: "planejado",
  },
  {
    id: "velaria",
    name: "Velária",
    order: 5,
    region: "Interior Central",
    influence: "Lavender e locais históricos de Sinnoh",
    gym: { type: "ghost", badge: "Insígnia Véu", leader: "a definir" },
    maps: [],
    routeIn: "bosque_antigo",
    landmarks: ["Museu", "Cemitério histórico", "Ruínas"],
    story: "Páginas arrancadas sobre uma equipe que estudava distorções.",
    status: "planejado",
  },
  {
    id: "draconia",
    name: "Dracônia",
    order: 6,
    region: "Interior Central",
    influence: "Blackthorn e a tradição montanhosa de Sinnoh",
    gym: { type: "dragon", badge: "Insígnia Escama", leader: "a definir" },
    maps: [],
    routeIn: "passagem_cordilheira",
    landmarks: ["Estátua de Cynthia", "Casa da descendente de Cynthia", "Pontes de pedra"],
    story: "Lendas de dragões que protegeram a ilha. Evento opcional do Gible.",
    status: "planejado",
  },
  {
    id: "floraviva",
    name: "Floraviva",
    order: 7,
    region: "Costa Leste",
    influence: "Floaroma e jardins de Hoenn",
    gym: { type: "fairy", badge: "Insígnia Pétala", leader: "a definir" },
    maps: [],
    routeIn: "planalto_flores",
    landmarks: ["Planalto das Flores"],
    story: "Os campos começam a murchar perto de instalações da organização.",
    status: "planejado",
  },
  {
    id: "noctaria",
    name: "Noctária",
    order: 8,
    region: "Costa Leste",
    influence: "Distritos industriais",
    gym: { type: "dark", badge: "Insígnia Eclipse", leader: "a definir" },
    maps: [],
    routeIn: "tunel_noturno",
    landmarks: ["Distrito Industrial", "Túnel Noturno"],
    story: "Documentos e nomes codificados ligam empresas de Thomas à organização.",
    status: "planejado",
  },
  {
    id: "planalto_liga",
    name: "Planalto da Liga",
    order: 9,
    region: "Norte Elevado",
    influence: "Indigo Plateau",
    gym: null,
    maps: [],
    routeIn: "rota_liga",
    landmarks: ["Elite Four", "Salão do Campeão"],
    story: "Elite Four de Fogo, Água, Pedra/Normal e Dragão/Terra. O Campeão é filho de Jessie e James.",
    status: "planejado",
  },
];
