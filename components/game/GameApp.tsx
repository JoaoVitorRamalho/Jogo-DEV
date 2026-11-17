"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/game/Field";
import { StoryHud } from "@/components/game/StoryHud";
import { CharacterCreator } from "@/components/menu/CharacterCreator";
import { OptionsMenu } from "@/components/menu/OptionsMenu";
import { TitleMenu } from "@/components/menu/TitleMenu";
import { unlockAudio } from "@/lib/audio/engine";
import { loadCatalog } from "@/lib/character/catalog";
import type { Catalog } from "@/lib/character/types";
import { useSession } from "@/lib/game/session";
import { bindInput } from "@/lib/input/engine";
import { formatKey } from "@/lib/input/labels";
import { useSettings } from "@/lib/settings/store";

function FieldHint() {
  const menu = useSettings((state) => state.keyboard.menu[0]);
  const run = useSettings((state) => state.keyboard.run[0]);
  return (
    <p className="field-hint">
      {formatKey(menu)} volta ao título · {formatKey(run)} corre
    </p>
  );
}

export default function GameApp() {
  const brightness = useSettings((state) => state.brightness);
  const screen = useSession((state) => state.screen);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch(() => setError("Não foi possível carregar os sprites."));
  }, []);

  useEffect(() => bindInput(), []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div className="game-root" style={{ filter: `brightness(${brightness})` }}>
      {!catalog ? (
        <div className="boot">{error || "Carregando sprites…"}</div>
      ) : (
        <>
          {screen === "field" ? <Field catalog={catalog} /> : <div className="menu-bg" />}
          <div className="ui">
            {screen === "title" ? <TitleMenu catalog={catalog} /> : null}
            {screen === "creator" ? <CharacterCreator catalog={catalog} /> : null}
            {screen === "options" ? <OptionsMenu catalog={catalog} /> : null}
            {screen === "field" ? (
              <>
                <StoryHud />
                <FieldHint />
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
