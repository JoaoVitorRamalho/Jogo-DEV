"use client";

import { createContext, useContext } from "react";
import { create } from "zustand";
import type { SceneHit, TitleStage } from "./scene";

/**
 * A cena do entardecer fica viva atrás do título, das opções e do criador. Cada tela diz
 * em que etapa ela está (o logo sai no criador, a dupla some, etc.) por este estado.
 */
export const useBackdrop = create<{ stage: TitleStage; setStage: (stage: TitleStage) => void }>((set) => ({
  stage: "press",
  setStage: (stage) => set({ stage }),
}));

/** Clique no fundo: a cena reage e diz o que foi acertado (o som sai junto). */
export type Poke = (clientX: number, clientY: number) => SceneHit;

export const PokeContext = createContext<Poke>(() => null);

export function usePoke(): Poke {
  return useContext(PokeContext);
}
