export type EncounterSlot = { species: string; min: number; max: number; weight: number };
export type EncounterTable = { rate: number; grass: EncounterSlot[]; background: string };

export const ENCOUNTERS: Record<string, EncounterTable> = {
  route1: {
    rate: 0.1,
    background: "grass",
    grass: [
      { species: "wurmple", min: 2, max: 4, weight: 50 },
      { species: "starly", min: 2, max: 4, weight: 50 },
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
      { species: "wurmple", min: 4, max: 7, weight: 40 },
      { species: "starly", min: 4, max: 7, weight: 40 },
      { species: "silcoon", min: 6, max: 8, weight: 20 },
    ],
  },
  forest: {
    rate: 0.12,
    background: "grass",
    grass: [
      { species: "wurmple", min: 2, max: 5, weight: 55 },
      { species: "starly", min: 3, max: 5, weight: 45 },
    ],
  },
};
