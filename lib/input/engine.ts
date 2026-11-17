"use client";

import { useEffect, useRef } from "react";
import { assignKey, assignPad, familyFromId } from "@/lib/input/labels";
import type { Action, Capture, InputFrame, PadFamily } from "@/lib/input/types";
import { ACTIONS } from "@/lib/input/types";
import { useSettings } from "@/lib/settings/store";

const keys = new Set<string>();
let capture: Capture = null;
let previous: Record<Action, boolean> = emptyHeld();
let padName: string | null = null;
let padFamily: PadFamily = "generic";
let listening = false;

function emptyHeld(): Record<Action, boolean> {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    cancel: false,
    menu: false,
    run: false,
  };
}

function typingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) return;
  if (capture?.device === "key") {
    event.preventDefault();
    if (event.code !== "Escape" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      assignKey(capture.action, capture.slot, event.code);
    }
    capture = null;
    return;
  }
  if (capture?.device === "pad" && (event.code === "Escape" || event.code === "KeyX")) {
    event.preventDefault();
    capture = null;
    return;
  }
  if (typingTarget(event.target)) return;
  if (event.code.startsWith("Arrow") || event.code === "Space") event.preventDefault();
  keys.add(event.code);
}

function onKeyUp(event: KeyboardEvent): void {
  keys.delete(event.code);
}

function onBlur(): void {
  keys.clear();
}

export function bindInput(): () => void {
  if (listening) return () => undefined;
  listening = true;
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onBlur);
  return () => {
    listening = false;
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", onBlur);
  };
}

export function beginCapture(next: Capture): void {
  capture = next;
  previousPad.clear();
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    pad?.buttons.forEach((button, index) => {
      if (button.pressed || button.value > 0.6) previousPad.add(index);
    });
  }
}

export function getCapture(): Capture {
  return capture;
}

function buttonDown(pad: Gamepad, index: number | null): boolean {
  if (index === null) return false;
  const button = pad.buttons[index];
  return Boolean(button && (button.pressed || button.value > 0.55));
}

function pollDevices(): InputFrame {
  const { keyboard, pad, deadzone } = useSettings.getState();
  const gamepads = navigator.getGamepads?.() ?? [];
  let gamepad: Gamepad | null = null;
  for (const candidate of gamepads) {
    if (candidate?.connected) {
      gamepad = candidate;
      break;
    }
  }
  padName = gamepad ? gamepad.id : null;
  padFamily = gamepad ? familyFromId(gamepad.id) : "generic";

  let swallowed = false;
  if (capture?.device === "pad" && gamepad) {
    for (let index = 0; index < gamepad.buttons.length; index += 1) {
      const button = gamepad.buttons[index];
      const down = Boolean(button && (button.pressed || button.value > 0.6));
      if (down && !previousPad.has(index)) {
        assignPad(capture.action, index);
        capture = null;
        swallowed = true;
        break;
      }
    }
  }

  const held = emptyHeld();
  if (!capture && !swallowed) {
    for (const action of ACTIONS) {
      const [first, second] = keyboard[action];
      const keyDown = (first && keys.has(first)) || (second && keys.has(second));
      const padDown = gamepad ? buttonDown(gamepad, pad[action]) : false;
      held[action] = Boolean(keyDown || padDown);
    }
  }

  let stickX = 0;
  let stickY = 0;
  if (gamepad && !capture) {
    const rawX = gamepad.axes[0] ?? 0;
    const rawY = -(gamepad.axes[1] ?? 0);
    const magnitude = Math.hypot(rawX, rawY);
    if (magnitude > deadzone) {
      const scale = (magnitude - deadzone) / (1 - deadzone) / magnitude;
      stickX = rawX * scale;
      stickY = rawY * scale;
    }
    if (stickY > 0.55) held.up = true;
    if (stickY < -0.55) held.down = true;
    if (stickX < -0.55) held.left = true;
    if (stickX > 0.55) held.right = true;
  }

  let digitalX = 0;
  let digitalY = 0;
  if (held.left) digitalX -= 1;
  if (held.right) digitalX += 1;
  if (held.up) digitalY += 1;
  if (held.down) digitalY -= 1;
  if (digitalX !== 0 && digitalY !== 0) {
    const length = Math.hypot(digitalX, digitalY);
    digitalX /= length;
    digitalY /= length;
  }

  const axes =
    Math.hypot(stickX, stickY) > 0 ? { x: stickX, y: stickY } : { x: digitalX, y: digitalY };

  const pressed = emptyHeld();
  for (const action of ACTIONS) {
    pressed[action] = held[action] && !previous[action];
  }
  previous = held;

  if (gamepad) {
    previousPad.clear();
    gamepad.buttons.forEach((button, index) => {
      if (button.pressed || button.value > 0.6) previousPad.add(index);
    });
  } else {
    previousPad.clear();
  }

  return { held, pressed, axes, padName, padFamily, capture };
}

const previousPad = new Set<number>();

export function createRepeater() {
  const armed: Record<string, boolean> = {};
  const wait: Record<string, number> = {};
  return (id: string, held: boolean, dt: number) => {
    if (!held) {
      armed[id] = true;
      wait[id] = 0;
      return false;
    }
    if (armed[id] !== false) {
      armed[id] = false;
      wait[id] = 0.34;
      return true;
    }
    wait[id] -= dt;
    if (wait[id] <= 0) {
      wait[id] = 0.12;
      return true;
    }
    return false;
  };
}

type Listener = (frame: InputFrame, dt: number) => void;

let current: InputFrame = {
  held: emptyHeld(),
  pressed: emptyHeld(),
  axes: { x: 0, y: 0 },
  padName: null,
  padFamily: "generic",
  capture: null,
};
const listeners = new Set<Listener>();
let pumpId = 0;
let pumpLast = 0;

function pump(now: number): void {
  const dt = Math.min(0.05, Math.max(0, (now - pumpLast) / 1000));
  pumpLast = now;
  current = pollDevices();
  for (const listener of [...listeners]) listener(current, dt);
  pumpId = requestAnimationFrame(pump);
}

function ensurePump(): void {
  if (pumpId || typeof window === "undefined") return;
  pumpLast = performance.now();
  pumpId = requestAnimationFrame(pump);
}

export function sampleInput(): InputFrame {
  ensurePump();
  return current;
}

export function subscribeInput(listener: Listener): () => void {
  ensurePump();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInputFrame(onFrame: Listener, enabled = true): void {
  const callback = useRef(onFrame);
  callback.current = onFrame;
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeInput((frame, dt) => callback.current(frame, dt));
  }, [enabled]);
}
