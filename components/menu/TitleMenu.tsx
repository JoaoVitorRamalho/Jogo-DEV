"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatTime } from "@/components/menus/PauseMenu";
import { PartyIcon, Portrait } from "@/components/menu/title/pixels";
import { TitleCanvas } from "@/components/menu/title/TitleCanvas";
import { CITIES } from "@/data/cities";
import { TYPE_COLOR } from "@/data/pokemon/types";
import { defaultAppearance } from "@/game/character/appearance";
import { useGame, type GameState } from "@/game/state/store";
import { playSfx, setContextTrack } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { createRepeater, useInputFrame } from "@/lib/input/engine";

type Entry = { id: "continue" | "new" | "options"; label: string; sub: string };
type Stage = "press" | "menu" | "overwrite";

const GYMS = CITIES.flatMap((city) => (city.gym ? [city.gym] : []));

function placeName(map: string): string {
  return CITIES.find((city) => city.maps.includes(map))?.name ?? ({ route1: "Rota 1", route2: "Rota 2", forest: "Floresta de Aster" } as Record<string, string>)[map] ?? "Asteria";
}

/** Resumo do jogo salvo: quem é, onde parou, insígnias, equipe, Pokédex e tempo. */
function SaveCard({ slot, onPick }: { slot: GameState; onPick: () => void }) {
  const badges = slot.badges.length;
  return (
    <div className="ts-save" onClick={onPick}>
      <div className="ts-save-head">
        <span className="ts-save-face">
          <Portrait appearance={slot.appearance} />
        </span>
        <span className="ts-save-who">
          <strong>{slot.appearance.name || "Viajante"}</strong>
          <span>{placeName(slot.map)}</span>
        </span>
        <ul className="ts-badges" aria-label={`${badges} de ${GYMS.length} insígnias`}>
          {GYMS.map((gym, index) => (
            <li
              key={gym.badge}
              className={index < badges ? "lit" : undefined}
              style={{ "--badge": TYPE_COLOR[gym.type] } as CSSProperties}
              title={index < badges ? gym.badge : undefined}
            />
          ))}
        </ul>
      </div>
      <ul className="ts-party" aria-label="Equipe">
        {Array.from({ length: 6 }, (_, index) => {
          const mon = slot.party[index];
          return (
            <li key={index} className={mon ? (mon.hp > 0 ? undefined : "out") : "empty"}>
              {mon ? <PartyIcon id={mon.species} /> : null}
            </li>
          );
        })}
      </ul>
      <div className="ts-save-foot">
        <span>
          Pokédex <b>{slot.dex.caught.length}</b> / {slot.dex.seen.length}
        </span>
        <span className="ts-save-time" aria-label="Tempo de jogo">
          {formatTime(slot.playTime)}
        </span>
      </div>
    </div>
  );
}

export function TitleMenu() {
  const slot = useGame((state) => state.slot);
  const setScreen = useSession((state) => state.setScreen);
  const appearance = useMemo(() => slot?.appearance ?? defaultAppearance(), [slot]);
  const entries: Entry[] = [
    ...(slot ? [{ id: "continue", label: "Continuar", sub: "Volta de onde você parou" } as Entry] : []),
    { id: "new", label: "Novo jogo", sub: slot ? "Começa outra jornada do zero" : "Crie seu personagem" },
    { id: "options", label: "Opções", sub: "Som, controles e créditos" },
  ];
  const [stage, setStage] = useState<Stage>("press");
  const [row, setRow] = useState(0);
  const [confirmRow, setConfirmRow] = useState(1);
  const repeat = useRef(createRepeater());
  const lead = slot?.party?.find((mon) => mon.hp > 0)?.species ?? slot?.party?.[0]?.species ?? null;

  useEffect(() => {
    setContextTrack("title");
  }, []);

  function openMenu() {
    playSfx("confirm");
    setStage("menu");
  }

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
      if (frame.pressed.confirm) openMenu();
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
    <div className={`title-scene stage-${stage}`} onClick={stage === "press" ? openMenu : undefined}>
      <TitleCanvas stage={stage} appearance={appearance} partner={lead} />
      <h1 className="ts-sr">Jornada, Região de Asteria</h1>

      {stage === "press" ? (
        <p className="ts-press">
          <span className="ts-press-key">Aperte Z ou clique para começar</span>
          <span className="ts-press-touch">Toque para começar</span>
        </p>
      ) : (
        <section className="ts-panel" aria-label="Menu principal">
          <ul className="ts-list">
            {entries.map((entry, index) => {
              const pick = () => {
                if (stage === "menu") activate(index);
              };
              return (
                <li
                  key={entry.id}
                  className={index === row && stage === "menu" ? "active" : undefined}
                  onMouseEnter={() => stage === "menu" && setRow(index)}
                >
                  <button type="button" className="ts-item" onClick={pick}>
                    <span className="ts-cursor" aria-hidden />
                    <span>{entry.label}</span>
                  </button>
                  {entry.id === "continue" && slot ? <SaveCard slot={slot} onPick={pick} /> : null}
                </li>
              );
            })}
          </ul>
          <p className="ts-desc">{entries[row]?.sub}</p>
        </section>
      )}

      {stage === "menu" ? (
        <p className="ts-hint" aria-hidden>
          <span><kbd>Setas</kbd> escolhe</span>
          <span><kbd>Z</kbd> confirma</span>
          <span><kbd>X</kbd> volta</span>
        </p>
      ) : null}

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
