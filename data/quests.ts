export type QuestStep = { flag: string; text: string };
export type QuestDef = { id: string; title: string; act: number; steps: QuestStep[] };

export const QUESTS: QuestDef[] = [
  {
    id: "act1_start",
    title: "A necessidade",
    act: 1,
    steps: [
      { flag: "ch1_morning", text: "Desça e converse com a sua mãe." },
      { flag: "exams_delivered", text: "Busque a pasta de exames e entregue à mãe." },
      { flag: "clinic_done", text: "Acompanhe sua mãe até a clínica." },
      { flag: "home_after_clinic", text: "Volte para casa com a sua mãe." },
      { flag: "lake_done", text: "Acompanhe sua mãe até o lago." },
      { flag: "night_decision", text: "À noite, olhe de novo para o orçamento." },
      { flag: "talked_gael", text: "Fale com o Gael sobre como começar." },
      { flag: "capture_demo", text: "Acompanhe a aula do Gael na clareira." },
      { flag: "got_starter", text: "Escolha um parceiro com o Professor Dário." },
      { flag: "license", text: "Receba a licença e siga para Ferrúria." },
      { flag: "got_pokedex", text: "Fale com a Professora Celina em Ferrúria." },
      { flag: "said_goodbye", text: "Volte para casa e se despeça da sua mãe." },
      { flag: "chapter1_complete", text: "Saia de Brisamar e comece a jornada." },
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
