export type Sex = "male" | "female";
export type Direction = "up" | "left" | "down" | "right";
export type AnimName = "idle" | "walk" | "run";
export type ItemSlot =
  | "expression"
  | "eyebrows"
  | "hair"
  | "beard"
  | "shirt"
  | "legs"
  | "shoes"
  | "hat"
  | "glasses";

export const ITEM_SLOTS: ItemSlot[] = [
  "expression",
  "eyebrows",
  "hair",
  "beard",
  "shirt",
  "legs",
  "shoes",
  "hat",
  "glasses",
];

export const OPTIONAL_SLOTS: ItemSlot[] = [
  "eyebrows",
  "hair",
  "beard",
  "shirt",
  "legs",
  "shoes",
  "hat",
  "glasses",
];

export type ColorField =
  | "skin"
  | "eyes"
  | "hairColor"
  | "shirtColor"
  | "legsColor"
  | "shoesColor"
  | "hatColor"
  | "glassesColor";

export type PaletteId = "body" | "hair" | "cloth" | "eye";

export type Appearance = {
  sex: Sex;
  name: string;
  skin: string;
  eyes: string;
  hairColor: string;
  shirtColor: string;
  legsColor: string;
  shoesColor: string;
  hatColor: string;
  glassesColor: string;
  expression: string;
  eyebrows: string;
  hair: string;
  beard: string;
  shirt: string;
  legs: string;
  shoes: string;
  hat: string;
  glasses: string;
};

export type Credit = {
  authors: string[];
  licenses: string[];
  urls: string[];
  notes: string;
};

export type LayerDef = {
  z: number;
  paths: Partial<Record<Sex, string>>;
};

export type ItemDef = {
  id: string;
  name: string;
  slot: ItemSlot;
  sexes: Sex[];
  layers: LayerDef[];
  materials: string[];
  credits: Credit[];
};

export type AnchorDef = {
  name?: string;
  layers: LayerDef[];
  materials: string[];
  credits: Credit[];
  sexes?: Sex[];
};

export type PaletteBook = {
  base: string;
  colors: Record<string, string[]>;
};

export type Catalog = {
  frame: number;
  directions: Direction[];
  animations: Record<AnimName, { cycle: number[]; fps: number }>;
  palettes: Record<PaletteId, PaletteBook>;
  body: AnchorDef;
  shadow: AnchorDef | null;
  items: ItemDef[];
  notice: string;
};

export const NONE = "none";

export const DIR_ROW: Record<Direction, number> = {
  up: 0,
  left: 1,
  down: 2,
  right: 3,
};
