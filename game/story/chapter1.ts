/** Capítulo 1 — O Preço de uma Esperança. Roteiro definitivo de 17/11/2026. */
import { ITEMS, type ItemId } from "@/data/items";
import { species } from "@/data/pokemon/species";
import { TYPE_NAME } from "@/data/pokemon/types";
import { defaultRng } from "@/game/core/rng";
import { ask, useUi } from "@/game/core/ui";
import type { Direction } from "@/game/character/appearance";
import { world } from "@/game/phaser/bridge";
import { createMon } from "@/game/pokemon/mon";
import { addMon, giveItem, useGame } from "@/game/state/store";
import { autosave, flag, giveOnce, healAtHome, hero, line, setFlag, spottedBy, state, talk, think, trainerBattle, wildEncounter, yesNo } from "@/game/story/actions";
import { CH2_SIGN_RUN, CH2_SIGNS, CH2_TALK, CH2_VISIBLE, ch2CanWarp, ch2Enter } from "@/game/story/chapter2";
import { BattleDemo } from "@/game/story/demo";
import { type StoryHooks, story } from "@/game/story/hooks";
import { spotted, watching } from "@/game/story/watchers";
import { playSfx } from "@/lib/audio/engine";
import { formatKey } from "@/lib/input/labels";
import { useSettings } from "@/lib/settings/store";

const STARTERS = ["torchic", "bulbasaur", "froakie"] as const;
type StarterId = (typeof STARTERS)[number];

const shownGoals = new Set<string>();

async function goal(text: string): Promise<void> {
  useUi.getState().setHint(null);
  if (!text || shownGoals.has(text)) return;
  shownGoals.add(text);
  await talk(undefined, text);
}

function escorting(): "clinic" | "lake" | "home" | null {
  if (flag("escort_clinic")) return "clinic";
  if (flag("escort_lake")) return "lake";
  if (flag("escort_home")) return "home";
  return null;
}

function motherOn(map: string): string | null {
  if (map === "house_1f") return "mother";
  if (map === "brisamar") return "mother_town";
  if (map === "clinic") return "mother_clinic";
  return null;
}

function bringMother(map: string): void {
  const id = motherOn(map);
  const w = world();
  if (!id || !escorting()) {
    w.follow(null);
    return;
  }
  const here = w.playerTile();
  // Atrás do jogador (na porta de onde ele saiu), nunca na frente dele.
  const back: Record<string, [number, number]> = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] };
  const [bx, by] = back[here.dir];
  w.placeNpc(id, here.x + bx, here.y + by, here.dir);
  w.setNpcVisible(id, true);
  w.follow(id);
}

function ensure(): void {
  if (flag("ch1_v2")) return;
  if (flag("got_starter")) {
    setFlag("ch1_morning");
    setFlag("exam_collected");
    setFlag("tv_off");
    setFlag("exams_delivered");
    setFlag("clinic_done");
    setFlag("home_after_clinic");
    setFlag("lake_done");
    setFlag("night_decision");
    setFlag("talked_gael");
    setFlag("met_dario");
    setFlag("battle_demo");
    setFlag("capture_demo");
    setFlag("license");
  }
  if (flag("said_goodbye")) setFlag("chapter1_complete");
  setFlag("ch1_v2");
}

async function wakeUp(): Promise<void> {
  if (flag("woke")) return;
  setFlag("woke");
  await talk(undefined, "Região de Asteria.", "Vila Brisamar — uma manhã tranquila.");
  await think("Já está tão tarde assim?");
  await goal("Desça para encontrar sua mãe.");
  useUi.getState().showToast("Setas ou WASD · Z interage · Enter abre o menu");
}

async function morningTalk(): Promise<void> {
  const w = world();
  w.faceNpcToPlayer("mother");
  await talk("Mãe", "Bom dia, meu amor. Dormiu bem?");
  await talk(hero(), "Mais ou menos. Você acordou cedo de novo?");
  await talk("Mãe", "Perdi o sono. Resolvi preparar alguma coisa.");
  await talk(hero(), "Como você está hoje?");
  await talk("Mãe", "Um pouco cansada. Mas estou bem para caminhar.");
  await talk(hero(), "Você disse isso ontem.");
  await talk("Mãe", "E você me perguntou ontem também.");
  await talk(hero(), "É porque você sempre responde a mesma coisa.");
  await talk("Mãe", "E você sempre fica com essa cara de preocupação.", "Eu sei que você podia fazer o café. Mas ainda gosto de cuidar de você de vez em quando.");
  await talk("Mãe", "Temos consulta daqui a pouco. Você pega a pasta com meus exames?", "Acho que deixei na sua mesa quando guardei as roupas.");
  await talk(hero(), "Pego, sim.");
  await talk("Mãe", "Obrigada. E não precisa correr. Ainda temos tempo.");
  await talk(hero(), "Já volto.");
  setFlag("ch1_morning");
  setFlag("talked_mother");
  await goal("Busque a pasta de exames no quarto.");
  autosave();
}

async function motherTalk(): Promise<void> {
  const w = world();
  w.faceNpcToPlayer("mother");
  if (!flag("ch1_morning")) return morningTalk();
  if (flag("got_pokedex") && !flag("said_goodbye")) return goodbye();
  if (flag("night_decision") && !flag("talked_gael")) {
    await talk("Mãe", "Vai sair cedo?");
    await talk(hero(), "Vou falar com o Gael. Preciso entender uma coisa.");
    await talk("Mãe", "Tudo bem. Volte para me contar depois.");
    await talk(hero(), "Volto.");
    await goal("Converse com o Gael.");
    return;
  }
  if (flag("exam_collected") && flag("tv_off") && !flag("exams_delivered")) {
    await talk("Mãe", "Aqui está. Obrigada. Vamos?");
    await talk(hero(), "Vamos. Posso levar sua bolsa também.");
    await talk("Mãe", "Pode, se isso te fizer ficar mais tranquilo.");
    setFlag("exams_delivered");
    setFlag("escort_clinic");
    bringMother("house_1f");
    await goal("A mãe vai com você. A clínica fica a oeste da praça.");
    autosave();
    return;
  }
  if (flag("clinic_done") && !flag("home_after_clinic")) return homeAfterClinic();
  if (flag("home_after_clinic") && !flag("lake_done")) {
    await talk("Mãe", "Quando o sol começar a baixar, me encontra no lago. Eu vou dizer se precisar parar.");
    await goal("Encontre sua mãe no lago, ao sul da vila.");
    return;
  }
  if (state().party.length > 0) {
    await healAtHome();
    await talk("Mãe", "Deixa eu ver vocês dois.", "Prontinho. Agora vão.");
    return;
  }
  if (!flag("exam_collected")) await talk("Mãe", "A pasta ficou no seu quarto, em cima da mesa.");
  else if (!flag("tv_off")) await talk("Mãe", "{nome}? Encontrou a pasta?");
  else await talk("Mãe", "Estou aqui. Não precisa correr.");
}

async function homeAfterClinic(): Promise<void> {
  await talk("Mãe", "Você ficou quieto desde que saímos.");
  await talk(hero(), "Estou pensando.");
  await talk("Mãe", "No que o médico disse?");
  await talk(hero(), "No que ainda dá para fazer.");
  await talk("Mãe", "A gente vai conversar com calma em casa.");
  await talk(hero(), "A gente vai encontrar um jeito.");
  await talk("Mãe", "Eu acredito que vamos procurar todas as possibilidades. Mas quero que você também se cuide.");
  await talk(hero(), "Agora não precisa se preocupar comigo.");
  await talk("Mãe", "Sou sua mãe. Essa parte eu não consigo desligar.", "Quando o sol começar a baixar, você me acompanha ao lago? Faz tempo que não vou lá.");
  await talk(hero(), "Claro. Se estiver se sentindo bem.");
  await talk("Mãe", "Eu vou dizer se precisar parar.");
  setFlag("home_after_clinic");
  setFlag("escort_clinic", false);
  setFlag("escort_lake");
  bringMother("house_1f");
  await goal("Está entardecendo. Acompanhe sua mãe até o lago, ao sul.");
  world().refreshNpcs();
  autosave();
}

async function clinicScene(): Promise<void> {
  await talk("Médico", "Obrigado por terem vindo. Eu revisei os novos exames e comparei com os anteriores.");
  await talk("Mãe", "E como estamos?");
  await talk("Médico", "A doença avançou mais do que esperávamos.", "O tratamento que estamos fazendo aqui não está conseguindo conter essa evolução.");
  await talk(hero(), "Dá para trocar os remédios? Fazer outro exame? Alguma coisa?");
  await talk("Médico", "Vamos manter os cuidados atuais, mas precisamos procurar uma equipe especializada.", "Há um centro fora de Brisamar que trabalha com tratamentos mais avançados.");
  await talk("Mãe", "Então ainda existe uma possibilidade.");
  await talk("Médico", "Existe, sim. Mas o procedimento é complexo, exige acompanhamento e pode custar muito.", "Não posso prometer que dará certo.");
  await talk(hero(), "Quanto?");
  await talk(undefined, "O médico coloca o orçamento sobre a mesa. Por um instante, a sala fica em silêncio.");
  await talk(hero(), "Isso é... tudo isso?");
  await talk("Médico", "É a estimativa do centro. Estou verificando encaminhamentos e possibilidades de apoio.", "Não quero que abandonem o acompanhamento enquanto buscamos alternativas.");
  await talk(hero(), "E quanto tempo temos para decidir?");
  await talk("Médico", "Quanto antes iniciarmos a avaliação especializada, melhor. Vamos organizar os próximos passos com cuidado.");
  await talk("Mãe", "Nós ouvimos, doutor. Obrigada por explicar.");
  await talk("Médico", "Se os sintomas mudarem, procure a clínica. Continuaremos acompanhando você.", "Ela precisa de apoio, mas você também não precisa resolver tudo sozinho.");
  await talk(hero(), "Certo.");
  setFlag("clinic_done");
  setFlag("ch1_budget");
  setFlag("escort_clinic", false);
  setFlag("escort_home");
  bringMother("clinic");
  await goal("Já é tarde. Volte para casa com a sua mãe. Ela caminha junto.");
  world().refreshNpcs();
  autosave();
}

async function lakeScene(): Promise<void> {
  world().faceNpcToPlayer("mother_town");
  await talk("Mãe", "Quando eu era mais nova, vinha aqui quase todos os dias.");
  await talk(hero(), "Você nunca me contou isso.");
  await talk("Mãe", "Eu achava que, se ficasse olhando para a água tempo suficiente, encontraria uma resposta para qualquer problema.");
  await talk(hero(), "Funcionava?");
  await talk("Mãe", "Quase nunca. Mas eu voltava no dia seguinte mesmo assim.", "Sabe... a vida não costuma acontecer no tempo que a gente imagina.");
  await talk(hero(), "Você está falando da consulta?");
  await talk("Mãe", "Também. Estou falando das coisas que a gente guarda para depois. Passeios, histórias, coisas simples.");
  await talk("Mãe", "Eu queria poder te mostrar muito mais do mundo. E queria que você descobrisse coisas que nem eu conheço.");
  await talk(hero(), "Ainda dá tempo.");
  await talk("Mãe", "Espero que sim. Eu não estou desistindo, meu amor. Só estou aprendendo a não deixar tudo para depois.", "Às vezes, quando a gente tem medo de perder algo importante, tenta segurar tão forte que esquece de olhar para o que está ao redor.");
  await talk(hero(), "Eu não quero perder você.");
  await talk("Mãe", "Eu sei.", "Me promete só uma coisa? Não deixe o medo decidir sua vida inteira.");
  await talk(hero(), "Vou tentar.");
  await talk("Mãe", "Já é mais do que suficiente por hoje.");
  setFlag("lake_done");
  setFlag("escort_lake", false);
  setFlag("escort_home");
  bringMother("brisamar");
  await goal("Agora é noite. Volte andando para casa com a sua mãe e durma na sua cama.");
  world().refreshNpcs();
  autosave();
}

async function nightDecision(): Promise<void> {
  await talk(undefined, "O orçamento ocupa a mesa. A televisão, agora desligada, ainda parece estar falando.");
  await think("Se eu conseguisse chegar até o fim...", "Eu não sei quase nada de batalhas.", "Mas preciso descobrir por onde começar.");
  await talk(undefined, "A voz da mãe volta, baixa, como se o lago ainda estivesse ali.", "\"Não deixe o medo decidir sua vida inteira.\"");
  await think("O Gael entende dessas coisas. Posso perguntar a ele amanhã.", "Mas agora é noite. Preciso dormir.");
  await goal("Deite na cama do seu quarto para dormir.");
  autosave();
}

async function sleepInBed(): Promise<void> {
  if (flag("slept") || flag("night_decision")) {
    await talk(undefined, "A cama está arrumada.");
    return;
  }
  if (!flag("lake_done")) {
    await talk(undefined, "Ainda não estou com sono.");
    return;
  }
  await think("Vou dormir. Amanhã eu falo com o Gael.");
  await world().fadeOutIn();
  setFlag("slept");
  setFlag("night_decision");
  setFlag("escort_home", false);
  await talk(undefined, "Na manhã seguinte...");
  await goal("De manhã, fale com o Gael na casa ao lado.");
  world().refreshNpcs();
  autosave();
}

async function gaelTalk(): Promise<void> {
  if (!flag("night_decision")) {
    await talk("Gael", "Ei! Depois a gente se fala. Hoje o Pikachu não me deixa parar quieto.");
    return;
  }
  if (flag("talked_gael")) {
    await talk("Gael", "O professor Dário está no laboratório, perto da praça. Depois a gente sobe para a Rota 1.");
    return;
  }
  world().faceNpcToPlayer("gael");
  await talk("Gael", "Ei, {nome}! O que te traz aqui tão cedo?");
  await talk("Pikachu", "Pika!");
  await talk(hero(), "Preciso perguntar uma coisa. Sobre a Liga.");
  await talk("Gael", "Sobre a Liga? Você?", "Desculpa. Claro. O que você quer saber?");
  await talk(hero(), "Como alguém começa? Sem Pokémon, sem experiência... sem nada.");
  await talk("Gael", "Primeiro precisa de orientação, um parceiro e uma licença. Dá para começar pelo laboratório do professor Dário.");
  await talk(hero(), "E depois?");
  await talk("Gael", "Depois vem o resto. Calma. Não dá para aprender uma jornada inteira numa manhã.");
  await talk(hero(), "Quanto tempo leva para conseguir as oito insígnias?");
  await talk("Gael", "Depende muito do treinador. Não existe um caminho rápido garantido.", "Ei... aconteceu alguma coisa?");
  await talk(hero(), "É por causa da minha mãe. Preciso tentar uma coisa.");
  await talk("Gael", "Entendi. Não precisa me explicar tudo agora. Se quiser, eu te mostro como começar.", "Na minha família, todo mundo conta histórias de um treinador chamado Ash. Acho que peguei gosto por isso ouvindo tantas vezes.");
  await talk(hero(), "Quero. Obrigado.");
  await talk("Gael", "Então vem. Professor Dário vai estar no laboratório. E não se preocupe: o Pikachu é quem dá as melhores aulas por aqui.");
  await talk("Pikachu", "Pika-pika!");
  await think("Estou começando a perceber.");
  setFlag("talked_gael");
  await goal("Siga até o laboratório do Professor Dário.");
  autosave();
}

async function darioIntro(): Promise<void> {
  await talk("Gael", "Professor Dário! Trouxe alguém para conhecer o laboratório.");
  await talk("Prof. Dário", "Bom dia, Gael. E bom dia, {nome}. Há bastante tempo você não aparece por aqui.");
  await talk(hero(), "Bom dia.");
  await talk("Gael", "Ele quer começar a treinar Pokémon.");
  await talk("Prof. Dário", "Entendo. E o que fez você pensar nisso?");
  await talk(hero(), "Preciso participar do circuito da Liga. Queria saber o que é necessário.");
  await talk("Prof. Dário", "Uma licença, um parceiro Pokémon e disposição para aprender. Você já participou de alguma batalha?");
  await talk(hero(), "Não.");
  await talk("Prof. Dário", "Então vamos começar pelo básico. Escolher um companheiro sem compreender como cuidar dele seria precipitado.");
  await talk("Gael", "Posso mostrar! Eu e Pikachu íamos treinar na Rota 1, logo ao norte da vila.");
  await talk("Prof. Dário", "Ótima ideia. {nome}, você pode observar. Não precisa entrar numa batalha antes de se sentir preparado.", "Sai pelo portão norte de Brisamar. O Gael te espera no começo da rota, ao lado do caminho. Ele não vai ficar no meio da trilha.");
  await talk(hero(), "Posso ir.");
  await talk("Gael", "Então eu vou na frente! Te espero na entrada da Rota 1.");
  const w = world();
  const at = w.npcTile("gael_lab");
  if (at) {
    const steps: Direction[] = [];
    for (let y = at.y; y < 10; y += 1) steps.push("down");
    await w.moveNpc("gael_lab", steps);
  }
  playSfx("door");
  w.setNpcVisible("gael_lab", false);
  setFlag("met_dario");
  setFlag("entered_lab");
  await goal("Saia de Brisamar pelo norte. O Gael está no começo da Rota 1, ao lado do caminho.");
  world().refreshNpcs();
  autosave();
}

async function lesson(): Promise<void> {
  if (flag("capture_demo")) {
    await talk("Gael", "Pode voltar ao laboratório. As Pokébolas estão na mesa do professor. Eu fico aqui, fora do caminho.");
    return;
  }
  world().faceNpcToPlayer("gael_route");
  await talk("Gael", "Antes de começar, olha ali. Quando a grama se mexe, pode ser um Pokémon selvagem.");
  await talk(hero(), "E você simplesmente vai até ele?");
  await talk("Gael", "Primeiro, a gente vê se ele está tranquilo. Pokémon não são alvos para sair perseguindo.");
  await talk("Gael", "O Pikachu treinou demais ontem, hoje ele só assiste do meu ombro.", "Quem luta é o Starly. A gente se conheceu semana passada.");
  await talk("Pikachu", "Pika!");
  await talk(undefined, "A grama balança. Um Wurmple sai dela, curioso.");

  const demo = await BattleDemo.open("Demonstração do Gael", "grass", "wurmple", { name: "Wurmple", level: 3, hp: 16, max: 16 });
  await talk(undefined, "Um Wurmple selvagem apareceu!");
  await talk("Gael", "Vai, Starly!");
  await demo.sendOut("starly", { name: "Starly", level: 6, hp: 22, max: 22 });
  await talk("Gael", "Presta atenção. A cada turno você escolhe uma ação: lutar, usar um item, trocar de Pokémon ou fugir.", "Starly, Ataque Rápido!");
  await demo.strike("player", "quick_attack", 10);
  await talk(undefined, "A barra verde é o PS. Cada golpe que acerta tira um pedaço dela.");
  await demo.strike("foe", "string_shot", 22);
  await talk(undefined, "O Wurmple usou Fio de Seda! O Starly ficou mais lento.");
  await talk("Gael", "Nem todo golpe machuca. Alguns enfraquecem ou atrapalham.");
  await demo.strike("foe", "tackle", 17);
  await talk("Gael", "E agora ele revidou. Olha o PS do Starly, embaixo. Quem cuida do parceiro olha a barra dele também.");
  await talk(hero(), "Parece mais complicado do que na televisão.");
  await talk("Gael", "É. Mas também é mais interessante. Agora o truque: tipo.", "Wurmple é Inseto. Golpe Voador bate forte em Inseto. Starly, Lufada!");
  await demo.strike("player", "gust", 3, true);
  await talk(undefined, "É super eficaz! Voador contra Inseto causa o dobro de dano.");
  await talk("Gael", "Viu? Ele está quase sem PS. Não precisa machucar mais que isso.", "Com o PS baixo, a captura fica mais fácil. Olha só. Pokébola, vai!");
  await demo.capture(3, true);
  await talk(undefined, "Peguei! O Wurmple foi capturado.");
  await talk("Gael", "Ele balança três vezes. Se escapar, a gente tenta de novo ou deixa ele ir.");
  await demo.withdraw("player");
  await demo.close();

  await talk("Gael", "Conseguimos. Capturar não é o fim do trabalho, é o começo.");
  await talk("Pikachu", "Pika pika!");
  await talk("Gael", "Ele achou que eu demorei. Ele sempre acha.");
  await talk(hero(), "E eu vou precisar fazer isso também?");
  await talk("Gael", "Para enfrentar outros treinadores, é bom ter uma equipe. Mas ninguém precisa capturar tudo que encontra.");
  await talk(hero(), "Entendi. Pelo menos não vou entrar sem saber o básico.");
  await talk("Gael", "Exatamente. Pronto para voltar ao laboratório?");
  await talk(hero(), "Vamos.");
  setFlag("battle_demo");
  setFlag("capture_demo");
  await goal("Volte ao laboratório do Professor Dário, na praça, e escolha um parceiro.");
  autosave();
}

async function chooseStarter(id: StarterId): Promise<void> {
  if (!flag("capture_demo")) {
    await talk("Prof. Dário", "Ainda não. Primeiro encontre o Gael no começo da Rota 1, ao norte.");
    return;
  }
  if (flag("got_starter")) {
    await talk(undefined, id === state().starter ? "Esse é o seu parceiro." : "Essa Pokébola está vazia agora.");
    return;
  }
  const def = species(id);
  await talk("Prof. Dário", def.description);
  await talk(undefined, `${def.name} — ${def.types.map((t) => TYPE_NAME[t]).join("/")}.`);
  if (!(await yesNo(line("Prof. Dário", `Escolher ${def.name}?`), id))) return;
  const granted = useGame.getState().grantOnce("got_starter", (s) => {
    addMon(s, createMon(id, 5, defaultRng, { metAt: "Vila Brisamar" }));
    s.starter = id;
  });
  if (!granted) return;
  playSfx("catch");
  world().refreshNpcs();
  await talk(undefined, `${hero()} recebeu ${def.name}!`);
  await talk(hero(), "Oi... acho que vamos viajar juntos.", "Vou tentar fazer isso direito.");
  await talk("Prof. Dário", "Ele não precisa de alguém perfeito. Precisa de alguém que preste atenção nele.");
  await firstMission();
}

async function firstMission(): Promise<void> {
  await talk(
    "Prof. Dário",
    "Antes de viajar pela região, você precisará de uma Pokédex.",
    "Nossa colega, professora Celina, está em Ferrúria.",
  );
  await talk(hero(), "Ferrúria fica longe?");
  await talk("Prof. Dário", "Atravessando a Rota 1 e a Floresta de Aster, você chega lá.", "Se sair cedo e não tiver contratempos, dá para ir e voltar no mesmo dia.", "Mas não faça do relógio seu adversário. Você tem um Pokémon dependendo de você agora.");
  await talk(hero(), "Entendi.");
  await talk("Prof. Dário", "Na rota você vai encontrar outros treinadores. Alguns adoram desafiar quem está começando.");
  await talk(hero(), "Eu preferia chegar logo.");
  await talk("Prof. Dário", "O Gael imaginou isso. Ele ficou na Rota 1 e disse que te encontra depois.", "Tome estas Pokébolas e algumas Poções. E volte à vila antes de partir para longe, se tiver algo importante a resolver.");
  await giveOnce("ch1_balls", "pokeball", 5, "Prof. Dário");
  await giveOnce("ch1_potions", "potion", 2, "Prof. Dário");
  await talk(hero(), "Vou voltar. Preciso conversar com a minha mãe.");
  await talk("Prof. Dário", "Então boa viagem, {nome}. E não se esqueça: cuide do seu parceiro.");
  setFlag("license");
  await goal("Atravesse a Rota 1 e a Floresta de Aster. Procure a professora Celina em Ferrúria.");
  autosave();
}

async function darioTalk(): Promise<void> {
  if (!flag("talked_gael")) {
    await talk("Prof. Dário", "Bom dia. Se veio só olhar, fique à vontade. As Pokébolas da mesa ainda não são para hoje.");
    return;
  }
  if (!flag("met_dario")) return darioIntro();
  if (!flag("capture_demo")) {
    await talk("Prof. Dário", "O Gael está no começo da Rota 1, ao norte da vila, ao lado do caminho. Fale com ele lá. Escolher o seu Pokémon vem depois.");
    return;
  }
  if (!flag("got_starter")) {
    await talk("Prof. Dário", "Bem-vindo de volta. Se quiser seguir, chegou a hora de conhecer quem pode caminhar ao seu lado.", "As três Pokébolas estão na mesa. Examine cada uma antes de confirmar.");
    return;
  }
  if (!flag("license")) return firstMission();
  await talk("Prof. Dário", "Ferrúria fica depois da floresta. A professora Celina te espera. Cuide do seu parceiro no caminho.");
}

async function celinaTalk(): Promise<void> {
  if (!flag("license")) {
    await talk("Profª Celina", "Olá. Se veio do professor Dário, traga a licença provisória quando estiver com um parceiro.");
    return;
  }
  if (flag("got_pokedex")) {
    await talk("Profª Celina", "A Pokédex já está com você. Não precisa preencher tudo de uma vez.");
    return;
  }
  world().faceNpcToPlayer("celina");
  await talk("Profª Celina", "Pode entrar! Só um instante... pronto. Em que posso ajudar?");
  await talk(hero(), "Professor Dário me enviou. Vim buscar uma Pokédex.");
  await talk("Profª Celina", "Ah, então você é o novo treinador de Brisamar. Sou Celina.", "Esta é a Pokédex regional: ela registra os Pokémon que você encontra e ajuda a organizar informações úteis.");
  await talk(hero(), "Mesmo os que eu vi antes de ter o aparelho?");
  await talk("Profª Celina", "Sim. O registro da equipe e dos encontros fica guardado. Você só não tinha o aparelho para consultar tudo com facilidade.");
  playSfx("discover");
  await talk(undefined, `${hero()} recebeu a Pokédex de Asteria!`);
  await talk("Profª Celina", "Não precisa preencher tudo de uma vez. Uma jornada não precisa acontecer no ritmo de outra pessoa.", "Quando estiver preparado, poderá começar a reunir as insígnias.");
  await talk(hero(), "Obrigado, professora. Preciso voltar para casa antes de seguir.");
  await talk("Profª Celina", "Então faça isso. Tem coisas mais importantes do que chegar primeiro a algum lugar.");
  await talk(hero(), "É... tem.");
  setFlag("got_pokedex");
  setFlag("ch1_arrived_ferruria");
  await goal("Volte a Brisamar e se despeça da sua mãe.");
  autosave();
}

async function goodbye(): Promise<void> {
  world().faceNpcToPlayer("mother");
  await talk("Mãe", "Você voltou. Como foi com o Gael?");
  await talk(hero(), "Ele me levou ao laboratório. O professor Dário me ajudou a escolher um Pokémon.", "Eu fui até Ferrúria hoje. Consegui uma Pokédex e a licença de treinador.");
  await talk("Mãe", "Então temos alguém novo na família.", "Você foi até Ferrúria... sozinho? E por que toda essa pressa?");
  await talk(hero(), "Com meu Pokémon. Foi mais difícil do que eu imaginava.", "Eu vi uma notícia ontem. A Liga vai dar um prêmio grande para quem vencer o circuito.", "Sei que é difícil. Eu mal comecei. Mas o dinheiro poderia pagar a avaliação e o tratamento fora daqui.");
  await talk("Mãe", "É por isso que você quer participar?");
  await talk(hero(), "É.");
  await talk("Mãe", "Você nunca gostou muito desse tipo de competição.");
  await talk(hero(), "Não gosto. E não sei se vou conseguir ganhar. Mas preciso tentar alguma coisa.");
  await talk("Mãe", "Eu não quero que a minha doença seja o único motivo para você conhecer o mundo.");
  await talk(hero(), "Talvez agora seja. Não sei responder diferente.");
  await talk(
    "Mãe",
    "Está tudo bem não saber. Só me promete que vai prestar atenção ao que encontrar pelo caminho. Nas pessoas... e no Pokémon que vai depender de você.",
  );
  await talk(hero(), "Vou cuidar dele.");
  await talk("Mãe", "E de você também, combinado?", "O médico vai continuar me acompanhando, e eu tenho ajuda aqui na vila.", "Você não precisa imaginar que, quando sair por aquela porta, eu vou ficar desamparada.");
  await talk(hero(), "Eu precisava ouvir isso.");
  await talk("Mãe", "Fiz este lenço faz algum tempo. Guardei para quando você fosse viajar de verdade.");
  await talk(hero(), "Você já tinha preparado?");
  await talk("Mãe", "Mães costumam imaginar algumas coisas antes dos filhos.", "Quando puder, me conte como são os lugares. Não só sobre as batalhas.");
  await talk(hero(), "Vou tentar lembrar.");
  await talk("Mãe", "Não precisa lembrar de tudo. Basta viver o suficiente para ter algo para contar.");
  await talk("Mãe", "Vai com cuidado, meu amor.");
  await talk(hero(), "Você também. Por favor.", "Então... até logo.");
  await talk("Mãe", "Até logo.");
  if (!flag("ch1_scarf")) {
    setFlag("ch1_scarf");
    playSfx("discover");
    await talk(undefined, `${hero()} recebeu o Lenço da Mãe.`);
    const runKey = formatKey(useSettings.getState().keyboard.run.find(Boolean) || "KeyX");
    await talk(undefined, `Agora você pode correr! Segure ${runKey} enquanto anda.`);
  }
  setFlag("said_goodbye");
  await goal("Saia de casa e siga para o norte.");
  autosave();
}

async function shop(): Promise<void> {
  await talk("Dona Marta", "Bem-vindo à banca da Marta.");
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
    await talk("Dona Marta", `Aqui está: ${ITEMS[item].name}.`);
  }
}

const SIGNS: Record<string, string[]> = {
  sign_home: ["Casa de {nome}."],
  sign_lab: ["Laboratório Pokémon do Professor Dário."],
  sign_clinic: ["Clínica de Brisamar — atendimento comunitário."],
  sign_beach: ["Lago de Brisamar.", "A margem fica logo ao sul."],
  sign_route1: ["Rota 1 — Floresta de Aster.", "Leve água, cuide da sua equipe e respeite os Pokémon selvagens."],
  sign_forest: ["Floresta de Aster.", "A trilha segue para o norte, até Ferrúria."],
  sign_forest_in: ["Floresta de Aster.", "A saída para Ferrúria fica ao norte. A Rota 1, ao sul."],
  sign_clearing: ["Clareira de treinamento.", "A grama alta daqui é só para observação."],
  sign_ferruria: ["Cidade Ferrúria.", "O laboratório da professora Celina fica perto da praça."],
  sign_gym: ["Ginásio de Ferrúria — tipo Inseto.", "O desafio fica para depois. Hoje não."],
  sign_village: ["Vila Brisamar.", "Onde o vento do mar começa."],
  bedroom_shelf: ["Nunca terminei de ler."],
  bedroom_bag: ["Faz tempo que não uso isso."],
  bedroom_window: ["Ela já deve estar de pé."],
  kitchen_meds: ["Frascos de remédio lado a lado. Os rótulos estão gastos de tanto abrir e fechar."],
  stove: ["Uma chaleira ainda morna. Sua mãe acordou antes de você."],
  photo: ["Uma das poucas fotos antigas que a mãe guarda.", "O resto da imagem está fora de foco."],
  lab_books: ["Anotações sobre como um Pokémon e uma pessoa aprendem a se ouvir."],
  lab_machine: ["Uma máquina zumbindo baixinho. Nada aqui está pronto para ser levado embora."],
  lab_clearing: ["Fundo do laboratório. A trilha da clareira começa aqui."],
  clinic_desk: ["Uma mesa limpa, com espaço para uma pasta de exames."],
  celina_terminal: ["Aparelhos portáteis empilhados, ainda sem dono."],
};

const NPC_TALK: Record<string, () => Promise<void>> = {
  mother: motherTalk,
  mother_clinic: async () => {
    if (!flag("clinic_done")) await talk("Mãe", "Estou aqui. Pode falar com o médico.");
    else await talk("Mãe", "Vamos para casa. Eu vou andando com você.");
  },
  mother_town: async () => {
    if (flag("escort_lake")) {
      const here = world().playerTile();
      if (here.y >= 24) return lakeScene();
      await talk("Mãe", "A margem fica mais ao sul. Vamos até a água.");
      return;
    }
    if (flag("escort_home")) {
      await talk("Mãe", "Vamos para casa. Estou cansada.");
      return;
    }
    await talk("Mãe", "Pode ir na frente. Eu acompanho.");
  },
  mother_lake: async () => {
    await talk("Mãe", "Estou andando com você. Não fico parada na margem sem você.");
  },
  doctor: async () => {
    if (!flag("exams_delivered")) await talk("Médico", "A consulta de hoje precisa da pasta de exames. Traga sua mãe quando estiver com ela.");
    else if (!flag("clinic_done")) await clinicScene();
    else await talk("Médico", "Continuaremos acompanhando. Se os sintomas mudarem, voltem.");
  },
  gael: gaelTalk,
  gael_clearing: async () => {
    await talk("Gael", "A demonstração é na Rota 1, logo na entrada, ao lado do caminho. Sobe pelo norte de Brisamar.");
  },
  gael_route: lesson,
  gael_lab: async () => {
    if (!flag("met_dario")) await talk("Gael", "Fala com o professor. Eu fico aqui.");
    else await talk("Gael", "Eu te espero no começo da Rota 1. Sai pelo norte da vila. Não vou ficar no meio da estrada.");
  },
  lira: darioTalk,
  celina: celinaTalk,
  fisher: async () => {
    await talk("Pescador Davi", flag("got_pokedex") ? "Voltando tão cedo?" : "Quem gosta de explorar encontra Pokémon diferentes perto da água.");
    if (flag("got_pokedex")) await talk(hero(), "Tenho uma pessoa esperando por mim.");
    else await talk(hero(), "Talvez eu volte aqui outro dia.");
  },
  girl: async () => {
    await talk("Bia", "O Gael saiu cedo com o Pikachu dele. De novo!");
    await think("Ele nunca para quieto.");
  },
  elder: async () => {
    await talk("Seu Otávio", "Asteria fica no meio do mar, entre outras regiões.", "Ferrúria é a primeira cidade depois da floresta. Não tenha pressa de chegar.");
  },
  shopkeeper: async () => {
    if (!flag("got_starter")) {
      await talk("Dona Marta", "Sem Pokémon ainda? Volte quando tiver um parceiro. Aí eu te vendo Poções.");
      return;
    }
    await shop();
  },
  kid: async () => {
    await talk("Tico", "Quando eu crescer vou ter um Pokémon também!", "Mas hoje eu só quero chegar em casa antes de escurecer.");
  },
  neighbor: async () => {
    await talk("Dona Célia", "Bom dia! Que manhã bonita, não é?", "Se precisar de alguma coisa, é só bater aqui.");
  },
  youngster: async () => {
    if (!flag("license")) {
      await talk("Jovem Teo", "Ei! Quando você tiver um Pokémon, a gente batalha. Sem pressa.");
      return;
    }
    const won = await trainerBattle("youngster_caio", "youngster");
    if (won) await think("Você se saiu bem. Vamos continuar.");
  },
  picnic_mel: async () => {
    if (!flag("license")) return talk("Piqueniqueira Mel", "Quando tiver um parceiro, volta aqui. Ninguém passa sem batalhar comigo!");
    if (flag("beat_picnic_mel")) return void (await trainerBattle("picnic_mel", "picnic_mel"));
    await spottedBy("picnic_mel", "picnic_mel");
  },
  hiker: async () => {
    await talk("Viajante", "Ferrúria tem o primeiro ginásio da região. O laboratório da professora fica perto da praça.");
    await talk(hero(), "É depois da floresta, certo?");
    await talk("Viajante", "Isso mesmo.");
  },
  bia_forest: async () => {
    if (!flag("license")) return;
    const won = await trainerBattle("scout_bia", "bia_forest");
    if (won) await talk(hero(), "Estamos aprendendo.");
  },
  ravi: async () => {
    if (flag("beat_ravi")) {
      await talk("Aprendiz Ravi", "Acho que preciso treinar mais.");
      return;
    }
    await talk("Aprendiz Ravi", "Está levando seu parceiro para conhecer a floresta? Eu também comecei há pouco!");
    await talk(hero(), "Só estou atravessando.");
    if (await yesNo(line("Aprendiz Ravi", "Então uma batalha rápida não vai atrasar tanto."))) {
      if (await trainerBattle("ravi", "ravi")) await talk(hero(), "Eu também.");
    } else await talk("Aprendiz Ravi", "Tudo bem. A trilha do norte segue para Ferrúria.");
  },
  lost_kid: async () => {
    if (flag("helped_lost_kid")) {
      await talk("Criança", "A trilha da esquerda. Eu lembro agora. Obrigada!");
      return;
    }
    await talk("Criança", "Desculpa... você viu a placa para a Rota 1? Eu passei por ela e não lembro onde fica.");
    await talk(hero(), "Fica para trás, ao sul. Cuidado para não entrar na grama alta sem um Pokémon com você.");
    await talk("Criança", "Ah! Obrigada!");
    setFlag("helped_lost_kid");
  },
  ferruria_local: async () => {
    await talk("Morador", "Primeira vez em Ferrúria? O ginásio é bem famoso!");
    await talk(hero(), "Estou procurando o laboratório da professora Celina.");
    await talk("Morador", "É o prédio grande da rua de cima, o último à direita.");
    if (!flag("ch1_arrived_ferruria")) {
      setFlag("ch1_arrived_ferruria");
      await goal("Encontre o laboratório da professora Celina.");
    }
  },
  ferruria_trainer: async () => {
    await talk("Treinadora", "Vou conseguir minha primeira insígnia hoje!");
    await talk(hero(), "Boa sorte.");
    await talk("Treinadora", "Você também vai desafiar o ginásio?");
    await talk(hero(), "Não hoje. Tenho uma coisa para resolver primeiro.");
  },
  item_potion: async () => {
    if (await giveOnce("route1_potion", "potion", 1)) world().refreshNpcs();
  },
  ren_gate: async () => talk("Gael", "O laboratório fica mais para baixo, perto da praça."),
  ren_lab: async () => talk("Gael", "A clareira é no fundo do laboratório."),
  ren_route1: async () => talk("Gael", "Eu fico por aqui. Você segue. A gente se vê depois."),
};

const NPC_VISIBLE: Record<string, () => boolean> = {
  ren_gate: () => false,
  ren_lab: () => false,
  ren_route1: () => false,
  gael: () => flag("night_decision"),
  gael_lab: () => flag("talked_gael") && !flag("met_dario"),
  gael_town: () => false,
  gael_clearing: () => false,
  gael_route: () => flag("met_dario") && !flag("license"),
  mother_town: () => Boolean(escorting()),
  mother_clinic: () => flag("escort_clinic") || (flag("clinic_done") && flag("escort_home")),
  mother_lake: () => false,
  item_potion: () => !flag("route1_potion"),
  lab_ball_torchic: () => flag("capture_demo") && state().starter !== "torchic",
  lab_ball_bulbasaur: () => flag("capture_demo") && state().starter !== "bulbasaur",
  lab_ball_froakie: () => flag("capture_demo") && state().starter !== "froakie",
};

async function examFolder(): Promise<void> {
  if (!flag("ch1_morning")) {
    await talk(undefined, "Uma pasta de exames da mãe. Ela ainda não pediu.");
    return;
  }
  if (flag("tv_off")) {
    await talk(undefined, "A pasta já está com você.");
    return;
  }
  if (!flag("exam_collected")) {
    setFlag("exam_collected");
    playSfx("discover");
    await talk(undefined, `${hero()} pegou a pasta de exames.`);
  }
  await talk("Apresentador", "Atenção, treinadores de Asteria! Estão abertas as inscrições para a nova temporada do circuito da Liga Pokémon!");
  await talk("Apresentador", "O vencedor da fase final receberá o título de Campeão e a maior premiação em dinheiro já oferecida pelo circuito!");
  await think("É muito dinheiro...");
  await talk("Apresentador", "Para disputar a fase final, os participantes deverão conquistar oito insígnias e superar os desafios de toda a região!");
  await think("Oito ginásios?");
  await talk("Mãe", "{nome}? Encontrou a pasta?");
  await talk(hero(), "Encontrei! Já estou descendo.");
  await talk(undefined, "A televisão continua ligada, bem baixinho. Dá para desligar no aparelho.");
  await goal("Desligue a televisão e entregue os exames.");
}

async function television(): Promise<void> {
  if (!flag("exam_collected")) {
    await talk(undefined, "A TV está ligada bem baixinho. Nem reparei que estava ligada.");
    return;
  }
  if (flag("lake_done") && !flag("night_decision")) return nightDecision();
  if (flag("tv_off")) {
    await talk(undefined, "A televisão está desligada.");
    return;
  }
  await talk(undefined, "Desligar televisão.");
  playSfx("confirm");
  setFlag("tv_off");
  await think("Não é hora de pensar nisso.");
  await goal("Entregue os exames à sua mãe.");
  autosave();
}

const hooks: StoryHooks = {
  npcVisible: (id) => {
    ensure();
    return CH2_VISIBLE[id]?.() ?? NPC_VISIBLE[id]?.() ?? true;
  },
  talk: async (id) => {
    ensure();
    const run = (flag("chapter1_complete") || !NPC_TALK[id] ? CH2_TALK[id] : undefined) ?? NPC_TALK[id];
    if (run) await run();
  },
  sign: async (id) => {
    ensure();
    if (id.startsWith("ball_")) {
      await chooseStarter(id.replace("ball_", "") as StarterId);
      return;
    }
    if (id === "exam_folder") return examFolder();
    if (id === "bedroom_pc") return television();
    if (id === "bedroom_bed") return sleepInBed();
    if (CH2_SIGN_RUN[id]) return CH2_SIGN_RUN[id]();
    const text = (flag("chapter1_complete") ? CH2_SIGNS[id] : undefined) ?? SIGNS[id] ?? CH2_SIGNS[id];
    if (text) await talk(undefined, ...text.map((lineText) => lineText.replaceAll("{nome}", hero())));
  },
  event: async (id) => {
    ensure();
    if (id === "north_gate") {
      if (!flag("ch1_morning")) {
        await think("A mãe está lá embaixo.");
        return true;
      }
      if (!flag("met_dario") && !flag("license")) {
        await think(flag("night_decision") ? "O professor Dário ainda não me mandou subir para a Rota 1." : "Hoje eu fico com a mãe. A rota pode esperar.");
        return true;
      }
      if (flag("capture_demo") && !flag("license")) {
        await think("O Gael já mostrou. Agora eu volto ao laboratório para escolher um parceiro.");
        return true;
      }
      return false;
    }
    if (id === "forest_edge") {
      if (!flag("license")) {
        await think("A floresta fica depois que eu tiver com quem caminhar.");
        return true;
      }
      if (!flag("reached_forest")) {
        setFlag("reached_forest");
        await think("Então é aqui que os treinadores praticam. Melhor conferir as Pokébolas antes de seguir.");
      }
      return false;
    }
    return false;
  },
  enterMap: async (key) => {
    ensure();
    if (key === "house_2f") {
      await wakeUp();
      if (flag("lake_done") && !flag("night_decision")) await goal("É noite. Deite na cama para dormir. Amanhã você fala com o Gael.");
    }
    if (key === "house_1f" && flag("escort_home")) {
      setFlag("escort_home", false);
      const w = world();
      w.follow(null);
      w.placeNpc("mother", 9, 4, "down");
      w.setNpcVisible("mother", true);
      if (flag("clinic_done") && !flag("home_after_clinic")) await goal("Fale com a sua mãe.");
    }
    if (key === "lab" && flag("talked_gael") && !flag("capture_demo")) {
      if (!flag("gael_entered_lab")) {
        setFlag("gael_entered_lab");
        const w = world();
        w.placeNpc("gael_lab", 6, 9, "up");
        w.setNpcVisible("gael_lab", true);
        await w.moveNpc("gael_lab", ["up", "up"]);
      }
      await goal(
        flag("met_dario")
          ? "Saia de Brisamar pelo norte. O Gael está no começo da Rota 1, ao lado do caminho."
          : "O Gael entrou com você. Chegue perto do Professor Dário e aperte Z.",
      );
    }
    if (flag("met_dario") && !flag("capture_demo") && key === "route1") await goal("O Gael está ao lado do caminho. Aperte Z para a aula.");
    if (flag("met_dario") && !flag("capture_demo") && key === "brisamar" && !flag("gael_walked_town")) {
      setFlag("gael_walked_town");
      const w = world();
      w.placeNpc("gael_town", 24, 21, "left");
      w.setNpcVisible("gael_town", true);
      await w.emote("gael_town", "!");
      await talk("Gael", "Vem, {nome}! É por aqui, pelo norte!");
      await w.moveNpc("gael_town", ["left", "left", "left", "up", "up", "up", "up", "up", "up", "up", "up", "left", "up", "up", "up", "up", "up"]);
      w.setNpcVisible("gael_town", false);
    }
    if (flag("met_dario") && !flag("capture_demo") && key === "route1" && !flag("gael_waved")) {
      setFlag("gael_waved");
      await world().emote("gael_route", "!");
      await talk("Gael", "Aqui, {nome}! Chega perto que eu te mostro.");
    }
    if (flag("met_dario") && !flag("capture_demo") && key === "brisamar") await goal("Saia pelo norte. O Gael espera no começo da Rota 1, fora da trilha.");
    bringMother(key);
    if (key === "route1" && !flag("reached_route1") && flag("license")) {
      setFlag("reached_route1");
      useUi.getState().showToast("Rota 1");
      await think("Floresta de Aster... depois Ferrúria. Se não me perder, ainda volto hoje.");
    }
    if (key === "ferruria" && !flag("ch1_saw_ferruria")) {
      setFlag("ch1_saw_ferruria");
      await talk(undefined, "Cidade Ferrúria.");
      await think("Consegui. Agora só preciso achar a professora Celina.");
    }
    if (key === "brisamar" && flag("got_pokedex") && !flag("said_goodbye") && !flag("ch1_back_home_hint")) {
      setFlag("ch1_back_home_hint");
      await goal("Entre em casa e converse com a sua mãe.");
    }
    await ch2Enter(key);
  },
  canWarp: async (from, to) => {
    ensure();
    const ch2 = await ch2CanWarp(from, to);
    if (ch2 !== null) return ch2;
    if (from === "house_1f" && to === "brisamar" && !flag("ch1_morning")) {
      await talk("Mãe", "{nome}? Vem cá um minutinho antes de sair.");
      return false;
    }
    if (to === "route1" && from === "brisamar" && !flag("met_dario") && !flag("license")) {
      await think(flag("night_decision") ? "Primeiro eu falo com o professor Dário. A rota abre quando ele mandar." : "Hoje eu fico com a mãe.");
      return false;
    }
    if (to === "route1" && from === "brisamar" && flag("capture_demo") && !flag("license")) {
      await think("O Gael já mostrou a batalha. Falta escolher o meu Pokémon no laboratório.");
      return false;
    }
    if ((to === "forest" || to === "ferruria" || to === "clearing") && !flag("met_dario") && to === "clearing") {
      await think("O professor ainda não pediu para eu ir até a clareira.");
      return false;
    }
    if ((to === "forest" || to === "ferruria") && !flag("license")) {
      await think("Sem a licença e um parceiro, esse caminho fica para depois.");
      return false;
    }
    if (from === "brisamar" && to === "route1" && flag("said_goodbye") && !flag("chapter1_complete")) {
      setFlag("chapter1_complete");
      setFlag("met_ren_route1");
      await think("Ainda não sei como vou chegar até o fim.", "Só sei por que preciso começar.");
      await talk(undefined, "Capítulo 1 concluído — O Preço de uma Esperança.");
      useUi.getState().setHint(null);
      autosave();
    }
    return true;
  },
  wild: async (mapKey) => {
    if (!flag("license")) return;
    await wildEncounter(mapKey);
  },
  watcher: (npc) => watching(npc),
  spotted: (npc) => spotted(npc),
};

export function installChapter1(): void {
  story.hooks = hooks;
  useUi.getState().setHint(null);
}
