"use client";

import { useMemo, useRef, useState } from "react";
import { Portrait } from "@/components/game/Portrait";
import { TRACKS, playSfx, unlockAudio } from "@/lib/audio/engine";
import { defaultAppearance } from "@/lib/character/appearance";
import { labelItem } from "@/lib/character/labels";
import type { Catalog, Credit } from "@/lib/character/types";
import { useSession } from "@/lib/game/session";
import { beginCapture, createRepeater, useInputFrame } from "@/lib/input/engine";
import { formatKey, formatPadButton } from "@/lib/input/labels";
import { ACTION_LABEL, ACTIONS, type Action } from "@/lib/input/types";
import { useSave } from "@/lib/save/store";
import { useSettings } from "@/lib/settings/store";

const TABS = ["Controles", "Áudio", "Imagem", "Créditos"];

function shortPad(id: string): string {
  const clean = id.split("(")[0]?.trim();
  return clean || "Controle";
}

function padLabel(index: number | null): string {
  const xbox = formatPadButton(index, "xbox");
  const playstation = formatPadButton(index, "playstation");
  return xbox === playstation ? xbox : `${xbox} / ${playstation}`;
}

function creditLines(catalog: Catalog): { name: string; credit: Credit }[] {
  const records = [catalog.body, ...(catalog.shadow ? [catalog.shadow] : []), ...catalog.items];
  const lines: { name: string; credit: Credit }[] = [];
  for (const record of records) {
    const name = record.name ?? "Corpo";
    for (const credit of record.credits) lines.push({ name: labelItem(name), credit });
  }
  return lines;
}

export function OptionsMenu({ catalog }: { catalog: Catalog }) {
  const setScreen = useSession((state) => state.setScreen);
  const settings = useSettings();
  const saved = useSave((state) => state.slot?.appearance ?? null);
  const preview = saved ?? defaultAppearance(catalog);
  const [tab, setTab] = useState(0);
  const [row, setRow] = useState(1);
  const [chip, setChip] = useState(0);
  const [listening, setListening] = useState(false);
  const [padLine, setPadLine] = useState("Nenhum manete conectado. Aperte um botão nele.");
  const repeat = useRef(createRepeater());
  const scroller = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => creditLines(catalog), [catalog]);
  const authors = useMemo(() => {
    const names = new Set<string>();
    for (const line of lines) for (const author of line.credit.authors) names.add(author);
    return [...names].sort((a, b) => a.localeCompare(b, "pt"));
  }, [lines]);

  const rowCount = tab === 0 ? 11 : tab === 1 ? 5 : tab === 3 ? 2 : 2;

  function leave() {
    playSfx("cancel");
    setScreen("title");
  }

  function nudge(delta: number) {
    if (tab === 0 && row === 0) return setTab((value) => (value + delta + TABS.length) % TABS.length);
    if (tab === 0 && row >= 1 && row <= 8) {
      setChip((value) => Math.min(2, Math.max(0, value + delta)));
      return;
    }
    if (tab === 0 && row === 9) {
      settings.setDeadzone(settings.deadzone + delta * 0.02);
      return;
    }
    if (tab === 1 && row === 0) return setTab((value) => (value + delta + TABS.length) % TABS.length);
    if (tab === 1 && row === 1) {
      const index = Math.max(0, TRACKS.findIndex((track) => track.id === settings.trackId));
      const next = TRACKS[(index + delta + TRACKS.length) % TRACKS.length];
      if (!next) return;
      settings.setTrackId(next.id);
      unlockAudio();
      return;
    }
    if (tab === 1 && row === 2) settings.setMaster(settings.master + delta * 0.05);
    if (tab === 1 && row === 3) settings.setMusic(settings.music + delta * 0.05);
    if (tab === 1 && row === 4) settings.setSfx(settings.sfx + delta * 0.05);
    if (tab === 2 && row === 0) return setTab((value) => (value + delta + TABS.length) % TABS.length);
    if (tab === 2 && row === 1) settings.setBrightness(settings.brightness + delta * 0.05);
    if (tab === 3 && row === 0) setTab((value) => (value + delta + TABS.length) % TABS.length);
  }

  function arm(action: Action, index: number) {
    setChip(index);
    setListening(true);
    beginCapture(index === 2 ? { device: "pad", action, slot: 0 } : { device: "key", action, slot: index });
  }

  useInputFrame((frame, dt) => {
    const status = frame.padName
      ? `Manete: ${shortPad(frame.padName)}`
      : "Nenhum manete conectado. Aperte um botão nele.";
    setPadLine((current) => (current === status ? current : status));
    if (listening && !frame.capture) setListening(false);
    if (listening || frame.capture) return;
    const step = repeat.current;
    if (tab === 3 && row === 1) {
      const box = scroller.current;
      if (step("up", frame.held.up, dt)) {
        if (box && box.scrollTop > 0) box.scrollTop -= 32;
        else setRow(0);
      }
      if (step("down", frame.held.down, dt) && box) box.scrollTop += 32;
    } else {
      if (step("up", frame.held.up, dt)) setRow((value) => Math.max(0, value - 1));
      if (step("down", frame.held.down, dt)) setRow((value) => Math.min(rowCount - 1, value + 1));
    }
    if (step("left", frame.held.left, dt)) nudge(-1);
    if (step("right", frame.held.right, dt)) nudge(1);
    if (frame.pressed.cancel) leave();
    if (frame.pressed.confirm && tab === 0 && row >= 1 && row <= 8) arm(ACTIONS[row - 1], chip);
    if (frame.pressed.confirm && tab === 0 && row === 10) {
      settings.resetControls();
      playSfx("confirm");
    }
  });

  return (
    <div className="screen options-layout">
      <section className="panel options-panel">
        <h1>Opções</h1>
        <div className={row === 0 ? "tabs focused" : "tabs"}>
          {TABS.map((label, index) => (
            <button
              key={label}
              type="button"
              className={tab === index ? "tab active" : "tab"}
              onClick={() => {
                setTab(index);
                setRow(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 0 ? (
          <div className="rows">
            <p className={row === 0 ? "note active" : "note"}>{padLine}</p>
            {ACTIONS.map((action, index) => (
              <div key={action} className={row === index + 1 ? "bind active" : "bind"}>
                <span>{ACTION_LABEL[action]}</span>
                {[0, 1].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={row === index + 1 && chip === slot ? "chip hot" : "chip"}
                    onClick={() => {
                      setRow(index + 1);
                      arm(action, slot);
                    }}
                  >
                    {formatKey(settings.keyboard[action][slot])}
                  </button>
                ))}
                <button
                  type="button"
                  className={row === index + 1 && chip === 2 ? "chip hot" : "chip"}
                  onClick={() => {
                    setRow(index + 1);
                    arm(action, 2);
                  }}
                >
                  {padLabel(settings.pad[action])}
                </button>
              </div>
            ))}
            <button type="button" className={row === 9 ? "row active" : "row"} onClick={() => setRow(9)}>
              <span>Zona morta</span>
              <strong>{Math.round(settings.deadzone * 100)}%</strong>
            </button>
            <button
              type="button"
              className={row === 10 ? "row active" : "row"}
              onClick={() => {
                settings.resetControls();
                playSfx("confirm");
              }}
            >
              Restaurar controles
            </button>
            <p className="muted">O analógico esquerdo sempre anda. Esquerda e direita ajustam o item marcado.</p>
          </div>
        ) : null}
        {tab === 1 ? (
          <div className="rows">
            <button type="button" className={row === 1 ? "row active" : "row"} onClick={() => setRow(1)}>
              <span>Música</span>
              <strong>{TRACKS.find((track) => track.id === settings.trackId)?.label}</strong>
            </button>
            <label className={row === 2 ? "row active" : "row"}>
              <span>Geral</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.master} onChange={(event) => settings.setMaster(Number(event.target.value))} />
            </label>
            <label className={row === 3 ? "row active" : "row"}>
              <span>Música</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.music} onChange={(event) => settings.setMusic(Number(event.target.value))} />
            </label>
            <label className={row === 4 ? "row active" : "row"}>
              <span>Efeitos</span>
              <input type="range" min={0} max={1} step={0.01} value={settings.sfx} onChange={(event) => settings.setSfx(Number(event.target.value))} />
            </label>
            <p className="muted">Faixas de Aureolus_Omicron, CC0. A música escolhida continua nas outras telas.</p>
          </div>
        ) : null}
        {tab === 2 ? (
          <div className="rows">
            <label className={row === 1 ? "row active" : "row"}>
              <span>Brilho {Math.round(settings.brightness * 100)}%</span>
              <input
                type="range"
                min={0.4}
                max={1.4}
                step={0.01}
                value={settings.brightness}
                onChange={(event) => settings.setBrightness(Number(event.target.value))}
              />
            </label>
          </div>
        ) : null}
        {tab === 3 ? (
          <div className="credits" ref={scroller}>
            <p>{catalog.notice}</p>
            <p>Música: 15 Melodic RPG Chiptunes, Aureolus_Omicron, CC0.</p>
            <p>Jornada é um jogo original e não usa nomes, criaturas nem trilhas de franquias.</p>
            <p>{authors.join(", ")}</p>
            <ul>
              {lines.map((line, index) => (
                <li key={`${line.name}-${index}`}>
                  {line.name}: {line.credit.authors.join(", ")} ({line.credit.licenses.join(", ")})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {listening ? (
          <p className="listen">
            {chip === 2 ? "Pressione o botão do manete." : "Pressione a nova tecla."} Esc cancela.
          </p>
        ) : (
          <p className="hint-inline">X volta ao título</p>
        )}
      </section>
      <aside className="stage-card">
        <Portrait catalog={catalog} appearance={preview} mode="idle" />
      </aside>
    </div>
  );
}
