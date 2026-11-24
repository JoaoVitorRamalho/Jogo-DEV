export type TimeOfDay = "morning" | "afternoon" | "dusk" | "night";

/** Hora do dia segue a história: manhã, tarde depois da clínica, fim de tarde em casa, noite no lago. */
export function timeOfDay(flags: Record<string, boolean> | undefined): TimeOfDay {
  if (!flags || flags.slept || flags.night_decision) return "morning";
  if (flags.lake_done) return "night";
  if (flags.home_after_clinic) return "dusk";
  if (flags.clinic_done) return "afternoon";
  return "morning";
}

/** Mapas a céu aberto: só eles recebem luz do dia. Interiores e batalhas ficam com a cor normal. */
export const OUTDOOR_MAPS = new Set(["brisamar", "route1", "clearing", "forest", "route2", "ferruria", "art_lab"]);

type Look = { grade: number; vignette: number; glow: number; glowTint: number; lamp: number };

export const DAY_LOOK: Record<TimeOfDay, Look> = {
  morning: { grade: 0xffffff, vignette: 0, glow: 0, glowTint: 0xffc070, lamp: 0 },
  afternoon: { grade: 0xffe4bc, vignette: 0.12, glow: 0, glowTint: 0xffc070, lamp: 0 },
  dusk: { grade: 0xf2b490, vignette: 0.3, glow: 0.5, glowTint: 0xff9a40, lamp: 0.12 },
  night: { grade: 0x5866a8, vignette: 0.5, glow: 0.9, glowTint: 0xffbe6a, lamp: 0.2 },
};
