/** Capítulo 2 — Ninho de Seda. Rota 2, Ferrúria, a floresta inquieta e o primeiro ginásio. */
import { ITEMS, type ItemId } from "@/data/items";
import { ask, useUi } from "@/game/core/ui";
import { world } from "@/game/phaser/bridge";
import { giveItem, useGame } from "@/game/state/store";
import { autosave, flag, giveOnce, healAtHome, hero, line, setFlag, spottedBy, state, talk, think, trainerBattle } from "@/game/story/actions";
import { playSfx } from "@/lib/audio/engine";

const BADGE = "casulo";
const shownGoals = new Set<string>();

async function goal(text: string): Promise<void> {
  useUi.getState().setHint(null);
  if (shownGoals.has(text)) return;
  shownGoals.add(text);
  await talk(undefined, text);
}

function badge(): boolean {
  return state().badges.includes(BADGE);
}

/** Capítulo 2 em andamento: chegou a Ferrúria depois de se despedir de casa. */
function ch2(): boolean {
  return flag("ch2_started");
}

// ---------- cenas ----------

async function arrival(): Promise<void> {
  setFlag("ch2_started");
  const w = world();
  await w.emote("gael_ferruria", "!");
  await w.moveNpc("gael_ferruria", ["down", "down"]);
  w.faceNpcToPlayer("gael_ferruria");
  await talk("Gael", `${hero()}! Até que enfim. O Pikachu e eu chegamos faz tempo.`);
  await talk(hero(), "Você veio direto pela Rota 2?");
  await talk("Gael", "Pelo caminho do leste. Cheio de treinador. Ganhei de todos... quase todos.", "Olha só, já conheci a cidade inteira. Vou te passar o mapa de cabeça:");
  await talk("Gael", "Telhado vermelho é o Centro de Cura. Cura a sua equipe de graça.", "Telhado azul é a loja do Seu Joca. Poção, Pokébola, essas coisas.", "E o verde, lá em cima à esquerda, é o ginásio da Cora. Tipo Inseto.");
  await talk(hero(), "E você já ganhou a insígnia?");
  await talk("Gael", "Ainda não. O ginásio está fechado. Dizem que a líder sumiu para dentro da floresta.", "Os Pokémon de lá estão fugindo, e ninguém sabe por quê.");
  await w.emote("gael_ferruria", "...");
  await talk("Gael", "Vou treinar um pouco. Quando ela voltar, quem chegar primeiro leva!");
  await w.moveNpc("gael_ferruria", ["up", "up", "up", "up", "up"]);
  w.setNpcVisible("gael_ferruria", false);
  await goal("O Centro de Cura e a loja ficam na rua de cima. Para desafiar o ginásio, procure Cora na clareira central da Floresta de Aster, ao sul da Rota 2.");
  autosave();
}

async function nurse(): Promise<void> {
  await talk("Enfermeira Íris", "Bem-vindo ao Centro de Cura de Ferrúria.", "Quer que eu cuide dos seus Pokémon?");
  const choice = await ask(["Sim, por favor", "Agora não"], line("Enfermeira Íris", "Fica pronto num instante."), 1);
  if (choice !== 0) {
    await talk("Enfermeira Íris", "Tudo bem. Estamos sempre aqui.");
    return;
  }
  await world().flash(0xffffff);
  await healAtHome();
  await talk("Enfermeira Íris", "Prontinho! A equipe está novinha em folha.");
  if (!flag("ch2_center")) {
    setFlag("ch2_center");
    await talk("Enfermeira Íris", "Se alguma batalha der errado, a gente te traz para cá. Este é o seu ponto de volta agora.");
  }
}

async function shop(): Promise<void> {
  const stock: ItemId[] = ["potion", "super_potion", "pokeball", "greatball", "antidote", "paralyze_heal", "awakening", "burn_heal"];
  await talk("Seu Joca", badge() ? "A campeã do ginásio! Hoje tem desconto de sorriso." : "Bem-vindo à loja do Joca! O que vai ser?");
  for (;;) {
    const options = [...stock.map((id) => `${ITEMS[id].name} — ₽${ITEMS[id].price}`), "Sair"];
    const choice = await ask(options, line("Seu Joca", `Você tem ₽${state().money}. O que vai levar?`), options.length - 1);
    if (choice >= stock.length) break;
    const item = stock[choice];
    const amount = await ask(["1", "5", "10", "Voltar"], line("Seu Joca", `${ITEMS[item].name}. Quantos?`), 3);
    if (amount === 3) continue;
    const count = [1, 5, 10][amount];
    const price = ITEMS[item].price * count;
    if (state().money < price) {
      await talk("Seu Joca", "Ih, não fecha a conta. Tenta uma quantidade menor.");
      continue;
    }
    useGame.getState().update((s) => {
      s.money -= price;
      giveItem(s, item, count);
    });
    playSfx("confirm");
    await talk("Seu Joca", count > 1 ? `${count}× ${ITEMS[item].name}. Volte sempre!` : `Aqui está: ${ITEMS[item].name}.`);
    if (item === "pokeball" && count >= 10 && !flag("joca_bonus")) {
      setFlag("joca_bonus");
      useGame.getState().update((s) => giveItem(s, "greatball", 1));
      playSfx("discover");
      await talk("Seu Joca", "Levou dez? Toma uma Grande Bola de brinde.");
    }
  }
  await talk("Seu Joca", "Boa jornada!");
}

async function gymGate(): Promise<boolean> {
  if (!flag("chapter1_complete")) {
    await think("Primeiro eu volto para casa. O ginásio pode esperar.");
    return false;
  }
  if (flag("ch2_met_cora")) return true;
  const w = world();
  w.faceNpcToPlayer("gym_guard");
  await talk("Guia do Ginásio", "Desculpe, o ginásio está fechado.", "A líder Cora saiu cedo para a Floresta de Aster. Os Pokémon de lá estão fugindo e ela foi ver o motivo.");
  await talk(hero(), "A floresta que eu acabei de atravessar?");
  await talk("Guia do Ginásio", "Essa mesma. Fica depois da Rota 2, para o sul. Se encontrar a Cora, diz que a cidade está esperando.");
  if (!flag("ch2_gym_closed")) {
    setFlag("ch2_gym_closed");
    await goal("Volte ao sul pela Rota 2. Cora está na clareira central da Floresta de Aster, a oeste da trilha norte.");
    autosave();
  }
  return false;
}

async function coraForest(): Promise<void> {
  const w = world();
  w.faceNpcToPlayer("cora_forest");
  await talk("Cora", "Shh. Devagar. Olha o chão.");
  await think("A grama em volta está esbranquiçada, como se tivesse geado. No meio do verão.");
  await talk("Cora", "Você é treinador? Sou a Cora, líder do ginásio de Ferrúria.", "Os Wurmple fugiram daqui em fila, todos para o mesmo lado. Nunca vi isso.");
  await w.emote("thomas_researcher", "!");
  w.faceNpcToPlayer("thomas_researcher");
  await talk("Pesquisador", "Ah, visitas. Sou da equipe de campo do Grupo Thomas.", "Estamos medindo uma pequena anomalia de energia. Nada com que se preocupar.");
  await talk("Cora", "Uma anomalia que congela a grama e espanta uma floresta inteira. Nada com que se preocupar?");
  await talk("Pesquisador", "O Grupo Thomas cuida disso, líder. Aliás, a obra da estrada norte também é nossa.", "Logo Ferrúria vai estar ligada a Verdelume. Progresso, sabe?");
  await w.emote("cora_forest", "...");
  await talk("Pesquisador", "Bom, já tenho as leituras. Com licença.");
  await w.moveNpc("thomas_researcher", ["left", "left", "up", "up", "up"]);
  w.setNpcVisible("thomas_researcher", false);
  await think("Um frio passou pela trilha quando ele saiu. Igual ao que a professora Lira anotava nos cadernos dela.");
  w.faceNpcToPlayer("cora_forest");
  await talk("Cora", "Não gostei dele. Mas não dá para resolver isso hoje.", "Você atravessou a floresta para me encontrar, não foi? Veio pela insígnia.");
  await talk(hero(), "Vim. E a cidade inteira está te esperando.");
  await talk("Cora", "Então vamos. Eu abro o ginásio e te espero lá dentro.", "Meu ginásio é um viveiro. Os casulos abrem e fecham as teias. Use a cabeça, não só a força.");
  await w.moveNpc("cora_forest", ["right", "right", "right", "up", "up", "up"]);
  w.setNpcVisible("cora_forest", false);
  setFlag("ch2_met_cora");
  await goal("Volte a Ferrúria. O ginásio da Cora está aberto.");
  autosave();
}

async function gymIntro(): Promise<void> {
  setFlag("ch2_gym_intro");
  await talk("Guia do Ginásio", "Bem-vindo ao Viveiro de Ferrúria!", "Aqui as teias fecham a passagem. Cada casulo dourado que você toca troca quais teias estão de pé.", "Quando uma teia some, outra aparece. Olhe bem antes de tocar.");
  await goal("Toque nos casulos para abrir caminho até a líder Cora.");
}

async function lever(): Promise<void> {
  const on = !flag("gym_switch");
  setFlag("gym_switch", on);
  playSfx(on ? "confirm" : "cursor");
  await world().flash(on ? 0xffe28a : 0x9fd8c8);
  world().refreshNpcs();
  await talk(undefined, on ? "O casulo brilhou. Umas teias se desfizeram... e outras se teceram." : "O casulo apagou. As teias trocaram de lugar de novo.");
}

async function coraGym(): Promise<void> {
  if (badge()) {
    await talk("Líder Cora", "A insígnia fica bem em você.", "Fica de olho no Grupo Thomas. Se aquela anomalia aparecer de novo, quero saber.");
    return;
  }
  await talk("Líder Cora", "Achou o caminho! Os casulos te contaram o segredo.", "Os insetos parecem frágeis. Mas mudam de forma, se protegem, e um dia voam.", "Mostre o que você e seu parceiro aprenderam até aqui!");
  const won = await trainerBattle("leader_cora", "cora");
  if (!won) return;
  useGame.getState().update((s) => {
    if (!s.badges.includes(BADGE)) s.badges.push(BADGE);
  });
  playSfx("discover");
  await world().flash(0xffe28a);
  await talk(undefined, `${hero()} recebeu a Insígnia Casulo!`);
  await talk("Líder Cora", "É sua. A primeira de Asteria.", "Com ela, o guarda da Rota 2 deixa você entrar no bosque escondido.");
  await giveOnce("cora_gift", "super_potion", 2, "Líder Cora");
  await goal("Saia do ginásio. Alguém está esperando lá fora.");
  autosave();
}

async function rival(): Promise<void> {
  const w = world();
  w.placeNpc("gael_ferruria", 7, 13, "up");
  w.setNpcVisible("gael_ferruria", true);
  await w.emote("gael_ferruria", "!");
  await w.moveNpc("gael_ferruria", ["up", "up"]);
  w.facePlayer("down");
  await talk("Gael", "Você ganhou da Cora antes de mim?!");
  const won = await trainerBattle("rival_gael_1", "gael_ferruria");
  setFlag("ch2_rival");
  if (won) {
    await talk("Gael", "Tá. Tá bom. Você mereceu.", "Mas a segunda insígnia é minha, ouviu?");
  }
  if (w.mapKey() === "ferruria") {
    await talk("Gael", "Ah, e a estrada para Verdelume, ao norte, está fechada. Obra do Grupo Thomas.", "Vai lá ver. Eu vou treinar no lago.");
    await w.moveNpc("gael_ferruria", ["down", "down"]);
  }
  w.setNpcVisible("gael_ferruria", false);
  await goal("Veja a saída norte de Ferrúria.");
  autosave();
}

async function workers(): Promise<void> {
  await talk("Operário", "Opa, aqui não passa! Obra do Grupo Thomas.", "A estrada para Verdelume está sendo alargada. Tem máquina, tem buraco, tem chefe bravo.");
  if (!badge() || !flag("ch2_rival") || flag("chapter2_complete")) return;
  await talk(hero(), "Quando vai abrir?");
  await talk("Operário", "Quando o doutor Thomas mandar. Ele mesmo vem inaugurar, dizem.", "Por enquanto, só o pessoal da pesquisa entra e sai.");
  await think("Pesquisa. Na estrada. E na floresta.", "Tem alguma coisa ligando tudo isso.");
  setFlag("chapter2_complete");
  await talk(undefined, "Capítulo 2 concluído — Ninho de Seda.");
  useUi.getState().setHint(null);
  autosave();
}

async function ranger(): Promise<void> {
  if (!badge()) {
    await talk("Guarda Nuno", "Opa! O bosque daqui está interditado.", "Os Pokémon que fugiram da floresta se esconderam lá dentro. Só entra quem tem a insígnia do ginásio de Ferrúria.");
    return;
  }
  await talk("Guarda Nuno", "A Insígnia Casulo! A Cora confia em você, então eu também.", "Vai com calma lá dentro. Tem uma exploradora que não perde uma batalha.");
  setFlag("r2_grove_open");
  const w = world();
  await w.moveNpc("ranger_r2", ["up", "up"]);
  w.setNpcVisible("ranger_r2", false);
}

// ---------- falas, placas e visibilidade ----------

export const CH2_TALK: Record<string, () => Promise<void>> = {
  nurse,
  ferruria_shop: shop,
  gym_guard: async () => {
    await gymGate();
  },
  cora_forest: coraForest,
  thomas_researcher: async () => talk("Pesquisador", "Leituras de energia, só isso. Não toque em nada, por favor."),
  cora: coraGym,
  gym_guide: async () => {
    if (badge()) await talk("Guia do Ginásio", "Parabéns pela insígnia! Volte quando quiser treinar.");
    else await talk("Guia do Ginásio", "Dica: o casulo do meio abre a teia do meio. Depois, procure outro casulo do outro lado.");
  },
  gym_trainer_1: async () => {
    await trainerBattle("gym_lia", "gym_trainer_1");
  },
  gym_trainer_2: async () => {
    await trainerBattle("gym_tome", "gym_trainer_2");
  },
  web_a_1: async () => talk(undefined, "Uma teia grossa e brilhante. Não dá para passar."),
  web_a_2: async () => talk(undefined, "Uma teia grossa e brilhante. Não dá para passar."),
  web_b_1: async () => talk(undefined, "Uma teia grossa e brilhante. Não dá para passar."),
  web_b_3: async () => talk(undefined, "Uma teia grossa e brilhante. Não dá para passar."),
  lever_1_off: lever,
  lever_1_on: lever,
  lever_2_off: lever,
  lever_2_on: lever,
  lever_3_off: lever,
  lever_3_on: lever,
  worker_a: workers,
  worker_b: workers,
  gael_ferruria: async () => talk("Gael", "Bora, bora! A Cora não vai esperar para sempre."),
  center_visitor: async () => {
    await talk("Viajante", "Vim de longe só para ver o viveiro da Cora.", flag("ch2_met_cora") ? "Ouvi dizer que ela voltou! Vou assistir à sua batalha." : "Mas ela sumiu na floresta. Que azar o meu.");
  },
  ranger_r2: ranger,
  r2_rui: async () => {
    if (flag("beat_hiker_rui")) return void (await trainerBattle("hiker_rui", "r2_rui"));
    await spottedBy("hiker_rui", "r2_rui");
  },
  r2_tais: async () => {
    if (flag("beat_scout_tais")) return void (await trainerBattle("scout_tais", "r2_tais"));
    await spottedBy("scout_tais", "r2_tais");
  },
  r2_trainer_a: async () => {
    await trainerBattle("camper_luan", "r2_trainer_a");
  },
  r2_trainer_b: async () => {
    await trainerBattle("watcher_nina", "r2_trainer_b");
  },
  r2_grove_kid: async () => {
    await trainerBattle("explorer_lu", "r2_grove_kid");
  },
  r2_fisher: async () => {
    await talk("Pescador Bento", "Esse lago é tranquilo. Os Pokémon da floresta vêm beber água aqui.", "Essa semana veio o dobro. Estão fugindo de alguma coisa, aposto.");
  },
  r2_hiker: async () => {
    await talk("Viajante", "Indo para Ferrúria? Os dois caminhos chegam lá.", "O do oeste tem mais mato e Pokémon selvagem. O do leste tem treinadores esperando briga.");
  },
  item_r2_super: async () => {
    if (await giveOnce("r2_item_super", "super_potion", 1)) world().refreshNpcs();
  },
  item_r2_ball: async () => {
    if (await giveOnce("r2_item_ball", "greatball", 2)) world().refreshNpcs();
  },
  item_r2_candy: async () => {
    if (await giveOnce("r2_item_candy", "rare_candy", 1)) world().refreshNpcs();
  },
  ferruria_local: async () => {
    if (!ch2()) return talk("Morador", "Primeira vez em Ferrúria? O laboratório da professora Celina é o da direita, na rua de cima.");
    await talk("Morador", badge() ? "Você ganhou da Cora?! A cidade inteira está falando disso." : "Ferrúria cresceu muito. Tem loja nova, Centro de Cura novo... e agora essa obra no norte.");
  },
  ferruria_trainer: async () => {
    if (!ch2()) return talk("Treinadora", "Vou conseguir minha primeira insígnia hoje!");
    await talk("Treinadora", badge() ? "Você passou pelas teias! Eu fiquei rodando em volta do casulo do meio." : "Estou esperando a Cora voltar. Treino aqui todo dia.");
  },
  ferruria_kid: async () => talk("Menina Bia", "Sabia que um Wurmple vira casulo e depois vira borboleta?", "Eu vou ter uma Beautifly quando crescer!"),
  ferruria_elder: async () => {
    await talk("Vó Lurdes", "Moro em Ferrúria há setenta anos, meu bem.", "Nunca vi a floresta tão quieta. Nem passarinho canta mais de manhã.");
  },
  ferruria_gossip_a: async () => talk("Dona Zeza", "Você viu os homens de jaleco branco? Entram e saem da floresta o dia inteiro."),
  ferruria_gossip_b: async () => talk("Dona Rita", "Dizem que é do Grupo Thomas. O mesmo das propagandas na TV.", "Eu não confio em gente que sorri demais."),
  ferruria_fisher: async () => talk("Seu Tião", "O lago da praça é pequeno, mas tem peixe que é uma beleza.", "Quando a estrada abrir, vai encher de turista. Não sei se gosto."),
  ferruria_gardener: async () => {
    await talk("Jardineira Flor", "Eu cuido dos canteiros da praça.");
    await giveOnce("flor_gift", "potion", 2, "Jardineira Flor");
  },
  ferruria_bug: async () => {
    await trainerBattle("bug_davi", "ferruria_bug");
  },
  ferruria_jogger: async () => talk("Corredor", "Três voltas na praça antes do café!", "Correr com o Starly do lado é o melhor treino."),
  mart_customer: async () => talk("Cliente", "A Grande Bola é cara, mas pega muito melhor.", "Para Pokémon difícil, vale cada moeda."),
  prado_mom: async () => {
    await talk("Sra. Prado", "Ah, um treinador! O meu filho fala de vocês o dia inteiro.");
    await giveOnce("prado_gift", "pokeball", 3, "Sra. Prado");
    await talk("Sra. Prado", "Cuidado na estrada. Volte para a sua mãe inteiro, viu?");
  },
  prado_kid: async () => talk("Pedrinho", "Quando eu fizer dez anos, vou desafiar a Cora também!"),
};

export const CH2_SIGNS: Record<string, string[]> = {
  sign_route2: ["Rota 2.", "Norte: Cidade Ferrúria. Sul: Floresta de Aster."],
  sign_r2_split: ["Bifurcação.", "Oeste: trilha do mato alto. Leste: trilha dos treinadores.", "As duas chegam a Ferrúria."],
  sign_r2_grove: ["Bosque do Orvalho — interditado.", "Entrada só com a insígnia do ginásio de Ferrúria."],
  sign_r2_north: ["Cidade Ferrúria logo à frente."],
  sign_ferruria: ["Cidade Ferrúria.", "A cidade entre a floresta e a estrada do norte."],
  sign_gym: ["Ginásio de Ferrúria — tipo Inseto.", "Líder: Cora, a guardiã do viveiro."],
  sign_center: ["Centro de Cura.", "Cura gratuita para a sua equipe."],
  sign_mart: ["Loja do Joca.", "Poções, Pokébolas e tudo para a estrada."],
  sign_works: ["OBRAS DO GRUPO THOMAS.", "Estrada Ferrúria–Verdelume. Passagem proibida."],
  sign_lake: ["Lago da Praça.", "Proibido nadar. Pescar pode."],
  house_locked: ["A porta está trancada."],
  house_locked_2: ["Tem alguém cozinhando lá dentro. Cheira a bolo de fubá."],
  house_locked_3: ["A porta está trancada. Uma plaquinha diz: Família Torres."],
  house_locked_4: ["Ninguém em casa."],
  house_locked_5: ["Um Starly cochila na janela."],
};

export const CH2_SIGN_RUN: Record<string, () => Promise<void>> = {
  center_pc: async () => { useUi.getState().setPanel("pc"); },
  center_desk: nurse,
  mart_desk: shop,
};

const WEB_A = () => !flag("gym_switch");
const WEB_B = () => flag("gym_switch");
const CORA_IN_FOREST = () => (ch2() || flag("ch2_gym_closed")) && !flag("ch2_met_cora");

export const CH2_VISIBLE: Record<string, () => boolean> = {
  gael_ferruria: () => (flag("chapter1_complete") && !ch2()) || (badge() && !flag("ch2_rival")),
  gael_gym: () => false,
  cora_forest: CORA_IN_FOREST,
  thomas_researcher: CORA_IN_FOREST,
  gym_guard: () => !flag("ch2_met_cora"),
  ranger_r2: () => !flag("r2_grove_open"),
  item_r2_super: () => !flag("r2_item_super"),
  item_r2_ball: () => !flag("r2_item_ball"),
  item_r2_candy: () => !flag("r2_item_candy"),
  web_a_1: WEB_A,
  web_a_2: WEB_A,
  web_b_1: WEB_B,
  web_b_3: WEB_B,
  lever_1_off: WEB_A,
  lever_2_off: WEB_A,
  lever_3_off: WEB_A,
  lever_1_on: WEB_B,
  lever_2_on: WEB_B,
  lever_3_on: WEB_B,
};

export async function ch2Enter(key: string): Promise<void> {
  if (key === "route2" && !flag("r2_seen")) {
    setFlag("r2_seen");
    useUi.getState().showToast("Rota 2");
    await think("Uma rota comprida. Tem dois caminhos... e um bosque fechado ali em cima.");
  }
  if (key === "ferruria" && flag("chapter1_complete") && !ch2()) await arrival();
  if (key === "ferruria" && badge() && !flag("ch2_rival")) {
    const tile = world().playerTile();
    if (tile.x === 7 && tile.y === 10) await rival();
  }
  if (key === "ferruria_gym" && flag("ch2_met_cora") && !flag("ch2_gym_intro")) await gymIntro();
  if (key === "forest" && CORA_IN_FOREST()) await goal("Cora está na clareira central, a oeste da trilha que vem da Rota 2. Procure a treinadora de chapéu e cabelo verde.");
}

/** null = o capítulo 2 não tem opinião sobre essa passagem. */
export async function ch2CanWarp(from: string, to: string): Promise<boolean | null> {
  if (from === "ferruria" && to === "ferruria_gym") return gymGate();
  return null;
}
