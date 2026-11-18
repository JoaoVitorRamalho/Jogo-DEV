"use client";

import { useRef, useState } from "react";
import { useUi } from "@/game/core/ui";
import { playSfx } from "@/lib/audio/engine";
import { createRepeater, useInputFrame } from "@/lib/input/engine";

type Options = {
  count: number;
  enabled: boolean;
  columns?: number;
  onSelect?: (index: number) => void;
  onCancel?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
};

export function useMenu({ count, enabled, columns = 1, onSelect, onCancel, onLeft, onRight }: Options) {
  const [index, setIndexState] = useState(0);
  const indexRef = useRef(0);
  const repeat = useRef(createRepeater());
  const handlers = useRef({ onSelect, onCancel, onLeft, onRight, count, columns });
  handlers.current = { onSelect, onCancel, onLeft, onRight, count, columns };

  const setIndex = (value: number) => {
    indexRef.current = value;
    setIndexState(value);
  };

  useInputFrame(
    (frame, dt) => {
      const ui = useUi.getState();
      if (ui.dialog || ui.choice || ui.evolution) return;
      const h = handlers.current;
      const step = repeat.current;
      const total = Math.max(1, h.count);
      const currentIndex = Math.min(indexRef.current, total - 1);
      if (step("up", frame.held.up, dt)) {
        playSfx("cursor");
        setIndex((currentIndex - h.columns + total) % total);
      }
      if (step("down", frame.held.down, dt)) {
        playSfx("cursor");
        setIndex((currentIndex + h.columns) % total);
      }
      if (step("left", frame.held.left, dt)) {
        if (h.columns > 1) {
          playSfx("cursor");
          setIndex(currentIndex % h.columns === 0 ? currentIndex : currentIndex - 1);
        } else h.onLeft?.();
      }
      if (step("right", frame.held.right, dt)) {
        if (h.columns > 1) {
          playSfx("cursor");
          setIndex(currentIndex % h.columns === h.columns - 1 || currentIndex + 1 >= total ? currentIndex : currentIndex + 1);
        } else h.onRight?.();
      }
      if (frame.pressed.confirm && h.onSelect && h.count > 0) {
        playSfx("confirm");
        h.onSelect(Math.min(indexRef.current, total - 1));
        return;
      }
      if ((frame.pressed.cancel || frame.pressed.menu) && h.onCancel) {
        playSfx("cancel");
        h.onCancel();
      }
    },
    enabled,
  );

  return { index: Math.min(index, Math.max(0, count - 1)), setIndex };
}
