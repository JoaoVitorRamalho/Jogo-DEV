"use client";

import { useEffect, useRef, useState } from "react";
import { CharacterPreview } from "@/components/character-creator/CharacterPreview";
import { formatTime } from "@/components/menus/PauseMenu";
import { CITIES } from "@/data/cities";
import { defaultAppearance } from "@/game/character/appearance";
import { useGame } from "@/game/state/store";
import { playSfx, setContextTrack } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { createRepeater, useInputFrame } from "@/lib/input/engine";

const ROWS = ["Novo jogo", "Continuar", "Opções"];

function placeName(map: string): string {
  return CITIES.find((city) => city.maps.includes(map))?.name ?? (map === "route1" ? "Rota 1" : "Asteria");
}

export function TitleMenu() {
  const slot = useGame((state) => state.slot);
  const setScreen = useSession((state) => state.setScreen);
  const preview = slot?.appearance ?? defaultAppearance();
  const [row, setRow] = useState(slot ? 1 : 0);
  const repeat = useRef(createRepeater());

  useEffect(() => {
    setContextTrack("title");
  }, []);

  function activate(index: number) {
    if (index === 0) {
      playSfx("confirm");
      setScreen("creator");
      return;
    }
    if (index === 1) {
      if (!slot || !useGame.getState().continueGame()) {
        playSfx("cancel");
        return;
      }
      playSfx("confirm");
      setScreen("field");
      return;
    }
    playSfx("confirm");
    setScreen("options");
  }

  useInputFrame((frame, dt) => {
    const next = repeat.current;
    if (next("up", frame.held.up, dt)) setRow((value) => (value + ROWS.length - 1) % ROWS.length);
    if (next("down", frame.held.down, dt)) setRow((value) => (value + 1) % ROWS.length);
    if (frame.pressed.confirm) activate(row);
  });

  return (
    <div className="screen center title-screen">
      <div className="title-sky" />
      <section className="panel title-panel">
        <p className="eyebrow">Região de Asteria</p>
        <h1>Jornada</h1>
        <div className="title-hero">
          <CharacterPreview appearance={preview} scale={5} walk={false} />
        </div>
        {slot ? (
          <div className="save-info">
            <strong>{slot.appearance.name || "Viajante"}</strong>
            <span>{placeName(slot.map)}</span>
            <span>
              Insígnias {slot.badges.length} · Pokédex {slot.dex.caught.length} · {formatTime(slot.playTime)}
            </span>
          </div>
        ) : null}
        <div className="rows">
          {ROWS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={index === row ? "row active" : "row"}
              disabled={index === 1 && !slot}
              onMouseEnter={() => setRow(index)}
              onClick={() => activate(index)}
            >
              <span className="cursor">{index === row ? "▶" : ""}</span>
              {label}
            </button>
          ))}
        </div>
        {!slot ? <p className="muted">Nenhum jogo salvo</p> : null}
        <p className="hint-inline">Setas movem · Z confirma · X cancela</p>
      </section>
    </div>
  );
}
