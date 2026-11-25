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

  // ---------- capítulo 3: Rota 3 e Dojo de Verdelume ----------
  rocket_echo_1: {
    id: "rocket_echo_1", name: "Recruta", reward: 360, background: "gym",
    team: [{ species: "poochyena", level: 13 }, { species: "weedle", level: 13 }],
    intro: ["Essa galeria está ocupada. Dê meia-volta.", "Você ouviu. Ninguém passa sem autorização."],
    defeat: ["Era só espantar a curiosidade... quem mandou você se meter?"],
    after: ["Não tenho mais nada para falar com você."],
  },
  rocket_echo_2: {
    id: "rocket_echo_2", name: "Recruta", reward: 420, background: "gym",
    team: [{ species: "cascoon", level: 14 }, { species: "beedrill", level: 15 }],
    intro: ["Anos trabalhando quietos. E você escolhe justamente hoje para aparecer.", "O Pokémon que procura está com o encarregado. Vai ter que passar por mim."],
    defeat: ["A coleta já terminou. Você chegou tarde demais."],
    after: ["A ordem agora é recuar."],
  },
  rocket_echo_lead: {
    id: "rocket_echo_lead", name: "Encarregado", reward: 650, background: "gym",
    team: [{ species: "beedrill", level: 16 }, { species: "mightyena", level: 18 }],
    intro: ["Você atravessou tudo isso por aquele Bidoof?", "A carga já está pronta. Não vou permitir que estrague a retirada."],
    defeat: ["Chega. O material é o que importa."],
    after: ["A operação na galeria terminou."],
  },
  // JOÃO: equipes, prêmio e falas são provisórios (só para dar para jogar de ponta a ponta).
  // Pode trocar tudo; o teste data/trainers.test.ts avisa se uma espécie ou nível não existir.
  r3_nara: {
    id: "r3_nara",
    name: "Campista Nara",
    team: [
      { species: "pidgeotto", level: 14, alternatives: ["staravia"] },
      { species: "bidoof", level: 13, alternatives: ["pachirisu"] },
    ],
    reward: 420,
    intro: ["Opa! Treinador novo na Rota 3?", "Vamos ver se você chega inteiro em Verdelume."],
    defeat: ["Tá bom, tá bom... você chega."],
    after: ["Dizem que em Verdelume tem um Dojo. Prepare um time que aguenta pancada."],
  },
  r3_bel: {
    id: "r3_bel",
    name: "Andarilha Bel",
    team: [
      { species: "poochyena", level: 13, alternatives: ["bidoof"] },
      { species: "mightyena", level: 15 },
    ],
    reward: 450,
    intro: ["Ei! Você passou na minha frente.", "Aqui a regra é simples: cruzou o olhar, tem batalha."],
    defeat: ["Hm. Você é dos bons."],
    after: ["Ando por esta rota faz anos. Nunca vi tanto caminhão da Thomas por aqui."],
  },
  r3_teo: {
    id: "r3_teo",
    name: "Corredor Téo",
    team: [
      { species: "pikachu", level: 14, alternatives: ["pachirisu"] },
      { species: "staravia", level: 15, alternatives: ["pidgeotto"] },
    ],
    reward: 480,
    intro: ["Treino de velocidade! Bora ver quem é mais rápido!"],
    defeat: ["Você foi mais rápido... dessa vez."],
    after: ["Verdelume fica logo ali em cima. Corre!"],
  },
  v_gym_igor: {
    id: "v_gym_igor",
    name: "Faixa-Branca Igor",
    team: [
      { species: "bidoof", level: 15 },
      { species: "combusken", level: 16 },
    ],
    reward: 500,
    background: "gym",
    intro: ["Primeiro tatame. Mostre a sua postura!"],
    defeat: ["Uff. A cerca do próximo tatame já abriu."],
    after: ["Postura primeiro, golpe depois."],
  },
  v_gym_ana: {
    id: "v_gym_ana",
    name: "Faixa-Amarela Ana",
    team: [
      { species: "pikachu", level: 16 },
      { species: "combusken", level: 16 },
    ],
    reward: 550,
    background: "gym",
    intro: ["Segundo tatame. Daqui para frente ninguém pega leve!"],
    defeat: ["Pode passar. O Líder está esperando."],
    after: ["Respira fundo antes da última luta."],
  },
  // JOÃO: o líder ainda não tem nome; troque o "name" e as falas. Tipo do ginásio: Lutador.
  leader_verdelume: {
    id: "leader_verdelume",
    name: "Líder do Dojo",
    team: [
      { species: "mightyena", level: 18 },
      { species: "bibarel", level: 18 },
      { species: "combusken", level: 20 },
    ],
    reward: 1200,
    background: "gym",
    intro: ["Bem-vindo ao Dojo de Verdelume.", "Aqui a gente treina corpo e cabeça. Valendo a Insígnia Punho!"],
    defeat: ["...Belo combate. Você mereceu."],
    after: ["Treine todo dia. A força vem da rotina."],
  },
};

/** Varia os treinadores comuns; membros sem alternativas ficam garantidos. */
export function rollTrainerTeam(trainer: TrainerDef, rng: Rng = defaultRng): { species: string; level: number }[] {
  return trainer.team.map((member) => {
    const pool = [member.species, ...(member.alternatives ?? [])];
    return { species: pool.length === 1 ? member.species : pool[Math.floor(rng() * pool.length)], level: member.level };
  });
}
