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
    name: "Jovem Teo",
    team: [{ species: "starly", level: 3 }],
    reward: 80,
    intro: ["Ei! Você é um treinador novo, não é?", "Quer uma partida rápida? É assim que a gente aprende!"],
    defeat: ["Nossa, você tem jeito para isso!"],
    after: ["Vai melhorar a cada batalha. Boa viagem!"],
  },
  scout_bia: {
    id: "scout_bia",
    name: "Escoteira Bia",
    team: [
      { species: "wurmple", level: 3 },
      { species: "starly", level: 3 },
    ],
    reward: 120,
    intro: ["Você viu quantos Pokémon vivem aqui?", "Se você é treinador, podemos fazer uma batalha curtinha."],
    defeat: ["Boa! Seu Pokémon ouviu você direitinho."],
    after: ["A saída fica depois da trilha do norte. Boa sorte!"],
  },
  ravi: {
    id: "ravi",
    name: "Aprendiz Ravi",
    team: [{ species: "wurmple", level: 4 }],
    reward: 80,
    intro: ["Está levando seu parceiro para conhecer a floresta?", "Uma batalha rápida não vai atrasar tanto!"],
    defeat: ["Acho que preciso treinar mais."],
    after: ["Eu também comecei há pouco. Boa viagem."],
  },
};
