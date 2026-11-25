import { CITIES } from "@/data/cities";
import type { Direction } from "@/game/character/appearance";

/** Onde o jogador pousa ao voar para a cidade: um tile livre na frente do Centro (ou da casa). */
export type FlyLanding = { cityId: string; map: string; x: number; y: number; dir: Direction };

/**
 * Só cidade com mapa entra aqui. JOÃO: cidade nova ganha uma linha quando o mapa dela existir
 * (um tile abaixo da porta do Centro, olhando para baixo). O teste de mapas confere se o tile é livre.
 */
export const FLY_LANDINGS: FlyLanding[] = [
  { cityId: "brisamar", map: "brisamar", x: 10, y: 13, dir: "down" },
  { cityId: "ferruria", map: "ferruria", x: 15, y: 10, dir: "down" },
  { cityId: "verdelume", map: "verdelume", x: 15, y: 10, dir: "down" },
];

/** Posição de cada cidade no mapa da região do Voo (0 a 100, de cima para baixo). */
export const FLY_PINS: Record<string, { x: number; y: number }> = {
  brisamar: { x: 14, y: 82 },
  ferruria: { x: 16, y: 56 },
  verdelume: { x: 20, y: 30 },
  porto_coral: { x: 44, y: 86 },
  oraculo: { x: 40, y: 54 },
  velaria: { x: 56, y: 44 },
  draconia: { x: 60, y: 22 },
  floraviva: { x: 82, y: 70 },
  noctaria: { x: 84, y: 40 },
  planalto_liga: { x: 50, y: 8 },
};

/** Caminhos desenhados no mapa do Voo. JOÃO: ligue duas cidades aqui quando a rota entre elas existir. */
export const FLY_ROUTES: [string, string][] = [
  ["brisamar", "ferruria"],
  ["ferruria", "verdelume"],
];

/** Flag que libera a cidade no Voo. Liga sozinha na primeira vez que o jogador entra nela. */
export function flyFlag(cityId: string): string {
  return `fly_unlock_${cityId}`;
}

/** Flag de Voo da cidade a que este mapa pertence (rua ou interior), se a cidade tiver pouso. */
export function flyFlagForMap(map: string): string | null {
  const city = CITIES.find((entry) => entry.maps.includes(map));
  if (!city || !FLY_LANDINGS.some((spot) => spot.cityId === city.id)) return null;
  return flyFlag(city.id);
}

export type FlyMenuEntry = FlyLanding & { name: string };

/** Cidades liberadas para o Voo, na ordem da viagem. */
export function flyDestinations(flags: Readonly<Record<string, boolean | undefined>>): FlyMenuEntry[] {
  return FLY_LANDINGS.filter((spot) => flags[flyFlag(spot.cityId)]).map((spot) => ({
    ...spot,
    name: CITIES.find((city) => city.id === spot.cityId)?.name ?? spot.cityId,
  }));
}
