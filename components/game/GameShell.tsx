"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { BattleScreen } from "@/components/battle/BattleScreen";
import { ChoiceBox, DialogBox, ToastAndHint } from "@/components/hud/DialogBox";
import { OptionsMenu } from "@/components/menu/OptionsMenu";
import { PauseMenu } from "@/components/menus/PauseMenu";
import { useUi } from "@/game/core/ui";
import { VIEW_H, VIEW_W } from "@/game/phaser/constants";
import { useGame } from "@/game/state/store";
import { installChapter1 } from "@/game/story/chapter1";

function zoomFor(width: number, height: number): number {
  return Math.max(1, Math.floor(Math.min(width / VIEW_W, height / VIEW_H)));
}

export function GameShell() {
  const host = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState(() => (typeof window === "undefined" ? 3 : zoomFor(window.innerWidth, window.innerHeight)));
  const panel = useUi((state) => state.panel);

  useEffect(() => {
    installChapter1();
    if (process.env.NODE_ENV !== "production") {
      Object.assign(window, { __game: useGame, __ui: useUi });
    }
    let cancelled = false;
    let destroy: (() => void) | null = null;
    void import("@/game/phaser/createGame").then((module) => {
      if (cancelled || !host.current) return;
      module.createGame(host.current, zoomFor(window.innerWidth, window.innerHeight));
      destroy = module.destroyGame;
    });
    return () => {
      cancelled = true;
      destroy?.();
      useUi.setState({ dialog: null, choice: null, battle: null, panel: null, hint: null });
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const next = zoomFor(window.innerWidth, window.innerHeight);
      setZoomState(next);
      void import("@/game/phaser/createGame").then((module) => module.setZoom(next));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const ui = useUi.getState();
      if (ui.panel || document.hidden) return;
      useGame.getState().update((state) => {
        state.playTime += 5;
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const style = { width: VIEW_W * zoom, height: VIEW_H * zoom, "--z": zoom } as CSSProperties;

  return (
    <div className="shell">
      <div className="frame" style={style}>
        <div ref={host} className="canvas-host" />
        <div className="overlay">
          <BattleScreen />
          <PauseMenu />
          <DialogBox />
          <ChoiceBox />
          <ToastAndHint />
        </div>
      </div>
      {panel === "options" ? (
        <div className="options-overlay">
          <OptionsMenu onClose={() => useUi.getState().setPanel("pause")} />
        </div>
      ) : null}
    </div>
  );
}
