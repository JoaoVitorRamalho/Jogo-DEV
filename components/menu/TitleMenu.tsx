"use client";

import { useEffect, useRef, useState } from "react";
import { CharacterPreview } from "@/components/character-creator/CharacterPreview";
import { MonSprite } from "@/components/hud/MonSprite";
import { formatTime } from "@/components/menus/PauseMenu";
import { CITIES } from "@/data/cities";
import { defaultAppearance } from "@/game/character/appearance";
import { useGame } from "@/game/state/store";
import { playSfx, setContextTrack } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { createRepeater, useInputFrame } from "@/lib/input/engine";

type Entry = { id: "continue" | "new" | "options"; label: string; sub: string };
type Stage = "press" | "menu" | "overwrite";

function placeName(map: string): string {
  return CITIES.find((city) => city.maps.includes(map))?.name ?? (map === "route1" ? "Rota 1" : "Asteria");
}

export function TitleMenu() {
  const slot = useGame((state) => state.slot);
  const setScreen = useSession((state) => state.setScreen);
  const preview = slot?.appearance ?? defaultAppearance();
  const entries: Entry[] = [
    ...(slot ? [{ id: "continue", label: "Continuar", sub: "Volta de onde você parou" } as Entry] : []),
    { id: "new", label: "Novo jogo", sub: slot ? "Começa outra jornada do zero" : "Crie seu personagem" },
    { id: "options", label: "Opções", sub: "Som, controles e créditos" },
  ];
  const [stage, setStage] = useState<Stage>("press");
  const [row, setRow] = useState(0);
  const [confirmRow, setConfirmRow] = useState(1);
  const repeat = useRef(createRepeater());
  const lead = slot?.party?.[0]?.species;

  useEffect(() => {
    setContextTrack("title");
  }, []);

  function startNew() {
    playSfx("confirm");
    setScreen("creator");
  }

  function activate(index: number) {
    const entry = entries[index];
    if (!entry) return;
    if (entry.id === "continue") {
      if (!useGame.getState().continueGame()) {
        playSfx("cancel");
        return;
      }
      playSfx("confirm");
      setScreen("field");
      return;
    }
    if (entry.id === "new") {
      if (slot) {
        playSfx("confirm");
        setConfirmRow(1);
        setStage("overwrite");
        return;
      }
      startNew();
      return;
    }
    playSfx("confirm");
    setScreen("options");
  }

  function confirmOverwrite(index: number) {
    if (index === 0) startNew();
    else {
      playSfx("cancel");
      setStage("menu");
    }
  }

  useInputFrame((frame, dt) => {
    const next = repeat.current;
    if (stage === "press") {
      if (frame.pressed.confirm) {
        playSfx("confirm");
        setStage("menu");
      }
      return;
    }
    if (stage === "overwrite") {
      if (next("left", frame.held.left, dt) || next("up", frame.held.up, dt)) setConfirmRow(0);
      if (next("right", frame.held.right, dt) || next("down", frame.held.down, dt)) setConfirmRow(1);
      if (frame.pressed.cancel) confirmOverwrite(1);
      else if (frame.pressed.confirm) confirmOverwrite(confirmRow);
      return;
    }
    if (next("up", frame.held.up, dt)) {
      playSfx("cursor");
      setRow((value) => (value + entries.length - 1) % entries.length);
    }
    if (next("down", frame.held.down, dt)) {
      playSfx("cursor");
      setRow((value) => (value + 1) % entries.length);
    }
    if (frame.pressed.cancel) {
      playSfx("cancel");
      setStage("press");
    }
    if (frame.pressed.confirm) activate(row);
  });

  return (
    <div className="title-scene" onClick={stage === "press" ? () => setStage("menu") : undefined}>
      <div className="ts-sky" />
      <div className="ts-stars" />
      <div className="ts-sun" />
      <div className="ts-clouds ts-clouds-far" />
      <div className="ts-clouds ts-clouds-near" />
      <div className="ts-mountains" />
      <div className="ts-hills" />
      <div className="ts-ground" />

      <header className="ts-logo">
        <span className="ts-region">Região de Asteria</span>
        <h1 className="ts-wordmark" data-text="JORNADA">
          JORNADA
        </h1>
        <span className="ts-tagline">uma aventura em pixel</span>
      </header>

      <div className="ts-hero">
        <CharacterPreview appearance={preview} scale={6} walk={false} />
        <span className="ts-hero-shadow" />
      </div>

      {stage === "press" ? (
        <p className="ts-press">Pressione Z ou clique para começar</p>
      ) : (
        <section className="ts-menu" aria-label="Menu principal">
          {entries.map((entry, index) => {
            const active = index === row && stage === "menu";
            return (
              <button
                key={entry.id}
                type="button"
                className={`ts-item${active ? " active" : ""}${entry.id === "continue" ? " has-save" : ""}`}
                onMouseEnter={() => stage === "menu" && setRow(index)}
                onClick={() => stage === "menu" && activate(index)}
              >
                <span className="ts-item-head">
                  <span className="ts-cursor" aria-hidden>
                    ▶
                  </span>
                  <span className="ts-item-label">{entry.label}</span>
                </span>
                <span className="ts-item-sub">{entry.sub}</span>
                {entry.id === "continue" && slot ? (
                  <span className="ts-save">
                    <span className="ts-save-face">
                      <CharacterPreview appearance={slot.appearance} scale={2} walk={false} />
                    </span>
                    <span className="ts-save-info">
                      <strong>{slot.appearance.name || "Viajante"}</strong>
                      <span>{placeName(slot.map)}</span>
                      <span className="ts-save-stats">
                        <span>Insígnias {slot.badges.length}</span>
                        <span>Pokédex {slot.dex.caught.length}</span>
                        <span>{formatTime(slot.playTime)}</span>
                      </span>
                    </span>
                    {lead ? (
                      <span className="ts-save-lead">
                        <MonSprite id={lead} size={30} />
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
          <p className="ts-hint">Setas escolhem · Z confirma · X volta</p>
        </section>
      )}

      {stage === "overwrite" ? (
        <div className="ts-modal" role="alertdialog" aria-label="Começar um novo jogo">
          <div className="ts-modal-card">
            <p className="ts-modal-title">Começar do zero?</p>
            <p>
              A jornada de <strong>{slot?.appearance.name || "Viajante"}</strong> será apagada quando você criar o novo personagem.
            </p>
            <div className="ts-modal-actions">
              {["Começar do zero", "Voltar"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`ts-modal-btn${index === 0 ? " danger" : ""}${confirmRow === index ? " active" : ""}`}
                  onMouseEnter={() => setConfirmRow(index)}
                  onClick={() => confirmOverwrite(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
