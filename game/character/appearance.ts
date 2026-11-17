export type Sex = "male" | "female";
export type Direction = "down" | "right" | "up" | "left";

export const SKIN = {
  light: { label: "Clara", main: "#f4d8b8", shade: "#d6a67e" },
  amber: { label: "Âmbar", main: "#f0c08a", shade: "#c88a52" },
  olive: { label: "Oliva", main: "#dca070", shade: "#a8704a" },
  taupe: { label: "Morena clara", main: "#c79a6c", shade: "#93684a" },
  bronze: { label: "Bronze", main: "#b07a4c", shade: "#7f4c31" },
  brown: { label: "Morena", main: "#946038", shade: "#663f26" },
  black: { label: "Negra", main: "#704428", shade: "#4a2a1a" },
} as const;

export const EYES = {
  brown: { label: "Castanhos", color: "#6a4020" },
  blue: { label: "Azuis", color: "#3a78c8" },
  green: { label: "Verdes", color: "#3a9a50" },
  gray: { label: "Cinza", color: "#6c7480" },
  purple: { label: "Violeta", color: "#8a40b0" },
  red: { label: "Vermelhos", color: "#c03040" },
  orange: { label: "Âmbar", color: "#d07020" },
  yellow: { label: "Dourados", color: "#c8a020" },
} as const;

export const HAIR_COLORS = {
  black: { label: "Preto", main: "#2e2e3a", shade: "#17171f", light: "#4c4c5e" },
  raven: { label: "Preto azulado", main: "#1e3450", shade: "#0e1c2c", light: "#345474" },
  dark_brown: { label: "Castanho escuro", main: "#5a3420", shade: "#3a1e12", light: "#7c4c30" },
  chestnut: { label: "Castanho", main: "#8a4a20", shade: "#5e2e12", light: "#b0642e" },
  light_brown: { label: "Castanho claro", main: "#a8703a", shade: "#7a4c22", light: "#c8905a" },
  blonde: { label: "Loiro", main: "#e0b040", shade: "#b08020", light: "#f8d870" },
  platinum: { label: "Platinado", main: "#e8e0c0", shade: "#b8b090", light: "#fffbe8" },
  redhead: { label: "Ruivo", main: "#b83a20", shade: "#802410", light: "#e0603a" },
  ginger: { label: "Acobreado", main: "#e07020", shade: "#a84c10", light: "#f8a050" },
  gray: { label: "Grisalho", main: "#9a9aa2", shade: "#6a6a72", light: "#c4c4cc" },
  white: { label: "Branco", main: "#ececf0", shade: "#b8b8c4", light: "#ffffff" },
  blue: { label: "Azul", main: "#3a5ac8", shade: "#24388a", light: "#6a8ae8" },
  green: { label: "Verde", main: "#3a9a4a", shade: "#246a30", light: "#6aca6a" },
  pink: { label: "Rosa", main: "#e070a8", shade: "#b04a80", light: "#f8a0cc" },
  purple: { label: "Roxo", main: "#7a48b0", shade: "#523080", light: "#a070d8" },
} as const;

export const CLOTH = {
  red: { label: "Vermelho", main: "#d83a3a", shade: "#a02424" },
  maroon: { label: "Vinho", main: "#9a2a3a", shade: "#681a26" },
  orange: { label: "Laranja", main: "#f08030", shade: "#b85818" },
  yellow: { label: "Amarelo", main: "#f0c838", shade: "#c09820" },
  tan: { label: "Bege", main: "#d8b880", shade: "#a88a58" },
  brown: { label: "Marrom", main: "#8a5a34", shade: "#5e3a20" },
  green: { label: "Verde", main: "#4aa850", shade: "#2e7a36" },
  forest: { label: "Verde-musgo", main: "#3a6a3a", shade: "#244624" },
  teal: { label: "Verde-água", main: "#30a8a8", shade: "#1e7478" },
  sky: { label: "Azul-céu", main: "#7ab8f0", shade: "#4a88c8" },
  blue: { label: "Azul", main: "#3a6ad8", shade: "#2444a0" },
  navy: { label: "Marinho", main: "#2c3a7a", shade: "#1a2450" },
  purple: { label: "Roxo", main: "#7a48b8", shade: "#52308a" },
  pink: { label: "Rosa", main: "#f080b0", shade: "#c05888" },
  white: { label: "Branco", main: "#f4f4f6", shade: "#c4c8d4" },
  gray: { label: "Cinza", main: "#8a8e9a", shade: "#5e626e" },
  charcoal: { label: "Grafite", main: "#4a4e5a", shade: "#30333c" },
  black: { label: "Preto", main: "#2a2a32", shade: "#16161c" },
} as const;

export const HAIR_STYLES = {
  short: "Curto",
  spiky: "Espetado",
  fringe: "Franja",
  bob: "Chanel",
  long: "Longo",
  ponytail: "Rabo de cavalo",
  twintails: "Maria-chiquinha",
  bun: "Coque",
  afro: "Black power",
  buzz: "Raspado",
} as const;

export const TOPS = {
  tshirt: "Camiseta",
  longsleeve: "Manga longa",
  tank: "Regata",
  jacket: "Jaqueta",
  hoodie: "Moletom",
  dress: "Vestido",
} as const;

export const BOTTOMS = { pants: "Calça", shorts: "Bermuda", skirt: "Saia" } as const;
export const SHOES = { sneakers: "Tênis", boots: "Botas", sandals: "Sandálias" } as const;
export const HEADWEAR = { none: "Nenhum", cap: "Boné", hat: "Chapéu", beanie: "Gorro" } as const;
export const EXTRAS = { none: "Nenhum", glasses: "Óculos", backpack: "Mochila", scarf: "Lenço" } as const;

export type SkinId = keyof typeof SKIN;
export type EyeId = keyof typeof EYES;
export type HairColorId = keyof typeof HAIR_COLORS;
export type ClothId = keyof typeof CLOTH;
export type HairStyleId = keyof typeof HAIR_STYLES;
export type TopId = keyof typeof TOPS;
export type BottomId = keyof typeof BOTTOMS;
export type ShoeId = keyof typeof SHOES;
export type HeadwearId = keyof typeof HEADWEAR;
export type ExtraId = keyof typeof EXTRAS;

export type Appearance = {
  version: 2;
  name: string;
  sex: Sex;
  skin: SkinId;
  eyes: EyeId;
  hairStyle: HairStyleId;
  hairColor: HairColorId;
  top: TopId;
  topColor: ClothId;
  bottom: BottomId;
  bottomColor: ClothId;
  shoes: ShoeId;
  shoesColor: ClothId;
  headwear: HeadwearId;
  headwearColor: ClothId;
  extra: ExtraId;
  extraColor: ClothId;
};

export function defaultAppearance(sex: Sex = "male"): Appearance {
  return {
    version: 2,
    name: "",
    sex,
    skin: "light",
    eyes: "brown",
    hairStyle: sex === "male" ? "short" : "ponytail",
    hairColor: "dark_brown",
    top: "tshirt",
    topColor: sex === "male" ? "navy" : "teal",
    bottom: sex === "male" ? "pants" : "skirt",
    bottomColor: sex === "male" ? "charcoal" : "navy",
    shoes: "sneakers",
    shoesColor: "red",
    headwear: "none",
    headwearColor: "red",
    extra: "backpack",
    extraColor: "brown",
  };
}

function pick<T extends string>(value: unknown, options: Record<T, unknown>, fallback: T): T {
  return typeof value === "string" && value in options ? (value as T) : fallback;
}

const HAIR_ALIASES: Record<string, HairColorId> = {
  dark_gray: "black",
  ash: "platinum",
  sandy: "blonde",
  strawberry: "ginger",
  gold: "blonde",
  carrot: "ginger",
  orange: "ginger",
  red: "redhead",
  rose: "pink",
  violet: "purple",
  navy: "blue",
};

const CLOTH_ALIASES: Record<string, ClothId> = {
  leather: "brown",
  walnut: "brown",
  rose: "maroon",
  lavender: "purple",
  bluegray: "gray",
  slate: "gray",
};

function lpcHairStyle(id: string): HairStyleId {
  const name = id.toLowerCase();
  if (name.includes("pony")) return "ponytail";
  if (name.includes("bun") || name.includes("topknot")) return "bun";
  if (name.includes("afro") || name.includes("natural") || name.includes("curl")) return "afro";
  if (name.includes("bob") || name.includes("lob")) return "bob";
  if (name.includes("buzz") || name.includes("bald") || name.includes("high_and_tight")) return "buzz";
  if (name.includes("spik") || name.includes("hawk") || name.includes("messy")) return "spiky";
  if (name.includes("braid") || name.includes("pigtail") || name.includes("twin")) return "twintails";
  if (name.includes("long") || name.includes("princess") || name.includes("wavy")) return "long";
  if (name.includes("bang") || name.includes("fringe")) return "fringe";
  return "short";
}

export function migrateAppearance(raw: unknown): Appearance {
  const source = (raw ?? {}) as Record<string, unknown>;
  const sex: Sex = source.sex === "female" ? "female" : "male";
  const base = defaultAppearance(sex);
  if (source.version === 2) {
    return {
      ...base,
      name: typeof source.name === "string" ? source.name.slice(0, 12) : "",
      skin: pick(source.skin, SKIN, base.skin),
      eyes: pick(source.eyes, EYES, base.eyes),
      hairStyle: pick(source.hairStyle, HAIR_STYLES, base.hairStyle),
      hairColor: pick(source.hairColor, HAIR_COLORS, base.hairColor),
      top: pick(source.top, TOPS, base.top),
      topColor: pick(source.topColor, CLOTH, base.topColor),
      bottom: pick(source.bottom, BOTTOMS, base.bottom),
      bottomColor: pick(source.bottomColor, CLOTH, base.bottomColor),
      shoes: pick(source.shoes, SHOES, base.shoes),
      shoesColor: pick(source.shoesColor, CLOTH, base.shoesColor),
      headwear: pick(source.headwear, HEADWEAR, base.headwear),
      headwearColor: pick(source.headwearColor, CLOTH, base.headwearColor),
      extra: pick(source.extra, EXTRAS, base.extra),
      extraColor: pick(source.extraColor, CLOTH, base.extraColor),
    };
  }
  const str = (key: string) => (typeof source[key] === "string" ? (source[key] as string) : "");
  const hairColorRaw = str("hairColor");
  const shirt = str("shirt");
  const legs = str("legs");
  const shoes = str("shoes");
  const cloth = (key: string, fallback: ClothId): ClothId => {
    const value = str(key);
    return value in CLOTH ? (value as ClothId) : CLOTH_ALIASES[value] ?? fallback;
  };
  return {
    ...base,
    name: str("name").slice(0, 12),
    skin: pick(source.skin, SKIN, base.skin),
    eyes: pick(source.eyes, EYES, base.eyes),
    hairStyle: str("hair") && str("hair") !== "none" ? lpcHairStyle(str("hair")) : "buzz",
    hairColor: hairColorRaw in HAIR_COLORS ? (hairColorRaw as HairColorId) : HAIR_ALIASES[hairColorRaw] ?? base.hairColor,
    top: shirt.includes("sleeveless") || shirt.includes("tank") ? "tank" : shirt.includes("longsleeve") ? "longsleeve" : shirt.includes("cardigan") || shirt.includes("vest") ? "jacket" : "tshirt",
    topColor: cloth("shirtColor", base.topColor),
    bottom: legs.includes("skirt") ? "skirt" : legs.includes("short") ? "shorts" : "pants",
    bottomColor: cloth("legsColor", base.bottomColor),
    shoes: shoes.includes("boot") ? "boots" : shoes.includes("sandal") || shoes.includes("slipper") ? "sandals" : "sneakers",
    shoesColor: cloth("shoesColor", base.shoesColor),
    headwear: str("hat") && str("hat") !== "none" ? (str("hat").includes("cap") ? "cap" : "hat") : "none",
    headwearColor: cloth("hatColor", base.headwearColor),
    extra: str("glasses") && str("glasses") !== "none" ? "glasses" : "backpack",
    extraColor: cloth("glassesColor", base.extraColor),
  };
}

export function appearanceKey(appearance: Appearance): string {
  const { name: _name, ...rest } = appearance;
  return JSON.stringify(rest);
}
