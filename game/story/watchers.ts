import { world } from "@/game/phaser/bridge";
import { flag, hasHealthyMon, spottedBy } from "@/game/story/actions";

/**
 * Treinadores que desafiam quem cruza a frente deles (NPC do mapa → treinador da batalha).
 * Passou na linha de visão, ele vê, vem até você e a luta é obrigatória.
 * Líder de ginásio e rival ficam de fora: a luta deles é cena da história.
 */
const WATCHERS: Record<string, string> = {
  youngster: "youngster_caio",
  picnic_mel: "picnic_mel",
  r2_rui: "hiker_rui",
  r2_tais: "scout_tais",
  r2_trainer_a: "camper_luan",
  r2_trainer_b: "watcher_nina",
  r2_grove_kid: "explorer_lu",
  ferruria_bug: "bug_davi",
  gym_trainer_1: "gym_lia",
  gym_trainer_2: "gym_tome",
  // Capítulo 3
  r3_trainer_1: "r3_nara",
  r3_trainer_2: "r3_bel",
  r3_trainer_3: "r3_teo",
  v_gym_trainer_1: "v_gym_igor",
  v_gym_trainer_2: "v_gym_ana",
};

/** Esse NPC ainda luta com quem passar na frente dele? */
export function watching(npc: string): boolean {
  const trainer = WATCHERS[npc];
  return Boolean(trainer) && flag("license") && !flag(`beat_${trainer}`) && hasHealthyMon();
}

/** Ele viu o jogador: exclamação, vem andando e a batalha começa. */
export async function spotted(npc: string): Promise<void> {
  const trainer = WATCHERS[npc];
  if (!trainer) return;
  await spottedBy(trainer, npc);
  // A vitória pode abrir caminho (a cerca do Dojo de Verdelume some quando o faixa perde).
  world().refreshNpcs();
}
