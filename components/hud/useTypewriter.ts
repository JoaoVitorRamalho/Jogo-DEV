"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEXT_SPEEDS, useSettings } from "@/lib/settings/store";

export function useTypewriter(text: string, cps = 48) {
  const [progress, setProgress] = useState({ text: "", count: 0 });
  const fast = useRef(false);
  const currentText = useRef(text);
  currentText.current = text;
  // Battle sequences can retain this callback across several messages.
  // Always finish the text currently on screen, even from an older render.
  const finish = useCallback(() => {
    const latest = currentText.current;
    setProgress({ text: latest, count: latest.length });
  }, []);
  useEffect(() => {
    setProgress({ text, count: 0 });
    if (!text) return undefined;
    let frame = 0;
    let shown = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Lido a cada quadro: trocar a velocidade nas opções vale já na fala aberta.
      const speed = TEXT_SPEEDS[useSettings.getState().textSpeed]?.factor ?? 1;
      shown += dt * cps * speed * (fast.current ? 4 : 1);
      const next = Math.min(text.length, Math.floor(shown));
      setProgress((current) => (current.text === text && current.count >= next ? current : { text, count: next }));
      if (next < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, cps]);
  const count = progress.text === text ? progress.count : 0;
  return {
    shown: text.slice(0, count),
    done: progress.text === text && count >= text.length,
    finish,
    setFast: (value: boolean) => {
      fast.current = value;
    },
  };
}
