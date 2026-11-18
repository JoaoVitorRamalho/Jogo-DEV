"use client";

import { useEffect } from "react";
import { GameShell } from "@/components/game/GameShell";
import { CharacterCreator } from "@/components/menu/CharacterCreator";
import { OptionsMenu } from "@/components/menu/OptionsMenu";
import { TitleMenu } from "@/components/menu/TitleMenu";
import { type GameState, useGame } from "@/game/state/store";
import { unlockAudio } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { bindInput } from "@/lib/input/engine";
import { useSettings } from "@/lib/settings/store";

export default function GameApp() {
  const brightness = useSettings((state) => state.brightness);
  const screen = useSession((state) => state.screen);
  const live = useGame((state) => state.live);

  useEffect(() => bindInput(), []);

  useEffect(() => {
    const giveKit = (state: GameState | null) => {
      if (!state) return state;
      const next = JSON.parse(JSON.stringify(state)) as GameState;
      if ((next.bag.rare_candy ?? 0) < 40) next.bag.rare_candy = 40;
      next.bag.infinite_potion = 1;
      return next;
    };
    const apply = () => {
      useGame.setState((current) => ({ slot: giveKit(current.slot), live: giveKit(current.live) }));
    };
    if (useGame.persist.hasHydrated()) apply();
    return useGame.persist.onFinishHydration(apply);
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (screen === "field" && !live) useSession.getState().setScreen("title");
  }, [screen, live]);

  return (
    <div className="game-root" style={{ filter: `brightness(${brightness})` }}>
      {screen === "field" && live ? <GameShell /> : <div className="menu-bg" />}
      <div className="ui">
        {screen === "title" ? <TitleMenu /> : null}
        {screen === "creator" ? <CharacterCreator /> : null}
        {screen === "options" ? <OptionsMenu /> : null}
      </div>
    </div>
  );
}
