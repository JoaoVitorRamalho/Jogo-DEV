"use client";

import dynamic from "next/dynamic";

const GameApp = dynamic(() => import("@/components/game/GameApp"), {
  ssr: false,
  loading: () => <div className="boot">Carregando…</div>,
});

export function GameLoader() {
  return <GameApp />;
}
