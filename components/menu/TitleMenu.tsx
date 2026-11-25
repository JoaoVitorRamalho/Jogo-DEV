"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { formatTime } from "@/components/menus/PauseMenu";
import { useBackdrop, usePoke } from "@/components/menu/title/backdrop";
import { PartyIcon, Portrait } from "@/components/menu/title/pixels";
import { SaveManager } from "@/components/menu/SaveManager";
import { CITIES } from "@/data/cities";
import { TYPE_COLOR } from "@/data/pokemon/types";
import { useGame, type GameState } from "@/game/state/store";
import { COMPLETE_LEVEL, COMPLETE_MONEY, completeSave, testSave } from "@/game/state/testSave";
import { DEX_ORDER, dexEntries } from "@/data/pokemon/species";
import { playSfx, setContextTrack } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { createRepeater, useInputFrame } from "@/lib/input/engine";

type Entry = { id: "continue" | "new" | "options" | "saves"; label: string; sub: string };
type Stage = "press" | "menu" | "overwrite" | "test" | "complete" | "saves";

/** ↑ ↑ ↓ ↓ ← → ← → X Z abre o save de teste. */
const CHEAT = ["up", "up", "down", "down", "left", "right", "left", "right", "cancel", "confirm"] as const;
const CHEAT_KEYS = ["up", "down", "left", "right", "cancel", "confirm"] as const;
/** No celular não tem setas: 7 toques no logo em 4 segundos abrem o mesmo save. */
const LOGO_TAPS = 7;

/** Tira o ?save=teste da barra para o recarregar não abrir o aviso de novo. */
function dropTestParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("save")) return;
  url.searchParams.delete("save");
  window.history.replaceState(null, "", url);
}

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
          Pokédex <b>{dexEntries(slot.dex.caught).length}</b> / {dexEntries(slot.dex.seen).length}
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
  const poke = usePoke();
  const entries: Entry[] = [
    ...(slot ? [{ id: "continue", label: "Continuar", sub: "Volta de onde você parou" } as Entry] : []),
    { id: "new", label: "Novo jogo", sub: slot ? "Começa outra jornada do zero" : "Crie seu personagem" },
    { id: "options", label: "Opções", sub: "Som, controles e créditos" },
    { id: "saves", label: "Saves e backups", sub: "Importe, baixe ou recupere sua jornada" },
  ];
  // Voltando das opções ou do criador, o menu já está aberto e no item de onde veio.
  const [stage, setStage] = useState<Stage>(() => {
    const from = useBackdrop.getState().stage;
    return from === "options" || from === "creator" ? "menu" : "press";
  });
  const [row, setRow] = useState(() => {
    const from = useBackdrop.getState().stage;
    const at = entries.findIndex((entry) => entry.id === (from === "options" ? "options" : "new"));
    return from === "options" || from === "creator" ? Math.max(0, at) : 0;
  });
  const [confirmRow, setConfirmRow] = useState(1);
  const repeat = useRef(createRepeater());
  const typed = useRef<string[]>([]);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    // O fundo trata o save completo como o de teste: mesmo modal por cima.
    useBackdrop.getState().setStage(stage === "complete" || stage === "saves" ? "test" : stage);
  }, [stage]);

  /** Clique no fundo: a cena reage; na tela de "aperte", fora das surpresas, abre o menu. */
  function onBackground(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const hit = poke(event.clientX, event.clientY);
    // Mew achado: só a festa, sem abrir menu
    if (hit === "mew") return;
    if (hit === "logo" && stage !== "test") {
      const now = performance.now();
      taps.current = [...taps.current.filter((at) => now - at < 4000), now];
      if (taps.current.length >= LOGO_TAPS) {
        taps.current = [];
        openTest();
        return;
      }
    }
    const secret = hit === "partner" || hit === "hero" || hit === "logo" || hit === "lighthouse";
    if (stage === "press" && !secret) openMenu();
  }

  function hover(index: number) {
    if (stage !== "menu" || index === row) return;
    playSfx("cursor");
    setRow(index);
  }

  useEffect(() => {
    setContextTrack("title");
    const param = new URLSearchParams(window.location.search).get("save");
    if (param === "teste" || param === "completo") {
      setConfirmRow(0);
      setStage(param === "teste" ? "test" : "complete");
    }
  }, []);

  function openTest() {
    playSfx("discover");
    setConfirmRow(0);
    setStage("test");
  }

  function confirmTest(index: number) {
    dropTestParam();
    if (index !== 0) {
      playSfx("cancel");
      setStage("menu");
      return;
    }
    useGame.getState().loadState(testSave(slot?.appearance), "test");
    playSfx("confirm");
    setScreen("field");
  }

  /** `?save=completo`: completa o jogo salvo (ou o de teste, se não houver) e entra nele. */
  function confirmComplete(index: number) {
    dropTestParam();
    if (index !== 0) {
      playSfx("cancel");
      setStage("menu");
      return;
    }
    useGame.getState().loadState(completeSave(slot ?? testSave()), "complete");
    playSfx("confirm");
    setScreen("field");
  }

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
    if (entry.id === "saves") {
      playSfx("confirm");
      setStage("saves");
      return;
    }
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
    if (stage === "saves") return;
    const next = repeat.current;
    for (const key of CHEAT_KEYS) {
      if (frame.pressed[key]) typed.current = [...typed.current, key].slice(-CHEAT.length);
    }
    if (stage !== "test" && stage !== "complete" && typed.current.join() === CHEAT.join()) {
      typed.current = [];
      openTest();
      return;
    }
    if (stage === "test" || stage === "complete") {
      const pick = stage === "test" ? confirmTest : confirmComplete;
      if (next("left", frame.held.left, dt) || next("up", frame.held.up, dt)) setConfirmRow(0);
      if (next("right", frame.held.right, dt) || next("down", frame.held.down, dt)) setConfirmRow(1);
      if (frame.pressed.cancel) pick(1);
      else if (frame.pressed.confirm) pick(confirmRow);
      return;
    }
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
    <div className={`ts-layer stage-${stage}`} onClick={onBackground}>
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
                  onMouseEnter={() => hover(index)}
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
              A jornada de <strong>{slot?.appearance.name || "Viajante"}</strong> ficará guardada em Saves e backups quando você criar o novo personagem.
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

      {stage === "test" ? (
        <div className="ts-modal" role="alertdialog" aria-label="Carregar o save de teste">
          <div className="ts-modal-card">
            <p className="ts-modal-title">Save de teste</p>
            <ul className="ts-modal-list">
              <li>Capítulo 1 completo, na entrada da Rota 2</li>
              <li>Os treinadores da rota ainda esperam por você</li>
              <li>Equipe no nível 30 e as 6 pedras de mega</li>
              <li>₽50.000, mochila cheia e 8 Pokémon na caixa</li>
            </ul>
            {slot ? (
              <p className="ts-modal-note">
                A jornada de <strong>{slot.appearance.name || "Viajante"}</strong> ficará guardada em Saves e backups.
              </p>
            ) : null}
            <div className="ts-modal-actions">
              {["Carregar", "Voltar"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`ts-modal-btn${confirmRow === index ? " active" : ""}`}
                  onMouseEnter={() => setConfirmRow(index)}
                  onClick={() => confirmTest(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {stage === "complete" ? (
        <div className="ts-modal" role="alertdialog" aria-label="Completar o jogo salvo">
          <div className="ts-modal-card">
            <p className="ts-modal-title">Save completo</p>
            <ul className="ts-modal-list">
              <li>Os {DEX_ORDER.length} Pokémon vistos e capturados na Pokédex</li>
              <li>Quem falta entra na caixa, no nível {COMPLETE_LEVEL}</li>
              <li>Todos os itens na mochila e ₽{COMPLETE_MONEY.toLocaleString("pt-BR")}</li>
              <li>A história e o lugar onde você parou continuam iguais</li>
            </ul>
            <p className="ts-modal-note">
              {slot ? (
                <>
                  Vale para a jornada de <strong>{slot.appearance.name || "Viajante"}</strong>. O save original ficará guardado em Saves e backups.
                </>
              ) : (
                "Sem jogo salvo: começa pelo save de teste."
              )}
            </p>
            <div className="ts-modal-actions">
              {["Completar", "Voltar"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={`ts-modal-btn${confirmRow === index ? " active" : ""}`}
                  onMouseEnter={() => setConfirmRow(index)}
                  onClick={() => confirmComplete(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {stage === "saves" ? <SaveManager onClose={() => setStage("menu")} /> : null}
    </div>
  );
}
