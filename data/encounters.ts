export type EncounterSlot = { species: string; min: number; max: number; weight: number };
export type EncounterTable = { rate: number; grass: EncounterSlot[]; background: string };

export const ENCOUNTERS: Record<string, EncounterTable> = {
  route1: {
    rate: 0.1,
    background: "grass",
    grass: [
      { species: "bidoof", min: 2, max: 4, weight: 18 },
      { species: "pidgey", min: 2, max: 4, weight: 18 },
      { species: "starly", min: 2, max: 4, weight: 10 },
      { species: "caterpie", min: 2, max: 4, weight: 10 },
      { species: "wurmple", min: 2, max: 4, weight: 14 },
      { species: "pachirisu", min: 4, max: 5, weight: 5 },
      { species: "poochyena", min: 2, max: 4, weight: 15 },
      { species: "weedle", min: 2, max: 4, weight: 10 },
    ],
  },
  clearing: {
    rate: 0,
    background: "grass",
    grass: [{ species: "wurmple", min: 2, max: 3, weight: 1 }],
  },
  route2: {
    rate: 0.11,
    background: "grass",
    grass: [
      { species: "bidoof", min: 4, max: 7, weight: 14 },
      { species: "pidgey", min: 4, max: 7, weight: 13 },
      { species: "pachirisu", min: 5, max: 8, weight: 12 },
      { species: "starly", min: 4, max: 7, weight: 7 },
      { species: "wurmple", min: 4, max: 7, weight: 7 },
      { species: "caterpie", min: 4, max: 7, weight: 7 },
      { species: "poochyena", min: 4, max: 7, weight: 17 },
      { species: "weedle", min: 4, max: 7, weight: 11 },
      { species: "silcoon", min: 7, max: 8, weight: 3 },
      { species: "cascoon", min: 7, max: 8, weight: 3 },
      { species: "metapod", min: 7, max: 8, weight: 3 },
      { species: "kakuna", min: 7, max: 8, weight: 3 },
    ],
  },
  forest: {
    rate: 0.12,
    background: "grass",
    grass: [
      { species: "wurmple", min: 2, max: 5, weight: 18 },
      { species: "caterpie", min: 2, max: 5, weight: 18 },
      { species: "weedle", min: 2, max: 5, weight: 18 },
      { species: "poochyena", min: 3, max: 5, weight: 10 },
      { species: "silcoon", min: 7, max: 8, weight: 7 },
      { species: "cascoon", min: 7, max: 8, weight: 7 },
      { species: "metapod", min: 7, max: 8, weight: 7 },
      { species: "kakuna", min: 7, max: 8, weight: 7 },
      { species: "pachirisu", min: 4, max: 7, weight: 5 },
      { species: "bidoof", min: 3, max: 5, weight: 3 },
    ],
  },
  route2_grove: {
    rate: 0.11, background: "grass",
    grass: [
      { species: "poochyena", min: 12, max: 15, weight: 25 },
      { species: "mightyena", min: 18, max: 20, weight: 10 },
      { species: "weedle", min: 8, max: 9, weight: 10 },
      { species: "kakuna", min: 8, max: 9, weight: 10 },
      { species: "beedrill", min: 10, max: 12, weight: 15 },
      { species: "butterfree", min: 10, max: 12, weight: 10 },
      { species: "dustox", min: 10, max: 12, weight: 10 },
      { species: "bibarel", min: 15, max: 16, weight: 10 },
    ],
  },
};

/** O bosque da Rota 2 só oferece evoluções mais fortes depois de ser liberado. */
export function encountersFor(map: string, position: { x: number; y: number; flags: Record<string, boolean> }): EncounterTable | undefined {
  return ENCOUNTERS[map === "route2" && position.flags.r2_grove_open && position.x >= 22 && position.y < 10 ? "route2_grove" : map];
}
