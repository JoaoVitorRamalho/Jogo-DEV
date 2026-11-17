"use client";

import { useEffect, useRef, useState } from "react";

export function useTypewriter(text: string, cps = 48) {
  const [progress, setProgress] = useState({ text: "", count: 0 });
  const fast = useRef(false);
  useEffect(() => {
    setProgress({ text, count: 0 });
    if (!text) return undefined;
    let frame = 0;
    let shown = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      shown += dt * cps * (fast.current ? 4 : 1);
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
    finish: () => setProgress({ text, count: text.length }),
    setFast: (value: boolean) => {
      fast.current = value;
    },
  };
}
