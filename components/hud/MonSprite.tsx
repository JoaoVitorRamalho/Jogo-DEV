"use client";

import { species } from "@/data/pokemon/species";

const DRAWN = new Set(["torchic", "bulbasaur", "froakie", "wurmple", "starly"]);

export function MonSprite({ id, size = 32, flip = false }: { id: string; size?: number; flip?: boolean }) {
  const sprite = species(id).sprite;
  const src = DRAWN.has(sprite) ? `/assets/sprites/pokemon/${sprite}.png` : null;
  if (!src) return <span className="mon-unknown" style={{ width: `calc(var(--u) * ${size})`, height: `calc(var(--u) * ${size})` }}>?</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="pixel"
      src={src}
      alt={species(id).name}
      style={{ width: `calc(var(--u) * ${size})`, height: `calc(var(--u) * ${size})`, transform: flip ? "scaleX(-1)" : undefined }}
    />
  );
}

export function HpBar({ hp, max }: { hp: number; max: number }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  const color = ratio > 0.5 ? "#58d058" : ratio > 0.2 ? "#f0c030" : "#e03838";
  return (
    <span className="hp-bar">
      <b>PS</b>
      <span>
        <i style={{ width: `${ratio * 100}%`, background: color }} />
      </span>
    </span>
  );
}
