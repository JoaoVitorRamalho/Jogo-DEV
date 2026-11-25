export type QuestStep = { flag: string; text: string; skipIf?: string };
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
  {
    id: "act2_verdelume",
    title: "Ecos sob a Pedra",
    act: 2,
    steps: [
      ...[
        { flag: "ch3_started", text: "Fale com os operários na saída norte de Ferrúria." },
        { flag: "r2_grove_open", text: "Saia de Ferrúria pelo sul e fale com o guarda no leste da Rota 2." },
        { flag: "ch3_grove_entered", text: "Entre na trilha ao fundo do Bosque do Orvalho, a leste da clareira." },
        { flag: "r3_seen", text: "Atravesse o bosque até a saída norte para a Rota 3." },
        { flag: "ch3_cave_help", text: "Encontre Nádia na entrada da galeria, no mirante leste da Rota 3." },
        { flag: "beat_rocket_echo_1", text: "Entre na Galeria do Eco e passe pelo primeiro recruta." },
        { flag: "beat_rocket_echo_2", text: "Atravesse a galeria e enfrente o segundo recruta." },
        { flag: "beat_rocket_echo_lead", text: "Enfrente o encarregado na sala ao norte." },
        { flag: "ch3_machine_off", text: "Desligue o painel na parede a leste do cercado." },
        { flag: "ch3_bidoof_safe", text: "Entre no cercado e ajude Bidoof a sair." },
        { flag: "ch3_cave_rescued", text: "Volte ao acampamento e entregue Bidoof a Nádia." },
      ].map((step) => ({ ...step, skipIf: "ch3_arrived" })),
      { flag: "ch3_arrived", text: "Siga pela Rota 3 até a Cidade Verdelume." },
      { flag: "ch3_field", text: "Visite o Campo de treinamento, a sudeste de Verdelume." },
      { flag: "beat_leader_verdelume", text: "Vença os faixas do Dojo e enfrente o Líder." },
      { flag: "chapter3_complete", text: "Termine o capítulo." },
    ],
  },
];

export function questProgress(quest: QuestDef, flags: Record<string, unknown>): { done: number; current: QuestStep | null } {
  let done = 0;
  for (const step of quest.steps) {
    if (!flags[step.flag] && !(step.skipIf && flags[step.skipIf])) return { done, current: step };
    done += 1;
  }
  return { done, current: null };
}
