export type TrainerDef = {
  id: string;
  name: string;
  team: { species: string; level: number }[];
  reward: number;
  intro: string[];
  defeat: string[];
  after: string[];
};

export const TRAINERS: Record<string, TrainerDef> = {
  youngster_caio: {
    id: "youngster_caio",
    name: "Juvenil Caio",
    team: [
      { species: "starly", level: 3 },
      { species: "wurmple", level: 3 },
    ],
    reward: 60,
    intro: ["Ei! Você é de Brisamar, né?", "Ninguém passa pela Rota 1 sem batalhar comigo!"],
    defeat: ["Perdi... Seu Pokémon parece confiar em você."],
    after: ["A Floresta de Aster fica no fim da rota.", "Dizem que os Pokémon de lá andam assustados ultimamente."],
  },
};
