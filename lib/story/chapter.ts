import type { Direction } from "@/lib/character/types";
import { placeRuntime, runtime } from "@/lib/game/runtime";
import { useSave } from "@/lib/save/store";
import { bounds, play } from "@/lib/story/control";
import { useScene } from "@/lib/story/scene";
import type { Line, MapId, StarterId, StoryState } from "@/lib/story/types";
import { STARTERS, advantageLine, freshStory, rivalOf } from "@/lib/story/types";
import { MAPS, TILE, npcsFor, tileCenter } from "@/lib/story/world";

export function storyOf(): StoryState {
  return useSave.getState().slot?.story ?? freshStory();
}

export function playerName(): string {
  return useSave.getState().slot?.appearance.name || "Viajante";
}

function speak(text: string): string {
  return text.replaceAll("{name}", playerName());
}

function lines(entries: Line[]): Line[] {
  return entries.map((line) => ({ ...line, text: speak(line.text) }));
}

export function commit(story: StoryState, place?: { x: number; y: number; direction: Direction }) {
  const slot = useSave.getState().slot;
  if (!slot) return;
  useSave.getState().write({
    ...slot,
    story,
    x: place?.x ?? runtime.x,
    y: place?.y ?? runtime.y,
    direction: place?.direction ?? runtime.direction,
  });
  if (place) placeRuntime(place.x, place.y, place.direction);
}

export function moveTo(map: MapId, col: number, row: number, direction: Direction) {
  const world = MAPS[map];
  const spot = tileCenter(col, row, world.rows);
  bounds.w = world.cols * TILE;
  bounds.h = world.rows * TILE;
  const story = { ...storyOf(), map };
  commit(story, { x: spot.x, y: spot.y, direction });
  play.doorLock = 0.45;
}

export function wakeIfNeeded() {
  const story = storyOf();
  if (story.woke || story.map !== "house") return;
  commit({ ...story, woke: true });
  useScene.getState().say(
    lines([
      { speaker: "", text: "A casa está quieta. O cheiro de remédio continua na mesa." },
      { speaker: "", text: "Ela está na cadeira da janela. Preciso falar com ela." },
    ]),
  );
}

function sayThen(entries: Line[], after?: () => void) {
  useScene.getState().say(lines(entries), after);
}

export function talkTo(id: string) {
  const story = storyOf();
  const name = playerName();
  if (id === "mother") {
    if (!story.motherBlessing) {
      sayThen(
        [
          { speaker: "Mãe", text: `${name}. Você está de pé cedo.` },
          { speaker: "Mãe", text: "Dormiu olhando aqueles papéis de novo?" },
          { speaker: name, text: "O tratamento não espera." },
          { speaker: "Mãe", text: "Eu sei. Os remédios estão na mesa. O resto custa mais do que esta casa." },
          { speaker: name, text: "A Liga paga quem vence. É o suficiente." },
          { speaker: "Mãe", text: "Você não gosta de batalhar." },
          { speaker: name, text: "Não preciso gostar." },
          {
            speaker: "Mãe",
            text: "A Professora Lira está entregando iniciais hoje, no posto da praça. Escute ela antes de escolher uma estrada.",
          },
          { speaker: "Mãe", text: "E volte para me contar. A porta fica aberta." },
        ],
        () => commit({ ...storyOf(), motherBlessing: true }),
      );
      return;
    }
    sayThen([
      { speaker: "Mãe", text: "Lira está no posto, perto da praça. Eu fico bem." },
      { speaker: "Mãe", text: "Se for mesmo embora, não suma. Esta casa continua sua." },
    ]);
    return;
  }

  if (id === "lira") {
    if (!story.motherBlessing) {
      sayThen([
        { speaker: "Professora Lira", text: "Sua mãe ainda está te esperando em casa." },
        { speaker: "Professora Lira", text: "Fale com ela primeiro. Eu não entrego um parceiro para quem foge pela porta dos fundos." },
      ]);
      return;
    }
    if (!story.choseStarter) {
      sayThen(
        [
          { speaker: "Professora Lira", text: `${name}. Sua mãe disse que você viria. Ou eu esperava que viesse.` },
          { speaker: "Professora Lira", text: "Três Pokémon aceitaram ficar aqui. Nenhum deles é um prêmio. São parceiros." },
          { speaker: "Professora Lira", text: "Torchic carrega o fogo. Bulbasaur, a calma da mata. Froakie, a água que não fica parada." },
          { speaker: "Professora Lira", text: "Quem vai com você?" },
        ],
        () => {
          useScene.getState().setChoice({
            title: "Quem vai com você?",
            index: 0,
            options: [
              { id: "torchic", label: "Torchic" },
              { id: "bulbasaur", label: "Bulbasaur" },
              { id: "froakie", label: "Froakie" },
            ],
          });
        },
      );
      return;
    }
    const chosen = STARTERS[story.starter ?? "torchic"];
    sayThen([
      { speaker: "Professora Lira", text: `${chosen.name} está com você. Cuide dele como quem cuida de casa.` },
      { speaker: "Professora Lira", text: "Ren está lá fora. Ele não deixa ninguém atravessar a vila em silêncio." },
    ]);
    return;
  }

  if (id === "ren") {
    if (!story.choseStarter || !story.starter) {
      sayThen([{ speaker: "Ren", text: "Primeiro passa no posto da Lira. Depois a gente conversa." }]);
      return;
    }
    if (!story.tutorialDone) {
      const chosen = STARTERS[story.starter];
      sayThen(
        [
          { speaker: "Ren", text: `${name}! Finalmente saiu de casa.` },
          { speaker: "Ren", text: "Sou o Ren. A gente se cruza na praça desde criança, lembra?" },
          { speaker: name, text: "Lembro." },
          { speaker: "Ren", text: "Então é verdade. Você vai atrás da Liga." },
          { speaker: name, text: "Pelo dinheiro. Pela minha mãe." },
          { speaker: "Ren", text: "Eu sei. Mesmo assim, um Pokémon não é uma ferramenta." },
          { speaker: "Ren", text: `${chosen.name} aceitou ir com você. Deixa eu te mostrar a primeira coisa.` },
          { speaker: "Ren", text: "Uma batalha só. Eu seguro o golpe." },
        ],
        () => {
          useScene.getState().setBattle({
            rivalId: rivalOf(story.starter as StarterId),
            playerHp: 24,
            rivalHp: 24,
          });
        },
      );
      return;
    }
    sayThen([
      { speaker: "Ren", text: "A Rota 1 é ao norte. Eu te alcanço antes de Ferrúria." },
      { speaker: name, text: "Não precisa." },
      { speaker: "Ren", text: "Eu sei. Vou mesmo assim." },
    ]);
    return;
  }

  if (id === "fisher") {
    sayThen([
      { speaker: "Pescador", text: "O mar andou estranho. Ondas fora de hora, e nenhum cardume onde sempre teve." },
      { speaker: "Pescador", text: "Se for para o norte, leve comida. A mata não perdoa pressa." },
    ]);
    return;
  }

  if (id === "sign") {
    const storyNow = storyOf();
    sayThen([{ speaker: "Placa", text: "Rota 1. Ferrúria fica depois da Floresta de Aster." }]);
    if (!storyNow.routeSeen) commit({ ...storyNow, routeSeen: true });
  }
}

export function chooseStarter(id: StarterId) {
  const story = storyOf();
  const chosen = STARTERS[id];
  commit({ ...story, choseStarter: true, starter: id });
  useScene.getState().setChoice(null);
  sayThen([
    { speaker: "Professora Lira", text: `${chosen.name} te olhou de volta. Não é um prêmio. É confiança.` },
    { speaker: "Professora Lira", text: "Ren está lá fora. Passe por ele antes de pensar na estrada." },
  ]);
}

export function strike() {
  const scene = useScene.getState();
  const battle = scene.battle;
  const story = storyOf();
  if (!battle || !story.starter) return;
  const player = STARTERS[story.starter];
  const rival = STARTERS[battle.rivalId];
  const rivalHp = Math.max(0, battle.rivalHp - 13);
  const playerHp = rivalHp === 0 ? battle.playerHp : Math.max(1, battle.playerHp - 6);
  useScene.getState().setBattle({ ...battle, rivalHp, playerHp });
  const done = rivalHp === 0;
  sayThen(
    [
      { speaker: "", text: `${player.name} usou ${player.move}!` },
      { speaker: "", text: done ? `${rival.name} não consegue continuar.` : `${rival.name} usou ${rival.move}!` },
    ],
    () => {
      if (!done) return;
      useScene.getState().setBattle(null);
      commit({ ...storyOf(), tutorialDone: true });
      sayThen([
        { speaker: "Ren", text: "Viu? Ele lutou com você. Não por um prêmio." },
        { speaker: "Ren", text: advantageLine(story.starter as StarterId) },
        { speaker: "Ren", text: "A Rota 1 fica ao norte. Eu te alcanço." },
        { speaker: playerName(), text: "Não precisa." },
        { speaker: "Ren", text: "Eu sei. Vou mesmo assim." },
      ]);
    },
  );
}

export function doorBlocked() {
  sayThen([{ speaker: "", text: "Ainda não. Ela está na janela." }]);
}

export function faceGate() {
  const story = storyOf();
  if (!story.choseStarter) {
    sayThen([{ speaker: "", text: "A mata ao norte não é lugar para ir sem um Pokémon." }]);
    return;
  }
  sayThen([{ speaker: "", text: "Ren ainda está na frente do posto. A estrada pode esperar essa conversa." }]);
}
