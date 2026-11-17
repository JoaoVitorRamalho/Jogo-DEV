export type QuestStep = { flag: string; text: string };
export type QuestDef = { id: string; title: string; act: number; steps: QuestStep[] };

export const QUESTS: QuestDef[] = [
  {
    id: "act1_start",
    title: "A necessidade",
    act: 1,
    steps: [
      { flag: "talked_mother", text: "Desça e converse com a mãe na sala." },
      { flag: "entered_lab", text: "Vá ao laboratório da Professora Lira, perto da praça." },
      { flag: "got_starter", text: "Escolha um parceiro com a Professora Lira." },
      { flag: "rival_battle_done", text: "Ren quer testar o seu parceiro." },
      { flag: "got_pokedex", text: "Ouça as orientações da Professora Lira." },
      { flag: "said_goodbye", text: "Volte para casa e conte para a mãe." },
      { flag: "reached_route1", text: "Siga para o norte, pela Rota 1." },
      { flag: "reached_forest", text: "Atravesse a Rota 1 até a entrada da Floresta de Aster." },
    ],
  },
];

export function questProgress(quest: QuestDef, flags: Record<string, unknown>): { done: number; current: QuestStep | null } {
  let done = 0;
  for (const step of quest.steps) {
    if (!flags[step.flag]) return { done, current: step };
    done += 1;
  }
  return { done, current: null };
}
