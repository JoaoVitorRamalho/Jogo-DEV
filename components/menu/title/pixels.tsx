"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { monSpriteSrc } from "@/components/hud/MonSprite";
import { species } from "@/data/pokemon/species";
import type { Appearance } from "@/game/character/appearance";
import { renderSheet } from "@/game/character/compose";

type Paint = (context: CanvasRenderingContext2D, width: number, height: number) => void;

/**
 * Canvas que desenha em pixels reais da tela e redesenha quando a caixa muda.
 * Quem manda no tamanho é o CSS (o canvas ocupa a caixa do pai), nunca o bitmap.
 */
function useDeviceCanvas(paint: Paint | null) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !paint) return;
    const draw = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(box.width * ratio));
      const height = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      } else {
        context.clearRect(0, 0, width, height);
      }
      paint(context, width, height);
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);
  return ref;
}

// Quadro de frente do herói (16 × 32): o cabelo começa por volta da linha 5 e o queixo
// fecha na 17. O retrato mostra 15 linhas a partir da 4, cabeça inteira e um tico de ombro.
const HEAD_TOP = 4;
const HEAD_ROWS = 15;

/** Rosto do herói em pixels inteiros, do tamanho da caixa onde ele está. */
export function Portrait({ appearance }: { appearance: Appearance }) {
  const [sheet, setSheet] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    renderSheet(appearance)
      .then((result) => {
        if (alive) setSheet(result);
      })
      .catch((error: unknown) => {
        console.warn("Ficha do jogo salvo: não deu para montar o rosto", error);
      });
    return () => {
      alive = false;
    };
  }, [appearance]);

  const paint = useCallback<Paint>(
    (context, width, height) => {
      if (!sheet) return;
      const scale = Math.max(1, Math.round(height / HEAD_ROWS));
      context.imageSmoothingEnabled = false;
      const x = Math.round(width / 2 - 8 * scale);
      const y = Math.round((height - HEAD_ROWS * scale) / 2) - HEAD_TOP * scale;
      context.drawImage(sheet, 0, 0, 16, 32, x, y, 16 * scale, 32 * scale);
    },
    [sheet],
  );

  const ref = useDeviceCanvas(sheet ? paint : null);
  return <canvas ref={ref} aria-hidden />;
}

type Trimmed = { image: HTMLImageElement; x: number; y: number; w: number; h: number };

const trimmed = new Map<string, Promise<Trimmed | null>>();

/** Os sprites vêm em 96 × 96 com o Pokémon de tamanhos bem diferentes no meio: corta a sobra. */
function loadTrimmed(src: string): Promise<Trimmed | null> {
  const cached = trimmed.get(src);
  if (cached) return cached;
  const promise = new Promise<Trimmed | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const probe = document.createElement("canvas");
      probe.width = image.width;
      probe.height = image.height;
      const context = probe.getContext("2d", { willReadFrequently: true });
      if (!context) {
        resolve(null);
        return;
      }
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, probe.width, probe.height).data;
      let x0 = probe.width;
      let y0 = probe.height;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < probe.height; y++) {
        for (let x = 0; x < probe.width; x++) {
          if (data[(y * probe.width + x) * 4 + 3] < 24) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      resolve(x1 < 0 ? null : { image, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
  trimmed.set(src, promise);
  return promise;
}

/** Ícone da equipe: todo Pokémon ocupa o mesmo espaço no quadradinho, grande ou pequeno. */
export function PartyIcon({ id }: { id: string }) {
  const src = monSpriteSrc(id);
  const [sprite, setSprite] = useState<Trimmed | null>(null);

  useEffect(() => {
    if (!src) return;
    let alive = true;
    void loadTrimmed(src).then((result) => {
      if (alive) setSprite(result);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  const paint = useCallback<Paint>(
    (context, width, height) => {
      if (!sprite) return;
      const fit = (Math.min(width, height) * 0.84) / Math.max(sprite.w, sprite.h);
      const w = Math.round(sprite.w * fit);
      const h = Math.round(sprite.h * fit);
      let source: CanvasImageSource = sprite.image;
      let sx = sprite.x;
      let sy = sprite.y;
      let sw = sprite.w;
      let sh = sprite.h;
      if (fit > 1) {
        // aumenta em passo inteiro (pixel nítido) e só o resto vai suavizado
        const step = Math.ceil(fit);
        const big = document.createElement("canvas");
        big.width = sprite.w * step;
        big.height = sprite.h * step;
        const bigContext = big.getContext("2d");
        if (bigContext) {
          bigContext.imageSmoothingEnabled = false;
          bigContext.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, big.width, big.height);
          source = big;
          sx = 0;
          sy = 0;
          sw = big.width;
          sh = big.height;
        }
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, sx, sy, sw, sh, Math.round((width - w) / 2), Math.round((height - h) / 2), w, h);
    },
    [sprite],
  );

  const ref = useDeviceCanvas(sprite ? paint : null);
  if (!src) return <span className="ts-mon-unknown">?</span>;
  return <canvas ref={ref} role="img" aria-label={species(id).name} />;
}
