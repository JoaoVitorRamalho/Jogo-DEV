"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { PokeContext, useBackdrop } from "@/components/menu/title/backdrop";
import type { SceneHit, TitleScene } from "@/components/menu/title/scene";
import { TitleCanvas } from "@/components/menu/title/TitleCanvas";
import { defaultAppearance } from "@/game/character/appearance";
import { useGame } from "@/game/state/store";
import { type Sfx, playCry, playSfx } from "@/lib/audio/engine";

const SOUND: Partial<Record<NonNullable<SceneHit>, Sfx>> = {
  hero: "step",
  logo: "cursor",
  lighthouse: "pop",
  sky: "cursor",
  sea: "swoosh",
};

/**
 * Fundo das telas fora do jogo: a mesma cena do entardecer fica viva do título às opções e
 * ao criador (sem recomeçar a cada troca). Ela também guarda as medidas (--px) que o
 * painel de cada tela usa, e reage a cliques e ao ponteiro.
 */
export function MenuScene({ screen, children }: { screen: string; children: ReactNode }) {
  const slot = useGame((state) => state.slot);
  const stage = useBackdrop((state) => state.stage);
  const appearance = useMemo(() => slot?.appearance ?? defaultAppearance(), [slot]);
  const lead = slot?.party?.find((mon) => mon.hp > 0)?.species ?? slot?.party?.[0]?.species ?? null;
  const scene = useRef<TitleScene | null>(null);

  const poke = useCallback(
    (x: number, y: number) => {
      const hit = scene.current?.poke(x, y) ?? null;
      const sound = hit ? SOUND[hit] : undefined;
      if (hit === "partner" && lead) playCry(lead);
      else if (hit === "mew") {
        playSfx("discover");
        window.setTimeout(() => playCry("mew"), 380);
      }
      else if (sound) playSfx(sound);
      return hit;
    },
    [lead],
  );

  return (
    <div className={`title-scene on-${screen}`} onPointerMove={(event) => scene.current?.point(event.clientX, event.clientY)}>
      <TitleCanvas sceneRef={scene} stage={stage} appearance={appearance} partner={lead} />
      <div className="ts-dim" aria-hidden />
      <PokeContext.Provider value={poke}>{children}</PokeContext.Provider>
    </div>
  );
}
