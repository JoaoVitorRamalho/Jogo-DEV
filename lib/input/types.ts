export const ACTIONS = [
  "up",
  "down",
  "left",
  "right",
  "confirm",
  "cancel",
  "menu",
  "run",
] as const;

export type Action = (typeof ACTIONS)[number];
export type KeyPair = [string, string];
export type KeyboardMap = Record<Action, KeyPair>;
export type PadMap = Record<Action, number | null>;
export type PadFamily = "xbox" | "playstation" | "generic";

export type Capture = {
  device: "key" | "pad";
  action: Action;
  slot: number;
} | null;

export type InputFrame = {
  held: Record<Action, boolean>;
  pressed: Record<Action, boolean>;
  axes: { x: number; y: number };
  padName: string | null;
  padFamily: PadFamily;
  capture: Capture;
};

export const ACTION_LABEL: Record<Action, string> = {
  up: "Cima",
  down: "Baixo",
  left: "Esquerda",
  right: "Direita",
  confirm: "Confirmar",
  cancel: "Cancelar",
  menu: "Menu",
  run: "Correr",
};

export const DEFAULT_KEYBOARD: KeyboardMap = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  confirm: ["KeyZ", ""],
  cancel: ["KeyX", "Escape"],
  menu: ["Enter", ""],
  run: ["KeyX", "ShiftLeft"],
};

export const DEFAULT_PAD: PadMap = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
  confirm: 0,
  cancel: 1,
  menu: 9,
  run: 5,
};

export const DEFAULT_DEADZONE = 0.2;
