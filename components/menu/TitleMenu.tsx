"use client";

import { useRef, useState } from "react";
import { Portrait } from "@/components/game/Portrait";
import { playSfx } from "@/lib/audio/engine";
import { defaultAppearance } from "@/lib/character/appearance";
import type { Catalog } from "@/lib/character/types";
import { useSession } from "@/lib/game/session";
import { createRepeater, useInputFrame } from "@/lib/input/engine";
import { useSave } from "@/lib/save/store";

const ROWS = ["Novo jogo", "Continuar", "Opções"];

export function TitleMenu({ catalog }: { catalog: Catalog }) {
  const slot = useSave((state) => state.slot);
  const setScreen = useSession((state) => state.setScreen);
  const preview = slot?.appearance ?? defaultAppearance(catalog);
  const [row, setRow] = useState(0);
  const repeat = useRef(createRepeater());

  function activate(index: number) {
    if (index === 0) {
      playSfx("confirm");
      setScreen("creator");
      return;
    }
    if (index === 1) {
      if (!slot) {
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
    <div className="screen center">
      <section className="panel title-panel">
        <p className="eyebrow">Região de Asteria</p>
        <h1>Jornada</h1>
        <Portrait catalog={catalog} appearance={preview} mode="idle" />
        {slot ? <p className="who">{slot.appearance.name || "Viajante"}</p> : null}
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
