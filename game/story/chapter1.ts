import { ITEMS, type ItemId } from "@/data/items";
import { species } from "@/data/pokemon/species";
import { TYPE_NAME } from "@/data/pokemon/types";
import { defaultRng } from "@/game/core/rng";
import { ask, useUi, wait } from "@/game/core/ui";
import { world } from "@/game/phaser/bridge";
import { createMon } from "@/game/pokemon/mon";
import { addMon, giveItem, useGame } from "@/game/state/store";
import {
  autosave,
  flag,
  giveOnce,
  healAtHome,
  hero,
  line,
  runBattle,
  setFlag,
  state,
  talk,
  think,
  trainerBattle,
  wildEncounter,
  yesNo,
} from "@/game/story/actions";
import { type StoryHooks, story } from "@/game/story/hooks";
import { playSfx } from "@/lib/audio/engine";

const STARTERS = ["torchic", "bulbasaur", "froakie"] as const;
type StarterId = (typeof STARTERS)[number];
const COUNTER: Record<StarterId, StarterId> = { torchic: "froakie", bulbasaur: "torchic", froakie: "bulbasaur" };

function rivalStarter(): StarterId | null {
  return (state().rivalStarter as StarterId | null) ?? null;
}

async function wakeUp(): Promise<void> {
  if (flag("woke")) return;
  setFlag("woke");
  await wait(500);
  await think("Mais uma noite olhando pro teto.", "Lá embaixo, a tosse da mãe parou faz pouco tempo.");
  useUi.getState().setHint("Setas ou WASD para andar · Shift corre · Z interage · Enter abre o menu");
  window.setTimeout(() => useUi.getState().setHint(null), 9000);
}

async function motherFirstTalk(): Promise<void> {
  const w = world();
  w.faceNpcToPlayer("mother");
  await talk("Mãe", "Bom dia, {filho}. Dormiu alguma coisa?");
  const slept = await ask(["Dormi.", "Não muito."]);
  if (slept === 0) await talk("Mãe", "Mentiroso. Dá pra ver pela cara.");
  else await talk("Mãe", "Eu também não. Pelo menos somos dois.");
  await talk(undefined, "*cof cof*");
  await talk("Mãe", "Não faz essa cara. É a tosse de sempre.", "O doutor de Oráculo ligou ontem.", "O tratamento novo funciona. Só que custa mais do que essa casa vale.");
  await think("Mais do que a gente vai ter um dia.");
  await talk("Mãe", "Eu sei que você viu o cartaz da Liga de Asteria.", "Está aberto no seu computador desde a semana passada.");
  const reply = await ask(["O prêmio paga o tratamento.", "Eu não gosto de batalhar."]);
  if (reply === 0) await talk("Mãe", "Paga. E é exatamente isso que me dá medo.");
  else await talk("Mãe", "Eu sei. Você nunca gostou. Nem quando era pequeno.");
  await talk(
    "Mãe",
    "A Professora Lira passou aqui ontem à noite.",
    "Disse que tem um Pokémon esperando alguém no laboratório dela.",
    "Não quero que você vá por causa do dinheiro.",
    "Quero que você vá porque não dá pra passar a vida inteira dentro dessa casa, cuidando de mim.",
    "O laboratório fica depois da fonte, perto da praça.",
  );
  await talk(hero(), "...Eu volto antes de escurecer.");
  await talk("Mãe", "Eu sei que volta.");
  setFlag("talked_mother");
  autosave();
}

async function motherTalk(): Promise<void> {
  if (!flag("talked_mother")) return motherFirstTalk();
  if (flag("got_pokedex") && !flag("said_goodbye")) {
    await talk("Mãe", "Então é verdade. A Lira me ligou.", "Você e o seu parceiro já se conhecem melhor do que imaginei.");
    await healAtHome();
    await talk("Mãe", "Descansem um pouco antes de sair.");
    await giveOnce("mother_potions", "potion", 3, "Mãe");
    await talk(
      "Mãe",
      "Guardei essas Poções faz tempo. Era pra uma emergência.",
      "Acho que essa é a emergência.",
      "{nome}... se ficar difícil, volta. Não precisa vencer nada pra voltar pra casa.",
    );
    await think("Eu preciso vencer. Mas não vou dizer isso agora.");
    setFlag("said_goodbye");
    autosave();
    return;
  }
  if (state().party.length > 0) {
    await talk("Mãe", "Vem cá. Deixa eu ver vocês dois.");
    await healAtHome();
    await talk(undefined, "O seu time foi totalmente recuperado.");
    await talk("Mãe", "Prontinho. Agora vão.");
    return;
  }
  await talk("Mãe", "O laboratório fica depois da fonte. A Lira está esperando.");
}

async function chooseStarter(id: StarterId): Promise<void> {
  if (flag("got_starter")) {
    const taken = id === state().starter ? "Esse é o seu parceiro." : id === rivalStarter() ? "Ren já levou esse." : "A Pokébola está vazia agora.";
    await talk(undefined, taken);
    return;
  }
  if (!flag("entered_lab")) return;
  const def = species(id);
  await talk(undefined, `${def.name}, o Pokémon ${def.category}. Tipo ${def.types.map((t) => TYPE_NAME[t]).join("/")}.`, def.description);
  const confirm = await yesNo(line("Profª Lira", `Você escolhe ${def.name}?`));
  if (!confirm) return;
  const granted = useGame.getState().grantOnce("got_starter", (s) => {
    const mon = createMon(id, 5, defaultRng, { metAt: "Vila Brisamar" });
    addMon(s, mon);
    s.starter = id;
    s.rivalStarter = COUNTER[id];
  });
  if (!granted) return;
  const w = world();
  w.refreshNpcs();
  playSfx("catch");
  await talk(undefined, `${hero()} recebeu ${def.name}!`);
  await talk("Profª Lira", `${def.name} está te olhando de volta.`, "Isso não é um prêmio, {nome}. É confiança. Não desperdice.");
  await rivalArrives(id);
}

async function rivalArrives(chosen: StarterId): Promise<void> {
  const w = world();
  const counter = COUNTER[chosen];
  w.placeNpc("ren_lab", 7, 9, "up");
  w.setNpcVisible("ren_lab", true);
  setFlag("ren_in_lab");
  playSfx("door");
  await talk("???", "Profª Lira! Cheguei! Eu sei, eu sei, me atrasei!");
  await w.moveNpc("ren_lab", ["up", "up"]);
  await w.emote("ren_lab", "!");
  await talk(
    "Ren",
    "{nome}? Você também veio?!",
    "Eu sou o Ren. A gente se esbarra na praça desde criança, lembra?",
    "Meu bisavô viajou por Kanto inteiro com um Pikachu. Lá em casa tem foto dele com tudo que é Campeão!",
  );
  await talk(hero(), "Lembro de você. Você falava alto.");
  await talk("Ren", "Ainda falo!");
  const counterName = species(counter).name;
  await talk("Ren", `Então eu fico com o ${counterName}! Parece que ele gosta de mim.`);
  useGame.getState().update((s) => {
    s.flags.ren_took_starter = true;
  });
  w.refreshNpcs();
  playSfx("catch");
  await talk("Profª Lira", "Ren... você podia ao menos esperar eu terminar de explicar.");
  await talk("Ren", "Explica depois da batalha! {nome}, vamos ver do que os nossos parceiros são capazes!");
  await think("Eu não quero batalhar.", "...Mas vou ter que aprender.");
  const foe = createMon(counter, 5, defaultRng);
  const outcome = await runBattle({ kind: "trainer", foeParty: [foe], trainerName: "Ren", allowLoss: true, gentleFoe: true, background: "town" });
  useGame.getState().update((s) => {
    for (const mon of s.party) {
      mon.hp = Math.max(mon.hp, 1);
    }
    s.flags.rival_battle_done = true;
    s.flags.rival_first_win = outcome === "win";
  });
  await healAtHome();
  if (outcome === "win") {
    await talk("Ren", "Ah, qual é! Perdi logo na primeira?", "...Tá. Foi bonito. Vocês dois combinam.");
  } else {
    await talk("Ren", "Ganhei! Mas, sério, você segurou bem.", "Na próxima eu é que vou ter que me cuidar.");
  }
  await talk(
    "Profª Lira",
    "Pronto, agora eu posso falar?",
    "Isto é uma Pokédex. Ela registra todo Pokémon que vocês virem e capturarem.",
    "E estas são Pokébolas. Enfraqueça um Pokémon selvagem antes de lançar uma.",
  );
  await giveOnce("got_pokedex_items", "pokeball", 5, "Profª Lira");
  setFlag("got_pokedex");
  playSfx("discover");
  await talk(
    undefined,
    `${hero()} recebeu a Pokédex!`,
  );
  await talk(
    "Profª Lira",
    "Rotas têm grama alta. É lá que os Pokémon selvagens se escondem.",
    "Se o seu parceiro se machucar, use uma Poção pela Mochila. Enter abre o menu.",
    "A Liga exige oito insígnias. A primeira fica em Ferrúria, depois da Floresta de Aster.",
    "Antes de sair, passe em casa. Sua mãe merece ouvir isso de você.",
  );
  await talk("Ren", "Eu vou na frente! Te espero na Rota 1, {nome}!");
  await w.moveNpc("ren_lab", ["down", "down"]);
  playSfx("door");
  w.setNpcVisible("ren_lab", false);
  setFlag("ren_left_lab");
  autosave();
}

async function liraTalk(): Promise<void> {
  if (!flag("got_starter")) {
    await talk("Profª Lira", "Os três estão na mesa. Olhe cada um com calma.", "Escolha com o coração, não pela tabela de tipos.");
    return;
  }
  if (!flag("got_pokedex")) return;
  await talk("Profª Lira", "Asteria fica entre Kanto, Hoenn e Sinnoh. Por isso você vai encontrar Pokémon das três regiões.", "Volte quando quiser. Esse laboratório também é seu.");
}

async function renRoute1Talk(): Promise<void> {
  if (!flag("ren_left_lab")) {
    await think("Não tem ninguém esperando aqui.");
    return;
  }
  if (flag("met_ren_route1")) {
    await talk("Ren", "A floresta vai abrir um dia.", "Quando abrir, eu quero ser o primeiro a entrar!");
    return;
  }
  setFlag("met_ren_route1");
  await talk("Ren", "Ah! Finalmente!", "Eu disse que te esperaria na Rota 1.", "Quer uma revanche? Só pra aquecer.");
  const again = await yesNo(line(undefined, "Batalhar de novo com o Ren?"));
  if (again && state().party.length > 0) {
    const counter = rivalStarter();
    if (counter) {
      const foe = createMon(counter, 6, defaultRng);
      const outcome = await runBattle({
        kind: "trainer",
        foeParty: [foe],
        trainerName: "Ren",
        allowLoss: true,
        gentleFoe: true,
        background: "grass",
      });
      if (outcome === "win") await talk("Ren", "Você melhorou de verdade. Isso me irrita e me anima ao mesmo tempo.");
      else await talk("Ren", "Quase! Da próxima eu não vou pegar leve... quase.");
    }
  } else {
    await talk("Ren", "Beleza. Guarda energia pra Floresta de Aster.");
  }
  autosave();
}

async function shop(): Promise<void> {
  await talk("Dona Marta", "Bem-vindo à banca da Marta! Tudo que um treinador precisa.");
  if (flag("saw_thomas_ad") && !flag("marta_thomas_line")) {
    setFlag("marta_thomas_line");
    await talk("Dona Marta", "Thomas Group mandou uns flyers. Eu não entendo metade, mas pagam bem os anúncios.");
  }
  const stock: ItemId[] = ["potion", "pokeball", "antidote"];
  for (;;) {
    const options = [...stock.map((id) => `${ITEMS[id].name} — ₽${ITEMS[id].price}`), "Sair"];
    const choice = await ask(options, line("Dona Marta", `Você tem ₽${state().money}. O que vai levar?`), options.length - 1);
    if (choice >= stock.length) break;
    const item = stock[choice];
    const price = ITEMS[item].price;
    if (state().money < price) {
      await talk("Dona Marta", "Hm... não dá. Volte quando tiver mais dinheiro.");
      continue;
    }
    useGame.getState().update((s) => {
      s.money -= price;
      giveItem(s, item, 1);
    });
    playSfx("confirm");
    await talk("Dona Marta", `Aqui está: ${ITEMS[item].name}. Obrigada!`);
  }
  await talk("Dona Marta", "Volte sempre!");
}

const SIGNS: Record<string, string[]> = {
  sign_home: ["Casa de {nome}."],
  sign_lab: ["Laboratório Pokémon da Profª Lira", "Pesquisa sobre o comportamento dos Pokémon de Asteria."],
  sign_beach: ["Praia de Brisamar", "Cuidado com as ondas fora de época."],
  sign_route1: ["Rota 1", "Brisamar ↓   Floresta de Aster ↑"],
  sign_forest: ["Floresta de Aster", "Trilha fechada temporariamente pela guarda florestal."],
  bedroom_pc: [
    "Uma página da Liga de Asteria continua aberta na tela.",
    "\"Grande prêmio do campeonato: ₽2.000.000.\"",
    "Rodapé: patrocínio Thomas Group — eventos em Verdelume e Porto Coral.",
    "Você fechou e abriu essa página umas cem vezes.",
  ],
  sign_village: ["Vila Brisamar", "Onde o vento do mar começa.", "Liga de Asteria · apoio Thomas Group"],
  bedroom_shelf: ["Livros de escola, um guia de Pokémon de Kanto e um caderno com contas que nunca fecham."],
  kitchen_meds: ["Frascos de remédio lado a lado.", "Os rótulos estão gastos de tanto abrir e fechar."],
  stove: ["Uma panela de sopa ainda morna. Sua mãe acordou antes de você."],
  photo: ["Uma foto antiga, desbotada.", "Sua mãe, criança, no colo de um homem de boné vermelho.", "O rosto dele foi apagado pelo sol."],
  lab_books: ["Pesquisas sobre migração de Pokémon entre Kanto, Hoenn e Sinnoh.", "Uma das pastas diz: \"anomalias de energia — observatório\"."],
  lab_machine: ["Uma máquina zumbindo baixinho. A tela mostra gráficos que sobem e descem."],
};

const NPC_TALK: Record<string, () => Promise<void>> = {
  fisher: async () => {
    await talk("Pescador Davi", "O mar anda esquisito, garoto.", "Onda grande em dia sem vento. E nenhum cardume onde sempre teve.", "Meu avô dizia que quando o mar muda, alguma coisa grande está acordando.");
  },
  girl: async () => {
    if (flag("rival_battle_done")) await talk("Bia", "Você batalhou com o Ren?! Ele passou aqui gritando que vai ser Campeão!");
    else await talk("Bia", "O Ren passou correndo pro laboratório. Ele nunca anda, só corre.");
  },
  elder: async () => {
    await talk(
      "Seu Otávio",
      "Asteria fica bem no meio do mar, entre Kanto, Hoenn e Sinnoh.",
      "Na montanha do centro tem um observatório antigo. Dizem que lá o céu às vezes se dobra.",
      "Bobagem de velho? Talvez.",
    );
  },
  shopkeeper: async () => {
    if (!flag("got_starter")) {
      await talk("Dona Marta", "Sem Pokémon ainda? Volte quando tiver um parceiro. Aí eu te vendo Poções.");
      return;
    }
    await shop();
  },
  kid: async () => {
    await talk("Tico", "Quando eu crescer vou ter um Pokémon dragão!", "Minha tia diz que em Dracônia tem uma estátua de uma Campeã de verdade!");
  },
  neighbor: async () => {
    await talk("Dona Célia", "Como está sua mãe, querido?");
    await think("Ninguém pergunta isso esperando a resposta de verdade.");
    await talk("Dona Célia", "Se precisar de alguma coisa, é só bater aqui.");
    await giveOnce("neighbor_potion", "potion", 1, "Dona Célia");
  },
  ren_gate: async () => {
    await talk("Ren", "{nome}! A Lira tá te esperando. Disse que só entrega os Pokémon quando você chegar.", "Anda logo, que eu não aguento mais esperar!");
  },
  youngster: async () => {
    await trainerBattle("youngster_caio", "youngster");
  },
  hiker: async () => {
    await talk("Guarda Florestal Nuno", "A trilha da Floresta de Aster está fechada por enquanto.", "Os Pokémon de lá estão inquietos. Alguma coisa está espantando eles.", "Volte quando a gente liberar a passagem.");
  },
  item_potion: async () => {
    const got = await giveOnce("route1_potion", "potion", 1);
    if (got) world().refreshNpcs();
  },
  lira: liraTalk,
  mother: motherTalk,
  ren_lab: async () => {
    await talk("Ren", "Bora, {nome}! Ainda tem muita coisa pra ver lá fora!");
  },
  ren_route1: renRoute1Talk,
};

const NPC_VISIBLE: Record<string, () => boolean> = {
  ren_gate: () => !flag("got_starter"),
  ren_lab: () => flag("ren_in_lab") && !flag("ren_left_lab"),
  item_potion: () => !flag("route1_potion"),
  ren_route1: () => flag("ren_left_lab") && !flag("met_ren_route1"),
  lab_ball_torchic: () => !(state().starter === "torchic" || (flag("ren_took_starter") && rivalStarter() === "torchic")),
  lab_ball_bulbasaur: () => !(state().starter === "bulbasaur" || (flag("ren_took_starter") && rivalStarter() === "bulbasaur")),
  lab_ball_froakie: () => !(state().starter === "froakie" || (flag("ren_took_starter") && rivalStarter() === "froakie")),
};

const hooks: StoryHooks = {
  npcVisible: (id) => NPC_VISIBLE[id]?.() ?? true,
  talk: async (id) => {
    const run = NPC_TALK[id];
    if (run) await run();
  },
  sign: async (id) => {
    if (id.startsWith("ball_")) {
      await chooseStarter(id.replace("ball_", "") as StarterId);
      return;
    }
    const text = SIGNS[id];
    if (text) {
      await talk(undefined, ...text);
      if (id === "bedroom_pc") setFlag("saw_thomas_ad");
      if (id === "photo" && flag("got_pokedex") && !flag("photo_hint_red")) {
        setFlag("photo_hint_red");
        await think("Boné vermelho...", "Minha mãe nunca fala desse homem.", "Só vira o porta-retrato quando acha que ninguém vê.");
      }
    }
  },
  event: async (id) => {
    if (id === "north_gate") {
      if (!flag("got_starter")) {
        await think("Sem um Pokémon, a mata ao norte não é lugar pra mim.");
        return true;
      }
      if (!flag("rival_battle_done") || !flag("got_pokedex")) {
        await think("A Profª Lira ainda queria falar comigo.");
        return true;
      }
      if (!flag("said_goodbye")) {
        await think("Antes de ir... preciso falar com a mãe.");
        return true;
      }
      return false;
    }
    if (id === "forest_edge") {
      if (!flag("reached_forest")) {
        setFlag("reached_forest");
        playSfx("discover");
        await talk(undefined, "À frente, as árvores da Floresta de Aster fecham a trilha.");
        await think("Ferrúria fica do outro lado. A primeira insígnia.", "Um passo de cada vez.");
        await talk(undefined, "Fim do Capítulo 1 — A necessidade.", "A Floresta de Aster será aberta no próximo capítulo.");
        autosave();
      } else {
        await talk(undefined, "A trilha da floresta está fechada por enquanto.");
      }
      return true;
    }
    return false;
  },
  enterMap: async (key) => {
    if (key === "house_2f") await wakeUp();
    if (key === "house_1f" && !flag("talked_mother")) {
      await wait(300);
      await motherFirstTalk();
    }
    if (key === "lab" && !flag("entered_lab")) {
      setFlag("entered_lab");
      await wait(250);
      await talk("Profª Lira", "Ah, {nome}. Sua mãe disse que você viria.", "Na verdade ela disse que talvez você viesse.", "Os três Pokémon estão na mesa. Chegue perto e escolha um.");
    }
    if (key === "route1" && !flag("reached_route1")) {
      setFlag("reached_route1");
      useUi.getState().showToast("Rota 1");
      await wait(300);
      await think("A partir daqui, não tem mais volta pra casa todo dia.");
    }
  },
  canWarp: async (from, to) => {
    if (from === "house_1f" && to === "brisamar" && !flag("talked_mother")) {
      await talk("Mãe", "{nome}? Vem cá um minutinho antes de sair.");
      return false;
    }
    return true;
  },
  wild: async (mapKey) => {
    await wildEncounter(mapKey);
  },
};

export function installChapter1(): void {
  story.hooks = hooks;
}
