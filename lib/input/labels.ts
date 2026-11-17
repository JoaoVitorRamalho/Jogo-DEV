import type { Action } from "@/lib/input/types";
import { ACTIONS, type KeyPair, type PadFamily } from "@/lib/input/types";
import { useSettings } from "@/lib/settings/store";

const KEY_NAMES: Record<string, string> = {
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Space: "Espaço",
  Enter: "Enter",
  Escape: "Esc",
  ShiftLeft: "Shift",
  ShiftRight: "Shift dir.",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl dir.",
  AltLeft: "Alt",
  AltRight: "Alt dir.",
  Tab: "Tab",
  Backspace: "Backspace",
};

const XBOX = [
  "A",
  "B",
  "X",
  "Y",
  "LB",
  "RB",
  "LT",
  "RT",
  "View",
  "Menu",
  "LS",
  "RS",
  "Cima",
  "Baixo",
  "Esquerda",
  "Direita",
];

const PLAYSTATION = [
  "Cruz",
  "Círculo",
  "Quadrado",
  "Triângulo",
  "L1",
  "R1",
  "L2",
  "R2",
  "Share",
  "Options",
  "L3",
  "R3",
  "Cima",
  "Baixo",
  "Esquerda",
  "Direita",
];

export function formatKey(code: string): string {
  if (!code) return "—";
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

export function familyFromId(id: string): PadFamily {
  const name = id.toLowerCase();
  if (name.includes("054c") || name.includes("dual") || name.includes("sony") || name.includes("wireless controller")) {
    return "playstation";
  }
  if (name.includes("xbox") || name.includes("xinput") || name.includes("045e")) return "xbox";
  return "generic";
}

export function formatPadButton(index: number | null, family: PadFamily): string {
  if (index === null) return "—";
  const table = family === "playstation" ? PLAYSTATION : XBOX;
  return table[index] ?? `Botão ${index}`;
}

export function assignKey(action: Action, slot: number, code: string): void {
  const current = useSettings.getState().keyboard;
  const next = {} as Record<Action, KeyPair>;
  for (const name of ACTIONS) {
    const pair: KeyPair = [...current[name]];
    if (pair[0] === code) pair[0] = "";
    if (pair[1] === code) pair[1] = "";
    next[name] = pair;
  }
  const mine: KeyPair = [...next[action]];
  mine[slot] = code;
  if (mine[0] === code && slot !== 0) mine[0] = "";
  if (mine[1] === code && slot !== 1) mine[1] = "";
  mine[slot] = code;
  next[action] = mine;
  useSettings.getState().setKeyboard(next);
}

export function assignPad(action: Action, button: number): void {
  const next = { ...useSettings.getState().pad };
  for (const name of ACTIONS) {
    if (name !== action && next[name] === button) next[name] = null;
  }
  next[action] = button;
  useSettings.getState().setPad(next);
}
