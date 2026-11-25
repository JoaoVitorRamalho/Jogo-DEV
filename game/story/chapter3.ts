import { ITEMS, type ItemId } from "@/data/items";
import { NPCS } from "@/data/npcs";
import { TRAINERS } from "@/data/trainers";
import { ask, useUi } from "@/game/core/ui";
import { world } from "@/game/phaser/bridge";
import { giveItem, useGame } from "@/game/state/store";
import { autosave, flag, giveOnce, healAtHome, hero, line, setFlag, state, talk, think, trainerBattle } from "@/game/story/actions";
import { playCry, playSfx } from "@/lib/audio/engine";

/**
 * Capítulo 3: Rota 3 e Cidade Verdelume (o Dojo).
 *
 * Abertura jogável: bosque, Rota 3, Galeria do Eco e resgate do Bidoof de Nádia.
 * Os uniformizados são a Rocket reorganizada; sua identidade completa e os chefes
 * permanecem em segredo. Campo e Dojo ainda têm falas provisórias marcadas com JOÃO.
 * Guia passo a passo: docs/CAP3-JOAO.md
 *
 * Como o capítulo anda hoje (flags em ordem; a missão em data/quests.ts segue a mesma lista):
 *   ch3_started                 os operários apontam o desvio pelo bosque
 *   ch3_grove_entered           atravessou o Bosque do Orvalho
 *   r3_seen                      primeira vez na Rota 3
 *   ch3_thomas_stand             falou com o posto do Grupo Thomas na Rota 3
 *   ch3_cave_help                aceitou ajudar Nádia a encontrar Bidoof
 *   beat_rocket_echo_1 / _2 / _lead  venceu os confrontos na galeria
 *   ch3_machine_off / ch3_bidoof_safe  abriu o cercado e retirou Bidoof
 *   ch3_cave_rescued / ch3_road_open   voltou a Nádia e liberou a estrada
 *   ch3_arrived                  chegou a Verdelume
 *   ch3_field                    conheceu o Campo de treinamento
 *   beat_v_gym_igor / _ana       venceu os faixas do Dojo (cada vitória abre uma cerca)
 *   beat_leader_verdelume        venceu o Líder do Dojo (ganha a Insígnia Punho)
 *   chapter3_complete            fim do capítulo
 */

const BADGE = "punho";
const shownGoals = new Set<string>();

/** Objetivo na tela (cada texto aparece uma vez só). */
async function goal(text: string): Promise<void> {
  useUi.getState().setHint(null);
  if (shownGoals.has(text)) return;
  shownGoals.add(text);
  await talk(undefined, text);
}

function badge(): boolean {
  return state().badges.includes(BADGE);
}

/** O capítulo 3 começa quando o 2 termina (a conversa com os operários depois do Gael). */
export function ch3(): boolean {
  return flag("chapter2_complete");
}

/** Nome que aparece na caixa de fala: vem do data/npcs.ts (troque o nome lá). */
function who(id: string): string {
  return NPCS[id]?.name ?? id;
}

/** NPC que só fala (sem cena). JOÃO: a maioria das falas do capítulo está nessas linhas. */
function say(id: string, ...lines: string[]): () => Promise<void> {
  return async () => {
    await talk(who(id), ...lines);
  };
}

/** Treinador que também luta quando você fala com ele. A vitória pode abrir uma cerca. */
function fight(trainer: string, npc: string): () => Promise<void> {
  return async () => {
    await trainerBattle(trainer, npc);
    world().refreshNpcs();
  };
}

/** Item no chão (a Pokébola do mapa some depois de pegar). */
function pickup(flagId: string, item: ItemId, count = 1): () => Promise<void> {
  return async () => {
    if (await giveOnce(flagId, item, count)) world().refreshNpcs();
  };
}

// ---------- cenas ----------

/** Liberação da estrada após o resgate; saves já em Verdelume conservam o acesso. */
export function openingCleared(): boolean {
  // Quem já chegou à cidade na versão anterior pode continuar o save normalmente.
  return flag("ch3_cave_rescued") || flag("ch3_arrived") || flag("chapter3_complete");
}

export async function startOpening(): Promise<void> {
  if (openingCleared()) {
    setFlag("ch3_road_open");
    world().refreshNpcs();
    await talk("Operário", "A estrada principal já está liberada. Verdelume fica ao norte.");
    return;
  }
  if (flag("ch3_started")) {
    await talk("Operário", "O desvio fica no Bosque do Orvalho. Saia de Ferrúria pelo sul e procure o guarda na parte leste da Rota 2.");
    return;
  }
  await talk("Operário", "A passagem principal ainda está fechada. Mas há um desvio pelo Bosque do Orvalho, ao sul da cidade.", "A sua insígnia serve de autorização. Fale com o guarda na parte leste da Rota 2.");
  await talk(hero(), "O desvio chega a Verdelume?");
  await talk("Operário", "Sai na Rota 3. Uma pesquisadora passou por lá de manhã... depois vieram uns estrondos da galeria.");
  await think("O mesmo bosque onde os Pokémon se esconderam. Será que o frio chegou até lá?");
  setFlag("ch3_started");
  await talk(undefined, "Capítulo 3 — Ecos sob a Pedra.");
  await goal("Saia de Ferrúria pelo sul. Na parte leste da Rota 2, peça ao guarda a entrada no Bosque do Orvalho e siga a trilha ao fundo.");
  autosave();
}

async function groveGuard(): Promise<void> {
  if (!flag("ch3_started")) await startOpening();
  if (!flag("r2_grove_open")) {
    await talk("Guarda Nuno", "A Insígnia Casulo! Pode passar. Siga a estrada à direita desta clareira: ela entra por uma abertura entre as árvores e leva ao bosque.");
    setFlag("r2_grove_open");
    world().refreshNpcs();
  } else await talk("Guarda Nuno", "A passagem entre as árvores, no fim da estrada à direita, leva ao bosque. Atravesse a trilha para chegar à Rota 3; a Guarda Inês está por lá.");
  autosave();
}

async function researcher(): Promise<void> {
  const name = who("echo_researcher");
  if (flag("ch3_bidoof_safe") && !flag("ch3_cave_rescued")) {
    await talk(name, "Bidoof! Você trouxe ele de volta...");
    playCry("bidoof");
    await talk("Bidoof", "Bii-doof!");
    await talk(hero(), "Eles estavam usando uma máquina perto das rochas. Prenderam ele atrás de uma cerca.");
    await talk(name, "Então ele foi atrás de mim até o fundo... Sou Nádia, trabalho com a professora Celina.", "Ela me pediu para verificar o frio que apareceu na floresta. Encontrei gente recolhendo fragmentos na galeria.");
    await talk(hero(), "Um deles fugiu com uma caixa. Os uniformes tinham uma marca vermelha, mas não deu para ler.");
    await talk(name, "Vou levar o que anotei para Celina. Precisamos descobrir o que aquela máquina fez com os Pokémon.");
    await healAtHome();
    await giveOnce("ch3_rescue_reward", "super_potion", 2, name);
    setFlag("ch3_cave_rescued");
    setFlag("ch3_road_open");
    world().refreshNpcs();
    await talk(name, "Avisei a guarda pelo rádio. A passagem principal de Ferrúria já pode abrir.", "Você falou em Verdelume, não foi? Continue pela trilha ao norte. E obrigada por não deixar meu parceiro para trás.");
    await goal("Siga para o norte da Rota 3 e entre em Verdelume. A passagem principal de Ferrúria também está liberada.");
    autosave();
    return;
  }
  if (!flag("ch3_cave_help")) {
    await world().emote("echo_researcher", "!");
    await talk(name, "Ei... você veio de Ferrúria? Preciso de ajuda.", "Meu Bidoof ficou na galeria. Há pessoas lá dentro, com máquinas. Quando tentei chegar perto, me mandaram sair.");
    await talk(hero(), "Seu Pokémon ficou com eles?");
    await talk(name, "Ele correu atrás de mim. Na confusão, perdi ele de vista e torci o pé na descida.", "Não consigo atravessar tudo de novo assim. Você pode trazer meu parceiro?");
    await think("Eu precisava continuar a viagem. Mas não vou deixar um Pokémon preso ali.");
    await talk(hero(), "Eu vou procurar. Fique perto da entrada.");
    setFlag("ch3_cave_help");
  } else await talk(name, flag("ch3_cave_rescued") ? "Bidoof e eu estamos bem. Se precisar descansar, ainda tenho suprimentos." : "Bidoof continua lá dentro. A entrada fica logo acima de mim. Posso cuidar da sua equipe antes de você entrar.");
  const heal = await ask(["Sim, por favor", "Agora não"], line(name, "Quer recuperar a equipe?"), 1);
  if (heal === 0) {
    await healAtHome();
    setFlag("ch3_camp");
    await talk(name, "Pronto. Se precisar recuar, este acampamento está seguro.");
  }
  if (!flag("ch3_cave_rescued")) await goal("Entre na Galeria do Eco, acima do acampamento, e encontre o Bidoof de Nádia.");
  autosave();
}

async function caveFight(trainer: string, npc: string): Promise<void> {
  if (flag(`beat_${trainer}`)) return;
  const won = await trainerBattle(trainer, npc);
  if (!won || world().mapKey() !== "echo_cave") return;
  if (npc === "echo_lead") {
    await talk("Encarregado", "Levem a amostra. Agora. O resto fica.");
    await talk(undefined, "Passos desaparecem por uma passagem estreita. O encarregado recua atrás da carga.");
    await think("Uma costura vermelha no punho... parecia parte de um R.");
  }
  world().refreshNpcs();
  await goal(npc === "echo_lead" ? "Desligue o painel a leste do cercado para libertar Bidoof." : "Continue pela galeria. Os ruídos vêm da sala mais ao norte.");
  autosave();
}

async function stopMachine(): Promise<void> {
  if (flag("ch3_machine_off")) { await talk(undefined, "A máquina está desligada. O frio começa a diminuir."); return; }
  if (!flag("beat_rocket_echo_lead")) { await think("O encarregado está vigiando os controles. Primeiro preciso afastá-lo."); return; }
  await talk(undefined, "As luzes do painel pulsam fora de ritmo. Um botão vermelho indica a alimentação do cercado.");
  if ((await ask(["Desligar", "Voltar"], line(undefined, "Interromper a máquina?"), 1)) !== 0) return;
  await world().flash(0xb8b0f0);
  playSfx("confirm");
  setFlag("ch3_machine_off");
  world().refreshNpcs();
  await talk(undefined, "O motor para. A trava do cercado se abre, e o eco da galeria volta a ser só água caindo.");
  await goal("Aproxime-se de Bidoof, dentro do cercado, e aperte Z para ajudá-lo a sair.");
  autosave();
}

async function rescueBidoof(): Promise<void> {
  if (flag("ch3_bidoof_safe")) return;
  if (!flag("ch3_machine_off")) { await talk(undefined, "Bidoof se encolhe atrás da cerca. O painel ao lado controla a trava."); return; }
  playCry("bidoof");
  await talk("Bidoof", "Bii... doof!");
  await talk(hero(), "Calma. A Nádia está te esperando lá fora.");
  await talk(undefined, "Bidoof se aproxima e acompanha você até um trecho seguro da entrada.");
  setFlag("ch3_bidoof_safe");
  world().refreshNpcs();
  await goal("Volte ao acampamento da entrada e entregue Bidoof à pesquisadora Nádia.");
  autosave();
}

export async function ch3Event(id: string): Promise<boolean | null> {
  const challenges: Record<string, [string, string]> = {
    echo_grunt_1_challenge: ["rocket_echo_1", "echo_grunt_1"],
    echo_grunt_2_challenge: ["rocket_echo_2", "echo_grunt_2"],
    echo_lead_challenge: ["rocket_echo_lead", "echo_lead"],
  };
  const challenge = challenges[id];
  if (!challenge) return null;
  await caveFight(...challenge);
  return false;
}

/** O posto patrocinado do Grupo Thomas na entrada da Rota 3. */
async function thomasStand(): Promise<void> {
  // JOÃO: o primeiro contato do capítulo com o Grupo Thomas (brinde, panfleto, recrutamento).
  await talk(who("thomas_promoter"), "Bem-vindo ao posto do Grupo Thomas!", "Os eventos de Verdelume são patrocinados por nós.");
  await giveOnce("r3_thomas_gift", "potion", 2, who("thomas_promoter"));
  setFlag("ch3_thomas_stand");
}

/** Primeira vez em Verdelume. */
async function arrival(): Promise<void> {
  setFlag("ch3_arrived");
  // JOÃO: a chegada (quem recebe, o que se vê primeiro, qual é o objetivo).
  await think("Depois daquela caverna... uma cidade cheia de gente. Preciso recuperar a equipe e seguir pelas insígnias.");
  await talk(undefined, "Faixas azuis anunciam o Campo de treinamento: patrocínio do Grupo Thomas.");
  if (flag("ch3_cargo_seen")) await think("O desenho dos caixotes da galeria parecia com esses. Pode ser só o mesmo fornecedor... Celina precisa ver aquilo.");
  await goal("Conheça o Campo de treinamento, a sudeste, e o Dojo, a noroeste.");
  autosave();
}

/** Campo de treinamento (patrocinado pelo Grupo Thomas). */
async function coach(): Promise<void> {
  // JOÃO: o que acontece no Campo (o recrutamento de jovens treinadores pelo Thomas).
  await talk(who("v_coach"), "Este é o Campo de treinamento de Verdelume.", "O equipamento é do Grupo Thomas. Os melhores alunos vão para os eventos deles.");
  if (flag("ch3_field")) return;
  setFlag("ch3_field");
  await goal("Agora o Dojo: a porta fica a noroeste da praça.");
  autosave();
}

async function nurse(): Promise<void> {
  const name = who("v_nurse");
  await talk(name, "Bem-vindo ao Centro de Cura de Verdelume.", "Quer que eu cuide dos seus Pokémon?");
  const choice = await ask(["Sim, por favor", "Agora não"], line(name, "Fica pronto num instante."), 1);
  if (choice !== 0) {
    await talk(name, "Tudo bem. Estamos sempre aqui.");
    return;
  }
  await world().flash(0xffffff);
  await healAtHome();
  await talk(name, "Prontinho! A equipe está novinha em folha.");
  if (!flag("ch3_center")) {
    setFlag("ch3_center");
    await talk(name, "Se alguma batalha der errado, a gente traz você para cá.");
  }
}

async function shop(): Promise<void> {
  // JOÃO: o estoque da loja de Verdelume (ids em data/items.ts).
  const stock: ItemId[] = ["potion", "super_potion", "pokeball", "greatball", "antidote", "paralyze_heal", "awakening", "burn_heal"];
  const name = who("v_shop");
  await talk(name, "Bem-vindo! O que vai ser?");
  for (;;) {
    const options = [...stock.map((id) => `${ITEMS[id].name} — ₽${ITEMS[id].price}`), "Sair"];
    const choice = await ask(options, line(name, `Você tem ₽${state().money}. O que vai levar?`), options.length - 1);
    if (choice >= stock.length) break;
    const item = stock[choice];
    const amount = await ask(["1", "5", "10", "Voltar"], line(name, `${ITEMS[item].name}. Quantos?`), 3);
    if (amount === 3) continue;
    const count = [1, 5, 10][amount];
    const price = ITEMS[item].price * count;
    if (state().money < price) {
      await talk(name, "Não fecha a conta. Tente uma quantidade menor.");
      continue;
    }
    useGame.getState().update((s) => {
      s.money -= price;
      giveItem(s, item, count);
    });
    playSfx("confirm");
    await talk(name, count > 1 ? `${count}× ${ITEMS[item].name}. Volte sempre!` : `Aqui está: ${ITEMS[item].name}.`);
  }
  await talk(name, "Boa jornada!");
}

/**
 * Pode entrar no Dojo? Hoje entra direto.
 * JOÃO: para exigir algo antes, troque o corpo por, por exemplo:
 *   if (!flag("ch3_field")) { await think("Primeiro o Campo de treinamento."); return false; }
 *   return true;
 */
async function gymGate(): Promise<boolean> {
  return true;
}

async function gymGuide(): Promise<void> {
  if (badge()) {
    await talk(who("v_gym_guide"), "A Insígnia Punho! Muito bem.");
    return;
  }
  // JOÃO: a dica do guia sobre o Dojo e o tipo Lutador.
  await talk(who("v_gym_guide"), "Este é o Dojo de Verdelume, ginásio do tipo Lutador.", "Cada tatame tem um faixa. Vença e a cerca abre.");
}

/** Líder do Dojo: luta, Insígnia Punho e o fim do capítulo. */
async function leader(): Promise<void> {
  if (badge()) {
    await talk(who("v_leader"), ...TRAINERS.leader_verdelume.after);
    return;
  }
  // JOÃO: a conversa antes da luta (quem é o líder, o que ele acha do Grupo Thomas).
  const won = await trainerBattle("leader_verdelume", "v_leader");
  if (!won) return;
  useGame.getState().update((s) => {
    if (!s.badges.includes(BADGE)) s.badges.push(BADGE);
  });
  playSfx("discover");
  await world().flash(0xffe28a);
  await talk(undefined, `${hero()} recebeu a Insígnia Punho!`);
  await giveOnce("v_leader_gift", "super_potion", 2, who("v_leader"));
  await chapterEnd();
}

/** Fim do capítulo 3. JOÃO: o fechamento (rival, Grupo Thomas, o gancho para Porto Coral). */
async function chapterEnd(): Promise<void> {
  if (flag("chapter3_complete")) return;
  setFlag("chapter3_complete");
  await talk(undefined, "Capítulo 3 concluído.");
  useUi.getState().setHint(null);
  autosave();
}

// ---------- falas, placas e visibilidade ----------

/** Fala de cada NPC (a chave é o id do NPC no mapa e no data/npcs.ts). */
export const CH3_TALK: Record<string, () => Promise<void>> = {
  // Ferrúria (já existiam no capítulo 2; essa fala só vale depois que ele termina)
  worker_a: startOpening,
  worker_b: startOpening,
  ranger_r2: groveGuard,
  echo_scout: say("echo_scout", "A vegetação está fria até no sol. Não encoste nas folhas brancas.", "A trilha ao norte sai na Rota 3. Vi uma pesquisadora seguindo para a galeria no mirante leste."),
  echo_researcher: researcher,
  echo_grunt_1: () => caveFight("rocket_echo_1", "echo_grunt_1"),
  echo_grunt_2: () => caveFight("rocket_echo_2", "echo_grunt_2"),
  echo_lead: () => caveFight("rocket_echo_lead", "echo_lead"),
  echo_bidoof: rescueBidoof,
  echo_bidoof_home: async () => { playCry("bidoof"); await talk("Bidoof", "Bii-doof!"); },
  echo_cage: async () => { await think("Uma trava elétrica. O controle fica na parede a leste."); },
  item_echo_grove: pickup("ch3_grove_item", "super_potion"),
  item_echo_cave: pickup("ch3_cave_item", "greatball", 2),
  // Rota 3
  thomas_promoter: thomasStand,
  r3_worker: say("r3_worker", "A estrada é nova. Ainda tem obra aqui e ali."),
  r3_fisher: say("r3_fisher", "Shhh. Os peixes estão quase mordendo."),
  r3_hiker: say("r3_hiker", "Do alto da trilha dá para ver Verdelume inteira."),
  r3_trainer_1: fight("r3_nara", "r3_trainer_1"),
  r3_trainer_2: fight("r3_bel", "r3_trainer_2"),
  r3_trainer_3: fight("r3_teo", "r3_trainer_3"),
  item_r3_west: pickup("r3_item_west", "super_potion"),
  item_r3_east: pickup("r3_item_east", "greatball", 2),
  // Verdelume
  v_gate_a: say("v_gate_a", "A saída norte está fechada por enquanto."),
  v_gate_b: say("v_gate_b", "Ordens de cima. Ninguém passa."),
  v_local: say("v_local", "Desde que o Grupo Thomas chegou, a cidade vive cheia."),
  v_kid: say("v_kid", "Quando eu crescer, vou treinar no Dojo!"),
  v_elder: say("v_elder", "No meu tempo, o Dojo bastava. Não tinha patrocínio nenhum."),
  gael_verdelume: say("gael_verdelume", "..."),
  v_recruiter: say("v_recruiter", "Treinador novo? O Grupo Thomas está procurando talentos.", "Passe no Campo e mostre o que sabe."),
  v_coach: coach,
  v_trainee_a: say("v_trainee_a", "Mais dez voltas no campo..."),
  v_trainee_b: say("v_trainee_b", "Se eu for bem, me chamam para o evento!"),
  item_v_field: pickup("v_item_field", "rare_candy"),
  // Interiores de Verdelume
  v_nurse: nurse,
  v_center_visitor: say("v_center_visitor", "Vim de longe só para ver o Dojo."),
  v_shop: shop,
  v_mart_customer: say("v_mart_customer", "Antes do Dojo, compre muita Poção."),
  v_family_a: say("v_family_a", "Fique à vontade. Aqui todo mundo é recebido."),
  v_family_b: say("v_family_b", "Meu irmão foi chamado para o Campo de treinamento!"),
  // Dojo
  v_gym_guide: gymGuide,
  v_gym_trainer_1: fight("v_gym_igor", "v_gym_trainer_1"),
  v_gym_trainer_2: fight("v_gym_ana", "v_gym_trainer_2"),
  v_bar_1: async () => { await think("Uma cerca. O faixa deste tatame decide quem passa."); },
  v_bar_2: async () => { await think("Outra cerca. Falta vencer o faixa deste tatame."); },
  v_leader: leader,
};

/** Placas (texto). {nome} vira o nome do jogador. */
export const CH3_SIGNS: Record<string, string[]> = {
  sign_echo_grove: ["Bosque do Orvalho.", "Norte: trilha para a Rota 3. Sul: retorno à Rota 2 e Ferrúria."],
  echo_frost: ["As folhas estão esbranquiçadas. A terra, úmida e gelada.", "Há marcas recentes de botas seguindo para o norte."],
  sign_route3: ["Rota 3.", "Norte: Cidade Verdelume. Sul: Cidade Ferrúria."],
  sign_r3_thomas: ["POSTO DO GRUPO THOMAS.", "Patrocinador oficial dos eventos de Verdelume."],
  sign_r3_view: ["Mirante da Rota 3."],
  sign_r3_north: ["Cidade Verdelume logo à frente."],
  sign_verdelume: ["Cidade Verdelume.", "A cidade dos treinos."],
  sign_v_gym: ["Dojo de Verdelume — tipo Lutador.", "Líder: ainda sem nome."],
  sign_v_center: ["Centro de Cura.", "Cura gratuita para a sua equipe."],
  sign_v_mart: ["Loja de Verdelume."],
  sign_v_field: ["Campo de treinamento.", "Patrocínio: Grupo Thomas."],
  sign_v_north: ["Saída norte: fechada."],
  v_house_locked: ["A porta está trancada."],
  v_house_locked_2: ["A porta está trancada."],
  v_house_locked_3: ["A porta está trancada."],
  v_house_locked_4: ["Ninguém em casa."],
  v_house_locked_5: ["A porta está trancada."],
  v_house_locked_6: ["Ninguém em casa."],
};

/** Placas que abrem uma ação (o balcão chama a enfermeira ou a loja). */
export const CH3_SIGN_RUN: Record<string, () => Promise<void>> = {
  echo_console: stopMachine,
  echo_crates: async () => {
    await talk(undefined, "Caixotes novos, cobertos de pó de rocha. Alguém raspou o selo de transporte.", "Na lateral ainda se lê: Lote 03. O material recolhido não está mais aqui.");
    setFlag("ch3_cargo_seen");
  },
  v_center_desk: nurse,
  v_mart_desk: shop,
};

/** Quem aparece no mapa. Sem regra aqui = sempre visível. */
export const CH3_VISIBLE: Record<string, () => boolean> = {
  worker_a: () => !openingCleared(),
  worker_b: () => !openingCleared(),
  echo_grunt_1: () => !flag("beat_rocket_echo_1"),
  echo_grunt_2: () => !flag("beat_rocket_echo_2"),
  echo_lead: () => !flag("beat_rocket_echo_lead"),
  echo_cage: () => !flag("ch3_machine_off"),
  echo_bidoof: () => !flag("ch3_bidoof_safe"),
  echo_bidoof_home: () => flag("ch3_bidoof_safe"),
  item_echo_grove: () => !flag("ch3_grove_item"),
  item_echo_cave: () => !flag("ch3_cave_item"),
  item_r3_west: () => !flag("r3_item_west"),
  item_r3_east: () => !flag("r3_item_east"),
  item_v_field: () => !flag("v_item_field"),
  // As cercas do Dojo somem quando o faixa daquele tatame perde.
  v_bar_1: () => !flag("beat_v_gym_igor"),
  v_bar_2: () => !flag("beat_v_gym_ana"),
  // JOÃO: os vigias da saída norte saem no capítulo 4 (troque por uma flag).
  v_gate_a: () => true,
  v_gate_b: () => true,
  // JOÃO: o Gael em Verdelume. Escondido; mostre com uma flag quando a cena dele existir.
  gael_verdelume: () => false,
};

/**
 * A fala do capítulo 3 vale para esse NPC? Os NPCs novos usam sempre; os que já existiam
 * (os operários de Ferrúria) só depois do fim do capítulo 2.
 */
export function ch3Talk(id: string, knownBefore: boolean): (() => Promise<void>) | undefined {
  const run = CH3_TALK[id];
  if (!run) return undefined;
  return !knownBefore || ch3() ? run : undefined;
}

/** Ao entrar num mapa. */
export async function ch3Enter(key: string): Promise<void> {
  if (key === "echo_grove" && !flag("ch3_grove_entered")) {
    setFlag("ch3_started");
    setFlag("ch3_grove_entered");
    await talk(undefined, "Bosque do Orvalho.");
    await think("As folhas brancas de novo. Aqui também está frio demais.");
    await goal("Atravesse o bosque pela trilha ao norte para alcançar a Rota 3.");
    autosave();
  }
  if (key === "route3" && !flag("r3_seen")) {
    setFlag("r3_seen");
    useUi.getState().showToast("Rota 3");
    // JOÃO: a primeira impressão da Rota 3.
    await think("Marcas de rodas... e um barulho vindo das pedras, a leste.");
    await goal("Siga pela Rota 3. Procure a pesquisadora no mirante leste, perto da entrada da galeria.");
    autosave();
  }
  if (key === "echo_cave") {
    const objective = flag("ch3_bidoof_safe") ? "Volte ao acampamento e encontre Nádia." : flag("ch3_machine_off") ? "O cercado está aberto. Vá até Bidoof e aperte Z." : flag("beat_rocket_echo_lead") ? "O painel que abre o cercado está na parede a leste." : "Procure Bidoof nas salas ao norte da galeria.";
    if (!flag("ch3_cave_entered")) {
      await think("Tem gente trabalhando lá no fundo. E um som de motor... não parece uma escavação comum.");
      setFlag("ch3_cave_entered");
    }
    await goal(objective);
  }
  if (key === "verdelume" && !flag("ch3_arrived")) {
    useUi.getState().showToast("Cidade Verdelume");
    await arrival();
  }
}

/** Pode passar por essa porta ou saída? null = o capítulo 3 não tem opinião. */
export async function ch3CanWarp(from: string, to: string): Promise<boolean | null> {
  if (to === "echo_grove" && from === "route2") {
    if (!flag("r2_grove_open")) {
      await think("Esta é a entrada do Bosque do Orvalho. Preciso falar com o Guarda Nuno, perto da placa ao sul desta clareira, para liberar a passagem.");
      return false;
    }
    if (!ch3()) {
      await think("Antes de seguir para a Rota 3, preciso voltar a Ferrúria e falar com os operários na saída norte da cidade.");
      return false;
    }
    return true;
  }
  if (from === "echo_grove" && to === "route3") return ch3();
  if (from === "ferruria" && to === "route3") {
    if (openingCleared()) return true;
    if (ch3()) await startOpening();
    return false;
  }
  if (from === "route3" && to === "echo_cave" && !flag("ch3_cave_help") && !openingCleared()) {
    await think("A pesquisadora ao lado da entrada está pedindo ajuda. Melhor falar com ela primeiro.");
    return false;
  }
  if (from === "route3" && to === "verdelume" && !openingCleared()) {
    await think("Ainda preciso ajudar Nádia. A galeria fica no mirante a leste da Rota 3.");
    return false;
  }
  if (from === "verdelume" && to === "verdelume_gym") return gymGate();
  return null;
}
