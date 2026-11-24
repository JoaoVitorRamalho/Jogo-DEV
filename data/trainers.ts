import { defaultRng, type Rng } from "@/game/core/rng";

export type TrainerMember = { species: string; level: number; alternatives?: string[] };

export type TrainerDef = {
  id: string;
  name: string;
  team: TrainerMember[];
  reward: number;
  /** Cenário da batalha (padrão: grass). */
  background?: string;
  intro: string[];
  defeat: string[];
  after: string[];
};

export const TRAINERS: Record<string, TrainerDef> = {
  picnic_mel: {
    id: "picnic_mel",
    name: "Piqueniqueira Mel",
    team: [{ species: "caterpie", level: 3 }],
    reward: 90,
    intro: ["Opa! Ninguém passa pela trilha sem uma batalha comigo.", "Fica tranquilo, meu Caterpie ainda é filhote."],
    defeat: ["Viu? Seu parceiro já está pegando o jeito."],
    after: ["Cada batalha dá experiência. É assim que ele fica forte."],
  },
  hiker_rui: {
    id: "hiker_rui",
    name: "Andarilho Rui",
    team: [{ species: "pachirisu", level: 5 }],
    reward: 150,
    intro: ["Alto lá! Quem entra na Rota 2 enfrenta o Rui primeiro.", "É regra minha. Ninguém reclamou até hoje."],
    defeat: ["Pode passar. Você mereceu."],
    after: ["Lá na frente a rota se divide em dois caminhos. Os dois chegam em Ferrúria."],
  },
  scout_tais: {
    id: "scout_tais",
    name: "Escoteira Tais",
    team: [{ species: "pidgey", level: 6 }],
    reward: 160,
    intro: ["Última parada antes de Ferrúria!", "Mostra o que aprendeu na rota."],
    defeat: ["Você está pronto para a cidade."],
    after: ["Ferrúria fica logo ali em cima. O Centro Pokémon é o prédio de telhado vermelho."],
  },
  camper_luan: {
    id: "camper_luan",
    name: "Campista Luan",
    team: [
      { species: "starly", level: 6, alternatives: ["pidgey"] },
      { species: "bidoof", level: 6, alternatives: ["pachirisu"] },
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
      { species: "pidgey", level: 7 },
      { species: "starly", level: 8 },
    ],
    reward: 220,
    intro: ["Psiu! Eu estava contando os pássaros que passam aqui.", "Hoje passaram poucos. Vamos ver se o seu dá conta dos meus."],
    defeat: ["Voam bem, mas você voou melhor."],
    after: ["Os bandos estão fugindo da floresta. Alguma coisa assusta eles lá no meio."],
  },
  bug_davi: {
    id: "bug_davi",
    name: "Menino Davi",
    team: [
      { species: "wurmple", level: 8, alternatives: ["caterpie"] },
      { species: "silcoon", level: 8, alternatives: ["cascoon", "metapod"] },
    ],
    reward: 160,
    intro: ["Vai no ginásio da Cora? Então primeiro passa no meu treino!", "Meus insetos são a dupla mais forte da rua."],
    defeat: ["Ah, não! Meu casulo nem chegou a evoluir..."],
    after: ["Dica: no ginásio, os casulos abrem e fecham as teias. Presta atenção em quais sumiram."],
  },
  explorer_lu: {
    id: "explorer_lu",
    name: "Exploradora Lu",
    team: [
      { species: "butterfree", level: 12, alternatives: ["beautifly", "dustox"] },
      { species: "starly", level: 12, alternatives: ["pidgey"] },
    ],
    reward: 400,
    intro: ["O guarda deixou você entrar? Então você tem a Insígnia Casulo!", "Este bosque é o meu lugar secreto. Me mostra se merece ele."],
    defeat: ["Uau. Pode voltar aqui quando quiser."],
    after: ["Dizem que o frio estranho da floresta chegou até aqui uma vez. Só uma noite."],
  },
  youngster_caio: {
    id: "youngster_caio",
    name: "Jovem Teo",
    team: [{ species: "bidoof", level: 3 }],
    reward: 80,
    intro: ["Ei! Você é um treinador novo, não é?", "Quer uma partida rápida? É assim que a gente aprende!"],
    defeat: ["Nossa, você tem jeito para isso!"],
    after: ["Vai melhorar a cada batalha. Boa viagem!"],
  },
  scout_bia: {
    id: "scout_bia",
    name: "Escoteira Bia",
    team: [
      { species: "caterpie", level: 3, alternatives: ["wurmple"] },
      { species: "bidoof", level: 3, alternatives: ["pachirisu"] },
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
      { species: "caterpie", level: 7, alternatives: ["wurmple"] },
      { species: "metapod", level: 7, alternatives: ["silcoon", "cascoon"] },
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
      { species: "cascoon", level: 8, alternatives: ["metapod", "silcoon"] },
      { species: "wurmple", level: 8, alternatives: ["caterpie"] },
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
      { species: "pikachu", level: 12 },
      { species: "silcoon", level: 10 },
    ],
    reward: 500,
    background: "town",
    intro: ["Primeira insígnia! Agora você me deve uma batalha de verdade.", "Pikachu, vamos mostrar o que a gente aprendeu juntos!"],
    defeat: ["Perdemos essa, Pikachu... Na próxima a gente consegue!"],
    after: ["Na próxima eu ganho. Pode escrever."],
  },
};

/** Varia os treinadores comuns; membros sem alternativas ficam garantidos. */
export function rollTrainerTeam(trainer: TrainerDef, rng: Rng = defaultRng): { species: string; level: number }[] {
  return trainer.team.map((member) => {
    const pool = [member.species, ...(member.alternatives ?? [])];
    return { species: pool.length === 1 ? member.species : pool[Math.floor(rng() * pool.length)], level: member.level };
  });
}
