/** Golpes usados no mapa (HM clássica + Defog planejado). */
export type FieldMoveId =
  | "cut"
  | "fly"
  | "surf"
  | "strength"
  | "flash"
  | "rock_smash"
  | "waterfall"
  | "dive"
  | "defog";

export type FieldObstacleKind =
  | "cut_bush"
  | "smash_rock"
  | "push_boulder"
  | "surf_water"
  | "waterfall"
  | "flash_dark"
  | "dive_spot"
  | "defog_mist";

export type PuzzleStatus = "rascunho" | "pronto_mapa" | "jogável";