export type TrainerDef = {
  id: string;
  name: string;
  team: { species: string; level: number }[];
  reward: number;
  /** Cenário da batalha (padrão: grass). */
  background?: string;
  intro: string[];
  defeat: string[];
  after: string[];
};

export const TRAINERS: Record<string, TrainerDef> = {
  camper_luan: {
    id: "camper_luan",
    name: "Campista Luan",
    team: [
      { species: "starly", level: 6 },
      { species: "wurmple", level: 6 },
    ],
    reward: 180,
    intro: ["Quem pega o caminho do leste tem que passar por mim!", "Montei acampamento aqui só para treinar."],
    defeat: ["Tá bom, tá bom... o caminho é seu."],
    after: ["O caminho do oeste tem mais mato. Aqui tem mais treinador. Escolheu bem."],
  },
  watcher_nina: {
    id: "watcher_nina",
    name: "Observadora Nina",
    team: [
      { species: "starly", level: 7 },
      { species: "starly", level: 8 },
    ],
    reward: 220,
    intro: ["Psiu! Eu estava contando os Starly que passam aqui.", "Hoje passaram poucos. Vamos ver se o seu dá conta dos meus."],
    defeat: ["Voam bem, mas você voou melhor."],
    after: ["Os bandos estão fugindo da floresta. Alguma coisa assusta eles lá no meio."],
  },
  bug_davi: {
    id: "bug_davi",
    name: "Menino Davi",
    team: [
      { species: "wurmple", level: 8 },
      { species: "silcoon", level: 8 },
    ],
    reward: 160,
    intro: ["Vai no ginásio da Cora? Então primeiro passa no meu treino!", "Meus insetos são a dupla mais forte da rua."],
    defeat: ["Ah, não! Meu Silcoon nem chegou a evoluir..."],
    after: ["Dica: no ginásio, os casulos abrem e fecham as teias. Presta atenção em quais sumiram."],
  },
  explorer_lu: {
    id: "explorer_lu",
    name: "Exploradora Lu",
    team: [
      { species: "beautifly", level: 12 },
      { species: "starly", level: 12 },
    ],
    reward: 400,
    intro: ["O guarda deixou você entrar? Então você tem a Insígnia Casulo!", "Este bosque é o meu lugar secreto. Me mostra se merece ele."],
    defeat: ["Uau. Pode voltar aqui quando quiser."],
    after: ["Dizem que o frio estranho da floresta chegou até aqui uma vez. Só uma noite."],
  },
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
  gym_lia: {
    id: "gym_lia",
    name: "Aprendiz Lia",
    team: [
      { species: "wurmple", level: 7 },
      { species: "wurmple", level: 7 },
    ],
    reward: 140,
    background: "gym",
    intro: ["Toda teia aqui tem um motivo!", "Se quiser chegar na Cora, mostra que sabe lutar."],
    defeat: ["Uau. Você nem se enrolou!"],
    after: ["Dica: o casulo aceso abre umas teias e fecha outras. Olhe antes de tocar."],
  },
  gym_tome: {
    id: "gym_tome",
    name: "Aprendiz Tomé",
    team: [
      { species: "silcoon", level: 8 },
      { species: "wurmple", level: 8 },
    ],
    reward: 160,
    background: "gym",
    intro: ["Achou o caminho até aqui? Então já entendeu metade do ginásio.", "A outra metade é passar por mim!"],
    defeat: ["O casulo aguentou... mas eu não."],
    after: ["A líder está logo acima. Ela vai gostar de você."],
  },
  leader_cora: {
    id: "leader_cora",
    name: "Líder Cora",
    team: [
      { species: "wurmple", level: 9 },
      { species: "silcoon", level: 10 },
      { species: "beautifly", level: 12 },
    ],
    reward: 900,
    background: "gym",
    intro: ["Bem-vindo ao Viveiro.", "Aqui ninguém vence pela força. Vence quem presta atenção.", "Vamos ver o que você aprendeu na floresta. Valendo a Insígnia Casulo!"],
    defeat: ["...Você ouviu o seu parceiro o tempo inteiro. Dá pra ver."],
    after: ["Cuide bem da Insígnia Casulo. E do seu parceiro, principalmente."],
  },
  rival_gael_1: {
    id: "rival_gael_1",
    name: "Gael",
    team: [
      { species: "starly", level: 10 },
      { species: "silcoon", level: 10 },
    ],
    reward: 500,
    background: "town",
    intro: ["Primeira insígnia! Agora você me deve uma batalha de verdade.", "O Pikachu fica de fora. Quero ver você contra os que a gente pegou juntos!"],
    defeat: ["Ah, não acredito! Bem na frente do Pikachu..."],
    after: ["Na próxima eu ganho. Pode escrever."],
  },
};
