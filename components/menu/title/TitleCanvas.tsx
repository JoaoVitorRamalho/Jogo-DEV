"use client";

import { useEffect, useRef } from "react";
import type { Appearance } from "@/game/character/appearance";
import { renderSheet } from "@/game/character/compose";
import { MON_SPRITES, spriteOf } from "@/game/phaser/constants";
import { createTitleScene, type TitleScene, type TitleStage } from "./scene";

/** Liga a cena em canvas ao React: cria uma vez, troca herói, parceiro e etapa sem recriar. */
export function TitleCanvas({ stage, appearance, partner }: { stage: TitleStage; appearance: Appearance; partner: string | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<TitleScene | null>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const host = el.parentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const created = createTitleScene(el, {
      reduced,
      onScale: (cssPx) => host?.style.setProperty("--px", `${cssPx}px`),
    });
    scene.current = created;
    return () => {
      created.destroy();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.setStage(stage);
  }, [stage]);

  useEffect(() => {
    let alive = true;
    renderSheet(appearance)
      .then((sheet) => {
        if (alive) scene.current?.setHero(sheet);
      })
      .catch((error: unknown) => {
        console.warn("Tela de título: não deu para montar o herói", error);
      });
    return () => {
      alive = false;
    };
  }, [appearance]);

  useEffect(() => {
    const sprite = partner ? spriteOf(partner) : "";
    if (!partner || !(MON_SPRITES as readonly string[]).includes(sprite)) {
      scene.current?.setPartner(null, null);
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      // Vai o nome do desenho, não da espécie: evolução sem desenho próprio usa o da
      // primeira forma, e o tamanho tem que ser o do bicho que aparece.
      if (alive) scene.current?.setPartner(img, sprite);
    };
    img.src = `/assets/sprites/pokemon/${sprite}_back.png`;
    return () => {
      alive = false;
    };
  }, [partner]);

  return <canvas ref={canvas} className="ts-canvas" aria-hidden />;
}
