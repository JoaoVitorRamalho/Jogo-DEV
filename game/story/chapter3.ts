import { ITEMS, type ItemId } from "@/data/items";
import { NPCS } from "@/data/npcs";
import { TRAINERS } from "@/data/trainers";
import { ask, useUi } from "@/game/core/ui";
import { world } from "@/game/phaser/bridge";
import { giveItem, useGame } from "@/game/state/store";
import { autosave, flag, giveOnce, healAtHome, hero, line, setFlag, state, talk, think, trainerBattle } from "@/game/story/actions";
import { playSfx } from "@/lib/audio/engine";

/**
 * Capítulo 3: Rota 3 e Cidade Verdelume (o Dojo).
 *
 * O PALCO JÁ ESTÁ PRONTO: mapas, NPCs, treinadores, mato alto, cura, loja, as cercas do Dojo
 * e a Insígnia Punho funcionam. Falta a história. Toda fala daqui é provisória, curta e neutra,
 * só para dar para jogar de ponta a ponta. Procure "JOÃO:" para achar onde escrever.
 * Guia passo a passo: docs/CAP3-JOAO.md
 *
 * Como o capítulo anda hoje (flags em ordem; a missão em data/quests.ts segue a mesma lista):
 *   ch3_started / ch3_road_open  os operários liberam a saída norte de Ferrúria
 *   r3_seen                      primeira vez na Rota 3
 *   ch3_thomas_stand             falou com o posto do Grupo Thomas na Rota 3
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

/** Saída norte de Ferrúria: com o capítulo 2 fechado, os operários liberam a estrada. */
async function roadOpen(): Promise<void> {
  // JOÃO: a abertura do capítulo 3. Quem libera a estrada, por quê, se alguém aparece (Gael? Thomas?).
  await talk(who("worker_a"), "Pode passar. A estrada para Verdelume abriu.", "O Grupo Thomas montou um posto na Rota 3.");
  setFlag("ch3_started");
  setFlag("ch3_road_open");
  world().refreshNpcs();
  await goal("Siga pela Rota 3 até a Cidade Verdelume, ao norte.");
  autosave();
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
  await think("Verdelume. Dizem que aqui todo mundo treina.");
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
  worker_a: roadOpen,
  worker_b: roadOpen,
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
  v_center_desk: nurse,
  v_mart_desk: shop,
};

/** Quem aparece no mapa. Sem regra aqui = sempre visível. */
export const CH3_VISIBLE: Record<string, () => boolean> = {
  worker_a: () => !flag("ch3_road_open"),
  worker_b: () => !flag("ch3_road_open"),
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
  if (key === "route3" && !flag("r3_seen")) {
    setFlag("r3_seen");
    useUi.getState().showToast("Rota 3");
    // JOÃO: a primeira impressão da Rota 3.
    await think("A estrada nova. A obra do Grupo Thomas chega até aqui.");
  }
  if (key === "verdelume" && !flag("ch3_arrived")) {
    useUi.getState().showToast("Cidade Verdelume");
    await arrival();
  }
}

/** Pode passar por essa porta ou saída? null = o capítulo 3 não tem opinião. */
export async function ch3CanWarp(from: string, to: string): Promise<boolean | null> {
  if (from === "ferruria" && to === "route3") return flag("ch3_road_open");
  if (from === "verdelume" && to === "verdelume_gym") return gymGate();
  return null;
}
