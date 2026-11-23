"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { useTypewriter } from "@/components/hud/useTypewriter";
import { type IconName, PixelIcon } from "@/components/menu/PixelIcon";
import { useBackdrop, usePoke } from "@/components/menu/title/backdrop";
import { CREDITS } from "@/data/credits";
import { TRACKS, playSfx, unlockAudio } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { beginCapture, createRepeater, useInputFrame } from "@/lib/input/engine";
import { familyFromId, formatKey, formatPadButton } from "@/lib/input/labels";
import { ACTION_LABEL, ACTIONS, type Action, type PadFamily } from "@/lib/input/types";
import { TEXT_SPEEDS, useSettings } from "@/lib/settings/store";

type TabId = "game" | "controls" | "audio" | "video" | "credits";

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: "game", label: "Jogo", icon: "star" },
  { id: "controls", label: "Controles", icon: "pad" },
  { id: "audio", label: "Áudio", icon: "note" },
  { id: "video", label: "Imagem", icon: "sun" },
  { id: "credits", label: "Créditos", icon: "doc" },
];

/** Uma linha da aba: o que ← → e o confirmar fazem nela, e a frase que aparece embaixo. */
type Row = { desc: string; nudge?: (delta: number) => void; press?: () => void };

const SAMPLE = "Olá, treinador! É assim que as falas vão aparecer.";
const CHIPS = ["Tecla 1", "Tecla 2", "Manete"];
// Quadrados de calibrar o brilho: o primeiro some no preto, o segundo aparece de leve.
const CALIBRATION = ["#050505", "#0d0d0d", "#181818", "#262626", "#3a3a3a"];

function shortPad(id: string): string {
  const clean = id.split("(")[0]?.trim();
  return clean || "Controle";
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Barra de blocos: ← → ajustam pelo teclado; arrastar com o mouse ou o dedo também. */
function Meter({ label, value, min = 0, max = 1, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  const segments = 20;
  const lit = Math.round(((value - min) / (max - min)) * segments);

  function drag(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const next = Math.round(k * segments);
    if (next !== lit) onChange(min + (next / segments) * (max - min));
  }

  return (
    <div
      className="op-meter"
      role="slider"
      aria-label={label}
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
      aria-valuenow={Math.round(value * 100)}
      aria-valuetext={percent(value)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        drag(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) drag(event);
      }}
    >
      {Array.from({ length: segments }, (_, index) => (
        <i key={index} className={index < lit ? "on" : undefined} />
      ))}
    </div>
  );
}

/** ◀ valor ▶: as setas trocam, clicar no valor avança. */
function Cycle({ value, onStep, children }: { value: string; onStep: (delta: number) => void; children?: ReactNode }) {
  return (
    <span className="op-cycle">
      <button type="button" className="op-arrow" aria-label="Anterior" onClick={() => onStep(-1)}>
        <PixelIcon name="left" />
      </button>
      <button type="button" className="op-cycle-value" onClick={() => onStep(1)}>
        {value}
        {children}
      </button>
      <button type="button" className="op-arrow" aria-label="Próximo" onClick={() => onStep(1)}>
        <PixelIcon name="right" />
      </button>
    </span>
  );
}

/** Fala de exemplo, digitada na velocidade escolhida e repetida enquanto a aba está aberta. */
function SpeedSample() {
  const [round, setRound] = useState(0);
  const typer = useTypewriter(round % 2 ? `${SAMPLE}​` : SAMPLE, 48);
  useEffect(() => {
    if (!typer.done) return undefined;
    const id = window.setTimeout(() => setRound((value) => value + 1), 1800);
    return () => window.clearTimeout(id);
  }, [typer.done]);
  return (
    <p className="op-sample" aria-hidden>
      {typer.shown}
      <i className={typer.done ? "op-caret on" : "op-caret"} />
    </p>
  );
}

export function OptionsMenu({ onClose }: { onClose?: () => void }) {
  const setScreen = useSession((state) => state.setScreen);
  const settings = useSettings();
  const poke = usePoke();
  const [tab, setTab] = useState<TabId>("game");
  const [row, setRow] = useState(1);
  const [chip, setChip] = useState(0);
  const [listening, setListening] = useState<{ action: Action; chip: number } | null>(null);
  const [pad, setPad] = useState<string | null>(null);
  // Nome do botão do controle ligado (Cruz no PlayStation, A no Xbox); sem controle, o do Xbox.
  const [padFamily, setPadFamily] = useState<PadFamily>("xbox");
  const [resetArmed, setResetArmed] = useState(false);
  const [full, setFull] = useState({ can: false, on: false });
  const repeat = useRef(createRepeater());
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  // No título, a cena do fundo sabe que está nas opções (e o menu volta para este item).
  useEffect(() => {
    if (!onClose) useBackdrop.getState().setStage("options");
  }, [onClose]);

  useEffect(() => {
    const sync = () => setFull({ can: Boolean(document.fullscreenEnabled), on: Boolean(document.fullscreenElement) });
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!resetArmed) return undefined;
    const id = window.setTimeout(() => setResetArmed(false), 2600);
    return () => window.clearTimeout(id);
  }, [resetArmed]);

  // A linha marcada sempre visível quando a aba rola (celular, tela baixa).
  useEffect(() => {
    body.current?.querySelector<HTMLElement>(".op-row.active")?.scrollIntoView({ block: "nearest" });
  }, [row, tab]);

  const tabIndex = TABS.findIndex((item) => item.id === tab);
  const track = TRACKS.find((item) => item.id === settings.trackId) ?? TRACKS[0];
  const speed = TEXT_SPEEDS[settings.textSpeed] ?? TEXT_SPEEDS[1];

  function leave() {
    playSfx("cancel");
    if (onClose) onClose();
    else setScreen("title");
  }

  function openTab(next: TabId, keepRow = false) {
    if (next === tab) return;
    playSfx("cursor");
    setTab(next);
    setRow(keepRow ? 0 : 1);
    setResetArmed(false);
  }

  function stepTab(delta: number) {
    openTab(TABS[(tabIndex + delta + TABS.length) % TABS.length].id, true);
  }

  function setVolume(kind: "master" | "music" | "sfx", value: number) {
    const before = settings[kind];
    if (kind === "master") settings.setMaster(value);
    if (kind === "music") settings.setMusic(value);
    if (kind === "sfx") settings.setSfx(value);
    unlockAudio();
    // Um bipe no volume novo, para ouvir o que mudou (a música já se ouve sozinha).
    if (kind !== "music" && Math.round(before * 20) !== Math.round(value * 20)) playSfx("cursor");
  }

  function cycleTrack(delta: number) {
    const index = Math.max(0, TRACKS.findIndex((item) => item.id === settings.trackId));
    const next = TRACKS[(index + delta + TRACKS.length) % TRACKS.length];
    settings.setTrackId(next.id);
    unlockAudio();
    playSfx("cursor");
  }

  function cycleSpeed(delta: number) {
    settings.setTextSpeed((settings.textSpeed + delta + TEXT_SPEEDS.length) % TEXT_SPEEDS.length);
    playSfx("cursor");
  }

  function toggleFollower() {
    settings.setFollower(!settings.follower);
    playSfx(settings.follower ? "cancel" : "confirm");
  }

  function toggleFullscreen() {
    playSfx("confirm");
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  }

  function arm(action: Action, index: number) {
    setChip(index);
    setListening({ action, chip: index });
    playSfx("confirm");
    beginCapture(index === 2 ? { device: "pad", action, slot: 0 } : { device: "key", action, slot: index });
  }

  function reset() {
    if (!resetArmed) {
      playSfx("cursor");
      setResetArmed(true);
      return;
    }
    settings.resetControls();
    setResetArmed(false);
    playSfx("confirm");
  }

  const rows: Row[] =
    tab === "game"
      ? [
          { desc: "Quanto as falas demoram para aparecer. Segurar o confirmar acelera.", nudge: cycleSpeed, press: () => cycleSpeed(1) },
          { desc: "O primeiro Pokémon da equipe anda atrás de você no mapa.", nudge: toggleFollower, press: toggleFollower },
        ]
      : tab === "controls"
        ? [
            ...ACTIONS.map(
              (action): Row => ({
                desc: `Confirmar troca o botão marcado de "${ACTION_LABEL[action]}". Esc cancela.`,
                nudge: (delta) => setChip((value) => Math.min(2, Math.max(0, value + delta))),
                press: () => arm(action, chip),
              }),
            ),
            { desc: "Quanto o analógico precisa inclinar para andar.", nudge: (delta) => settings.setDeadzone(settings.deadzone + delta * 0.02) },
            { desc: "Volta todas as teclas e botões para o padrão.", press: reset },
          ]
        : tab === "audio"
          ? [
              { desc: "Automática troca a música conforme o lugar. Escolha uma para ouvir sempre a mesma.", nudge: cycleTrack, press: () => cycleTrack(1) },
              { desc: "Volume de tudo.", nudge: (delta) => setVolume("master", settings.master + delta * 0.05) },
              { desc: "Volume da música.", nudge: (delta) => setVolume("music", settings.music + delta * 0.05) },
              { desc: "Volume dos efeitos e dos gritos dos Pokémon.", nudge: (delta) => setVolume("sfx", settings.sfx + delta * 0.05) },
            ]
          : tab === "video"
            ? [
                { desc: "Suba até o segundo quadrado aparecer de leve e o primeiro quase sumir.", nudge: (delta) => settings.setBrightness(settings.brightness + delta * 0.05) },
                ...(full.can ? [{ desc: "Esconde as barras do navegador.", nudge: toggleFullscreen, press: toggleFullscreen }] : []),
              ]
            : [{ desc: "Quem fez a arte, a música e o som do jogo." }];

  const rowCount = rows.length + 1;
  const current = row === 0 ? null : rows[row - 1];

  function move(delta: number) {
    setRow((value) => {
      const next = Math.min(rowCount - 1, Math.max(0, value + delta));
      if (next !== value) playSfx("cursor");
      return next;
    });
  }

  useInputFrame((frame, dt) => {
    const status = frame.padName ? shortPad(frame.padName) : null;
    setPad((value) => (value === status ? value : status));
    const family = frame.padName ? familyFromId(frame.padName) : "xbox";
    setPadFamily((value) => (value === family ? value : family));
    if (listening && !frame.capture) setListening(null);
    if (listening || frame.capture) return;
    const step = repeat.current;
    if (tab === "credits" && row === 1) {
      const box = scroller.current;
      if (step("up", frame.held.up, dt)) {
        if (box && box.scrollTop > 0) box.scrollTop -= 32;
        else move(-1);
      }
      if (step("down", frame.held.down, dt) && box) box.scrollTop += 32;
    } else {
      if (step("up", frame.held.up, dt)) move(-1);
      if (step("down", frame.held.down, dt)) move(1);
    }
    if (step("left", frame.held.left, dt)) (row === 0 ? stepTab(-1) : current?.nudge?.(-1));
    if (step("right", frame.held.right, dt)) (row === 0 ? stepTab(1) : current?.nudge?.(1));
    if (frame.pressed.cancel) leave();
    if (frame.pressed.confirm) {
      if (row === 0) move(1);
      else current?.press?.();
    }
  });

  /** Clique fora do painel: no título, a cena do fundo reage (as surpresas valem aqui também). */
  function onBackground(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) poke(event.clientX, event.clientY);
  }

  function line(index: number, className: string, label: ReactNode, value: ReactNode) {
    return (
      <div key={`row-${index}`} className={`op-row${className}${row === index ? " active" : ""}`} onMouseEnter={() => setRow(index)}>
        <span className="ts-cursor" aria-hidden />
        <span className="op-label">{label}</span>
        <span className="op-value">{value}</span>
      </div>
    );
  }

  const key = (action: Action, slot: number) => formatKey(settings.keyboard[action][slot]);

  return (
    <div className={onClose ? "op-layer in-game" : "op-layer"} onClick={onBackground}>
      <section className="op-panel" aria-labelledby="op-title">
        <header className="op-head">
          <h1 id="op-title">Opções</h1>
          <button type="button" className="op-back" onClick={leave}>
            <PixelIcon name="left" />
            {onClose ? "Voltar ao jogo" : "Voltar"}
          </button>
        </header>

        <nav className={row === 0 ? "op-tabs focus" : "op-tabs"} role="tablist" aria-label="Seções" onMouseEnter={() => setRow(0)}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "op-tab on" : "op-tab"}
              onClick={() => openTab(item.id)}
            >
              <PixelIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={`op-body tab-${tab}`} key={tab} ref={body} role="tabpanel">
          {tab === "game" ? (
            <>
              {line(1, "", "Velocidade do texto", <Cycle value={speed.label} onStep={cycleSpeed} />)}
              <SpeedSample key={settings.textSpeed} />
              {line(2, "", "Parceiro te segue", <Cycle value={settings.follower ? "Sim" : "Não"} onStep={toggleFollower} />)}
            </>
          ) : null}

          {tab === "controls" ? (
            <>
              <p className={pad ? "op-pad on" : "op-pad"}>
                <PixelIcon name="pad" />
                {pad ? `Manete conectado: ${pad}` : "Sem manete. Ligue um e aperte qualquer botão."}
              </p>
              <div className="op-cols" aria-hidden>
                <span />
                <span>Ação</span>
                {CHIPS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              {ACTIONS.map((action, index) => (
                <div key={action} className={row === index + 1 ? "op-row op-bind active" : "op-row op-bind"} onMouseEnter={() => setRow(index + 1)}>
                  <span className="ts-cursor" aria-hidden />
                  <span className="op-label">{ACTION_LABEL[action]}</span>
                  {[0, 1, 2].map((slot) => {
                    const hot = row === index + 1 && chip === slot;
                    const waiting = listening?.action === action && listening.chip === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        aria-label={`${ACTION_LABEL[action]}, ${CHIPS[slot]}`}
                        className={`op-key${slot === 2 ? " pad" : ""}${hot ? " hot" : ""}${waiting ? " wait" : ""}`}
                        onClick={() => {
                          setRow(index + 1);
                          arm(action, slot);
                        }}
                      >
                        {waiting ? "..." : slot === 2 ? formatPadButton(settings.pad[action], padFamily) : key(action, slot)}
                      </button>
                    );
                  })}
                </div>
              ))}
              {line(
                9,
                "",
                "Zona morta",
                <>
                  <Meter label="Zona morta" value={settings.deadzone} min={0.05} max={0.5} onChange={settings.setDeadzone} />
                  <b className="op-num">{percent(settings.deadzone)}</b>
                </>,
              )}
              <div className={`op-row op-reset${row === 10 ? " active" : ""}${resetArmed ? " armed" : ""}`} onMouseEnter={() => setRow(10)}>
                <span className="ts-cursor" aria-hidden />
                <button type="button" className="op-wide" onClick={reset}>
                  {resetArmed ? "Certeza? Aperte de novo" : "Restaurar padrão"}
                </button>
              </div>
            </>
          ) : null}

          {tab === "audio" ? (
            <>
              {line(
                1,
                "",
                "Música",
                <Cycle value={track.label} onStep={cycleTrack}>
                  <span className={settings.master > 0 && settings.music > 0 ? "op-eq on" : "op-eq"} aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </Cycle>,
              )}
              {(
                [
                  ["master", "Volume geral"],
                  ["music", "Música"],
                  ["sfx", "Efeitos"],
                ] as const
              ).map(([kind, label], index) =>
                line(
                  index + 2,
                  "",
                  label,
                  <>
                    <Meter label={label} value={settings[kind]} onChange={(value) => setVolume(kind, value)} />
                    <b className="op-num">{settings[kind] === 0 ? "Mudo" : percent(settings[kind])}</b>
                  </>,
                ),
              )}
            </>
          ) : null}

          {tab === "video" ? (
            <>
              {line(
                1,
                "",
                "Brilho",
                <>
                  <Meter label="Brilho" value={settings.brightness} min={0.4} max={1.4} onChange={settings.setBrightness} />
                  <b className="op-num">{percent(settings.brightness)}</b>
                </>,
              )}
              <div className="op-calib" aria-hidden>
                {CALIBRATION.map((color, index) => (
                  <i key={color} style={{ background: color }}>
                    {index + 1}
                  </i>
                ))}
              </div>
              {full.can ? line(2, "", "Tela cheia", <Cycle value={full.on ? "Sim" : "Não"} onStep={toggleFullscreen} />) : null}
            </>
          ) : null}

          {tab === "credits" ? (
            <div className={row === 1 ? "op-credits active" : "op-credits"} ref={scroller} onMouseEnter={() => setRow(1)}>
              {CREDITS.map((entry) => (
                <article key={entry.what}>
                  <h2>{entry.what}</h2>
                  <p>{entry.who}</p>
                  <span>{entry.license}</span>
                </article>
              ))}
              <p className="op-thanks">Obrigado por jogar.</p>
            </div>
          ) : null}
        </div>

        <p className="op-desc" aria-live="polite">
          {current?.desc ?? "Escolha uma seção. ← → também trocam."}
        </p>
      </section>

      <p className="ts-hint op-hint">
        <span>
          <kbd>{key("up", 0)}</kbd>
          <kbd>{key("down", 0)}</kbd> escolher
        </span>
        <span>
          <kbd>{key("left", 0)}</kbd>
          <kbd>{key("right", 0)}</kbd> ajustar
        </span>
        <span>
          <kbd>{key("confirm", 0)}</kbd> confirmar
        </span>
        <span>
          <kbd>{key("cancel", 0)}</kbd> voltar
        </span>
      </p>

      {listening ? (
        <div className="ts-modal op-listen" role="alertdialog" aria-live="assertive">
          <div className="ts-modal-card">
            <p className="ts-modal-title">{ACTION_LABEL[listening.action]}</p>
            <p>{listening.chip === 2 ? "Aperte o botão do manete." : "Aperte a nova tecla."}</p>
            <p className="ts-modal-note">Esc cancela.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
