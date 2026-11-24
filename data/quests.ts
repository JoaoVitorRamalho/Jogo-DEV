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
  {
    id: "act2_silk",
    title: "Ninho de Seda",
    act: 2,
    steps: [
      { flag: "ch2_started", text: "Atravesse a Rota 2 para o norte e chegue a Ferrúria." },
      { flag: "ch2_met_cora", text: "Encontre Cora na clareira central da Floresta de Aster, a oeste da trilha norte." },
      { flag: "ch2_gym_intro", text: "Volte ao ginásio de telhado verde, no noroeste de Ferrúria." },
      { flag: "beat_leader_cora", text: "Abra as teias usando os casulos e enfrente Cora." },
      { flag: "ch2_rival", text: "Saia do ginásio e enfrente Gael." },
      { flag: "chapter2_complete", text: "Investigue a obra na saída norte de Ferrúria." },
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
