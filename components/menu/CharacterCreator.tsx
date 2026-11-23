"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { CharacterPreview } from "@/components/character-creator/CharacterPreview";
import { type IconName, PixelIcon } from "@/components/menu/PixelIcon";
import { useBackdrop, usePoke } from "@/components/menu/title/backdrop";
import {
  type Appearance,
  BOTTOMS,
  CLOTH,
  EXTRAS,
  EYES,
  HAIR_COLORS,
  HAIR_STYLES,
  HEADWEAR,
  SHOES,
  SKIN,
  TOPS,
  defaultAppearance,
} from "@/game/character/appearance";
import { useGame } from "@/game/state/store";
import { playSfx } from "@/lib/audio/engine";
import { useSession } from "@/lib/game/session";
import { createRepeater, useInputFrame } from "@/lib/input/engine";
import { formatKey } from "@/lib/input/labels";
import { useSettings } from "@/lib/settings/store";

type Field = Exclude<keyof Appearance, "version" | "name">;
type Option = { id: string; label: string; swatch?: string };
type Look = "choices" | "swatches" | "thumbs";
type Row = { kind: "tabs" } | { kind: "name" } | { kind: "field"; field: Field; label: string; options: Option[]; look: Look } | { kind: "next" };
type Step = "you" | "hair" | "clothes" | "extras";

const STEPS: { id: Step; label: string; icon: IconName; title: string }[] = [
  { id: "you", label: "Você", icon: "face", title: "Quem é você?" },
  { id: "hair", label: "Cabelo", icon: "scissors", title: "Escolha o cabelo" },
  { id: "clothes", label: "Roupa", icon: "shirt", title: "Monte a roupa" },
  { id: "extras", label: "Extras", icon: "hat", title: "Os detalhes" },
];

const labels = (source: Record<string, string>): Option[] => Object.entries(source).map(([id, label]) => ({ id, label }));
const SKIN_OPTIONS: Option[] = Object.entries(SKIN).map(([id, v]) => ({ id, label: v.label, swatch: v.main }));
const EYE_OPTIONS: Option[] = Object.entries(EYES).map(([id, v]) => ({ id, label: v.label, swatch: v.color }));
const HAIR_COLOR_OPTIONS: Option[] = Object.entries(HAIR_COLORS).map(([id, v]) => ({ id, label: v.label, swatch: v.main }));
const CLOTH_OPTIONS: Option[] = Object.entries(CLOTH).map(([id, v]) => ({ id, label: v.label, swatch: v.main }));
const SEX_OPTIONS: Option[] = [
  { id: "male", label: "Masculino" },
  { id: "female", label: "Feminino" },
];

// Miniatura: janela de 16 × 16 pixels do quadro 16 × 32, começando nesta linha (cabeça na 7,
// tronco na 18, pernas na 23). Acessório de lado, para a mochila aparecer.
const CROP: Partial<Record<Field, number>> = { hairStyle: 3, headwear: 2, top: 11, bottom: 14, shoes: 14, extra: 5 };

// Ordem das direções ao girar: frente, esquerda, costas, direita (linhas da folha).
const TURN = [0, 3, 2, 1];

const NAMES = {
  male: ["Caio", "Theo", "Davi", "Nico", "Rafa", "Enzo", "Bento", "Igor", "Tomás", "Joca", "Levi", "Ravi"],
  female: ["Lia", "Bia", "Nina", "Mel", "Luna", "Clara", "Duda", "Malu", "Íris", "Jade", "Alice", "Cecília"],
};

const QUIPS = ["Que tal assim?", "Estiloso!", "Ousado.", "Combinou!", "Gostei disso.", "Pronto para a estrada."];

// Nomes que alguém da história já usa.
const NAME_EGGS: Record<string, string> = {
  gael: "Gael? Seu rival vai dizer que você copiou.",
  ren: "Ren... você ainda vai ouvir esse nome.",
  mae: "Sua mãe vai adorar a homenagem.",
  viajante: "O nome clássico. Respeito.",
  pokemon: "Ambicioso.",
};

function plain(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** Sorteia o visual inteiro, mantendo o nome e o corpo escolhidos. */
function roll(value: Appearance): Appearance {
  const next = { ...value } as Record<string, unknown>;
  const pool: [Field, Option[]][] = [
    ["skin", SKIN_OPTIONS],
    ["eyes", EYE_OPTIONS],
    ["hairStyle", labels(HAIR_STYLES)],
    ["hairColor", HAIR_COLOR_OPTIONS],
    ["top", labels(TOPS)],
    ["topColor", CLOTH_OPTIONS],
    ["bottom", labels(BOTTOMS)],
    ["bottomColor", CLOTH_OPTIONS],
    ["shoes", labels(SHOES)],
    ["shoesColor", CLOTH_OPTIONS],
    ["headwear", labels(HEADWEAR)],
    ["headwearColor", CLOTH_OPTIONS],
    ["extra", labels(EXTRAS)],
    ["extraColor", CLOTH_OPTIONS],
  ];
  for (const [field, options] of pool) next[field] = pick(options).id;
  return next as Appearance;
}

/** Tamanho do boneco grande: cabe na metade da tela sem passar de 12 vezes. */
function previewScale(): number {
  if (typeof window === "undefined") return 9;
  const { innerWidth: w, innerHeight: h } = window;
  if (w / h <= 0.9) return Math.max(4, Math.min(8, Math.floor((h * 0.27) / 32)));
  return Math.max(5, Math.min(12, Math.floor(Math.min((h * 0.44) / 32, (w * 0.28) / 16))));
}

export function CharacterCreator() {
  const setScreen = useSession((state) => state.setScreen);
  const keyboard = useSettings((state) => state.keyboard);
  const poke = usePoke();
  const [appearance, setAppearance] = useState<Appearance>(() => defaultAppearance("male"));
  const [step, setStep] = useState<Step>("you");
  const [visited, setVisited] = useState<Step[]>(["you"]);
  const [row, setRow] = useState(1);
  const [turn, setTurn] = useState<number | null>(null);
  const [scale, setScale] = useState(9);
  const [quip, setQuip] = useState<{ text: string; id: number } | null>(null);
  const [hearts, setHearts] = useState<number[]>([]);
  const [review, setReview] = useState(false);
  const [reviewRow, setReviewRow] = useState(1);
  const nameRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hopRef = useRef<HTMLDivElement>(null);
  const repeat = useRef(createRepeater());
  const timers = useRef<number[]>([]);
  const rolling = useRef(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const pats = useRef<number[]>([]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const name = appearance.name.trim();

  useEffect(() => {
    useBackdrop.getState().setStage("creator");
    const fit = () => setScale(previewScale());
    fit();
    window.addEventListener("resize", fit);
    const pending = timers.current;
    return () => {
      window.removeEventListener("resize", fit);
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function say(text: string) {
    const id = performance.now();
    setQuip({ text, id });
    later(() => setQuip((value) => (value?.id === id ? null : value)), 2600);
  }

  /** Pulinho em passos de pixel do boneco grande. */
  function hop(height = 1) {
    const up = -Math.round(3 * height) * scale;
    hopRef.current?.animate(
      [0, up * 0.6, up, up, up * 0.5, 0].map((y) => ({ transform: `translateY(${y}px)`, easing: "steps(1, end)" })),
      { duration: 300 },
    );
  }

  const rows = useMemo(() => {
    const list: Row[] = [{ kind: "tabs" }];
    const field = (key: Field, label: string, options: Option[], look: Look) => list.push({ kind: "field", field: key, label, options, look });
    if (step === "you") {
      list.push({ kind: "name" });
      field("sex", "Corpo", SEX_OPTIONS, "choices");
      field("skin", "Tom de pele", SKIN_OPTIONS, "swatches");
      field("eyes", "Olhos", EYE_OPTIONS, "swatches");
    } else if (step === "hair") {
      field("hairStyle", "Corte", labels(HAIR_STYLES), "thumbs");
      field("hairColor", "Cor do cabelo", HAIR_COLOR_OPTIONS, "swatches");
    } else if (step === "clothes") {
      field("top", "Parte de cima", labels(TOPS), "thumbs");
      field("topColor", "Cor", CLOTH_OPTIONS, "swatches");
      if (appearance.top !== "dress") {
        field("bottom", "Parte de baixo", labels(BOTTOMS), "thumbs");
        field("bottomColor", "Cor", CLOTH_OPTIONS, "swatches");
      }
      field("shoes", "Calçado", labels(SHOES), "thumbs");
      field("shoesColor", "Cor", CLOTH_OPTIONS, "swatches");
    } else {
      field("headwear", "Chapéu", labels(HEADWEAR), "thumbs");
      if (appearance.headwear !== "none") field("headwearColor", "Cor do chapéu", CLOTH_OPTIONS, "swatches");
      field("extra", "Acessório", labels(EXTRAS), "thumbs");
      if (appearance.extra === "backpack" || appearance.extra === "scarf") field("extraColor", "Cor do acessório", CLOTH_OPTIONS, "swatches");
    }
    list.push({ kind: "next" });
    return list;
  }, [step, appearance.top, appearance.headwear, appearance.extra]);

  useEffect(() => {
    setRow((value) => Math.min(value, rows.length - 1));
  }, [rows.length]);

  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>(".cr-row.active")?.scrollIntoView({ block: "nearest" });
  }, [row, step]);

  function goStep(next: Step, toRow = 1) {
    if (next === step) return;
    playSfx("cursor");
    setStep(next);
    setRow(toRow);
    setVisited((value) => (value.includes(next) ? value : [...value, next]));
  }

  function nextStep() {
    const following = STEPS[stepIndex + 1];
    if (following) {
      goStep(following.id);
      hop(0.7);
      return;
    }
    playSfx("confirm");
    setReviewRow(1);
    setReview(true);
  }

  function set(field: Field, id: string) {
    if (appearance[field] === id) return;
    playSfx("cursor");
    setAppearance((value) => ({ ...value, [field]: id }));
    hop(field === "sex" ? 1.3 : 0.6);
  }

  function shift(delta: number, index = row) {
    const current = rows[index];
    if (!current || current.kind !== "field") return;
    const now = Math.max(0, current.options.findIndex((option) => option.id === appearance[current.field]));
    set(current.field, current.options[(now + delta + current.options.length) % current.options.length].id);
  }

  function rotate(delta: number) {
    playSfx("cursor");
    setTurn((value) => ((value ?? 0) + delta + TURN.length) % TURN.length);
  }

  /** Caça-níquel: o visual troca sete vezes, cada vez mais devagar, e para num sorteado. */
  function randomize() {
    if (rolling.current) return;
    rolling.current = true;
    let spins = 0;
    const spin = () => {
      spins += 1;
      setAppearance((value) => roll(value));
      if (spins < 7) {
        playSfx("cursor");
        later(spin, 60 + spins * 18);
        return;
      }
      rolling.current = false;
      playSfx("confirm");
      hop(1.4);
      say(pick(QUIPS));
    };
    spin();
  }

  function randomName() {
    const pool = NAMES[appearance.sex === "female" ? "female" : "male"].filter((item) => item !== name);
    const next = pick(pool);
    playSfx("cursor");
    setAppearance((value) => ({ ...value, name: next }));
    hop(0.5);
  }

  function rename(value: string) {
    const next = value.slice(0, 12);
    setAppearance((current) => ({ ...current, name: next }));
    const egg = NAME_EGGS[plain(next)];
    if (egg && plain(next) !== plain(appearance.name)) say(egg);
  }

  /** Carinho no boneco: coração e pulinho. Cinco seguidos e ele dá uma volta tonta. */
  function pat() {
    const now = performance.now();
    pats.current = [...pats.current.filter((at) => now - at < 2500), now];
    setHearts((value) => [...value.slice(-4), now]);
    later(() => setHearts((value) => value.filter((at) => at !== now)), 900);
    playSfx("pop");
    hop(0.8);
    if (pats.current.length < 5) return;
    pats.current = [];
    [1, 2, 3, 0, 1, 2, 3, 0].forEach((at, index) => later(() => setTurn(at), 70 * (index + 1)));
    later(() => {
      setTurn(null);
      say("Fiquei tonto!");
    }, 70 * 9);
  }

  function onStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, moved: false };
  }

  function onStagePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const step = Math.max(24, scale * 4);
    const delta = event.clientX - state.x;
    if (Math.abs(delta) < step) return;
    state.x = event.clientX;
    state.moved = true;
    rotate(delta > 0 ? -1 : 1);
  }

  function onStagePointerUp() {
    const state = drag.current;
    drag.current = null;
    if (state && !state.moved) pat();
  }

  function confirm() {
    // Voltando do jogo para o título, a cena começa do "aperte", não do criador.
    useBackdrop.getState().setStage("press");
    useGame.getState().newGame({ ...appearance, name: name.slice(0, 12) || "Viajante" });
    playSfx("confirm");
    setScreen("field");
  }

  function leave() {
    playSfx("cancel");
    setScreen("title");
  }

  function move(delta: number) {
    setRow((value) => {
      const next = Math.min(rows.length - 1, Math.max(0, value + delta));
      if (next !== value) playSfx("cursor");
      return next;
    });
  }

  useInputFrame((frame, dt) => {
    if (document.activeElement === nameRef.current) return;
    const step = repeat.current;
    if (review) {
      if (step("left", frame.held.left, dt) || step("right", frame.held.right, dt)) {
        playSfx("cursor");
        setReviewRow((value) => 1 - value);
      }
      if (frame.pressed.cancel) {
        playSfx("cancel");
        setReview(false);
      }
      if (frame.pressed.confirm) {
        if (reviewRow === 1) confirm();
        else {
          playSfx("cancel");
          setReview(false);
        }
      }
      return;
    }
    if (step("up", frame.held.up, dt)) move(-1);
    if (step("down", frame.held.down, dt)) move(1);
    const onTabs = rows[row]?.kind === "tabs";
    const tabTo = (delta: number) => goStep(STEPS[(stepIndex + delta + STEPS.length) % STEPS.length].id, 0);
    if (step("left", frame.held.left, dt)) (onTabs ? tabTo(-1) : shift(-1));
    if (step("right", frame.held.right, dt)) (onTabs ? tabTo(1) : shift(1));
    if (frame.pressed.menu) randomize();
    if (frame.pressed.cancel) leave();
    if (frame.pressed.confirm) {
      const current = rows[row];
      if (current?.kind === "name") nameRef.current?.focus();
      else if (current?.kind === "next") nextStep();
      else if (current?.kind === "tabs") move(1);
      else shift(1);
    }
  });

  function onBackground(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) poke(event.clientX, event.clientY);
  }

  const key = (action: "up" | "down" | "left" | "right" | "confirm" | "cancel" | "menu") => formatKey(keyboard[action][0]);
  const following = STEPS[stepIndex + 1];
  const facing = turn === null ? undefined : TURN[turn];
  const summary = [
    ["Cabelo", `${HAIR_STYLES[appearance.hairStyle]}, ${HAIR_COLORS[appearance.hairColor].label.toLowerCase()}`],
    ["Roupa", appearance.top === "dress" ? `${TOPS.dress} ${CLOTH[appearance.topColor].label.toLowerCase()}` : `${TOPS[appearance.top]} e ${BOTTOMS[appearance.bottom].toLowerCase()}`],
    ["Extras", [appearance.headwear !== "none" ? HEADWEAR[appearance.headwear] : null, appearance.extra !== "none" ? EXTRAS[appearance.extra] : null].filter(Boolean).join(" e ") || "Nenhum"],
    ["Origem", "Vila Brisamar"],
  ];

  return (
    <div className="cr-layer" onClick={onBackground}>
      <div className="cr-stage" style={{ "--s": scale } as CSSProperties}>
        <div
          className="cr-model"
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          onPointerCancel={() => (drag.current = null)}
        >
          <div className="cr-hop" ref={hopRef} role="img" aria-label="Seu personagem. Arraste para girar, toque para fazer carinho.">
            <CharacterPreview appearance={appearance} scale={scale} facing={facing} />
          </div>
          {hearts.map((at) => (
            <PixelIcon key={at} name="heart" className="cr-heart" style={{ "--dx": (Math.round(at) % 5) - 2 } as CSSProperties} />
          ))}
          {quip ? (
            <p className="cr-bubble" key={quip.id} role="status">
              {quip.text}
            </p>
          ) : null}
          <span className="cr-base" aria-hidden />
        </div>
        <p className={name ? "cr-plate" : "cr-plate empty"}>{name || "Sem nome"}</p>
        <div className="cr-tools">
          <button type="button" className="cr-tool" onClick={() => rotate(1)} aria-label="Girar para a esquerda">
            <PixelIcon name="left" />
          </button>
          <button type="button" className="cr-tool wide" onClick={randomize}>
            <PixelIcon name="dice" />
            Sortear
          </button>
          <button type="button" className="cr-tool" onClick={() => rotate(-1)} aria-label="Girar para a direita">
            <PixelIcon name="right" />
          </button>
        </div>
      </div>

      <section className="op-panel cr-panel" aria-labelledby="cr-title">
        <header className="op-head cr-head">
          <div>
            <p className="cr-kicker">
              Novo jogo · passo {stepIndex + 1} de {STEPS.length}
            </p>
            <h1 id="cr-title" key={step}>
              {STEPS[stepIndex].title}
            </h1>
          </div>
          <button type="button" className="op-back" onClick={leave}>
            <PixelIcon name="left" />
            Título
          </button>
        </header>

        <nav
          className={row === 0 ? "cr-steps focus" : "cr-steps"}
          style={{ "--p": stepIndex / (STEPS.length - 1) } as CSSProperties}
          aria-label="Passos"
          onMouseEnter={() => setRow(0)}
        >
          {STEPS.map((item, index) => {
            const done = visited.includes(item.id) && item.id !== step;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={item.id === step ? "step" : undefined}
                className={`cr-step${item.id === step ? " on" : ""}${done ? " done" : ""}`}
                onClick={() => goStep(item.id)}
              >
                <span className="cr-step-badge">{done ? <PixelIcon name="check" /> : index + 1}</span>
                <PixelIcon name={item.icon} />
                <span className="cr-step-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="op-body cr-body" key={step} ref={bodyRef}>
          {rows.map((entry, index) => {
            const active = index === row;
            const style = { "--i": index } as CSSProperties;
            if (entry.kind === "tabs") return null;
            if (entry.kind === "name") {
              return (
                <div key="name" className={active ? "cr-row active" : "cr-row"} style={style} onMouseEnter={() => setRow(index)}>
                  <div className="cr-row-head">
                    <span className="ts-cursor" aria-hidden />
                    <label className="cr-label" htmlFor="cr-name">
                      Nome
                    </label>
                    <em>{name.length}/12</em>
                  </div>
                  <div className="cr-name">
                    <input
                      id="cr-name"
                      ref={nameRef}
                      value={appearance.name}
                      maxLength={12}
                      placeholder="Viajante"
                      spellCheck={false}
                      autoComplete="off"
                      enterKeyHint="next"
                      onFocus={() => setRow(index)}
                      onChange={(event) => rename(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "Enter") {
                          event.preventDefault();
                          nameRef.current?.blur();
                          setRow(index + 1);
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          nameRef.current?.blur();
                        }
                      }}
                    />
                    <button type="button" className="cr-dice" onClick={randomName} aria-label="Sortear um nome" title="Sortear um nome">
                      <PixelIcon name="dice" />
                    </button>
                  </div>
                </div>
              );
            }
            if (entry.kind === "next") {
              return (
                <div key="next" className={active ? "cr-row cr-next active" : "cr-row cr-next"} style={style} onMouseEnter={() => setRow(index)}>
                  <button type="button" className="cr-go" onClick={nextStep}>
                    <span className="ts-cursor" aria-hidden />
                    {following ? `Próximo: ${following.label}` : "Pronto! Ver carteira"}
                    <PixelIcon name="right" />
                  </button>
                </div>
              );
            }
            const now = Math.max(0, entry.options.findIndex((item) => item.id === appearance[entry.field]));
            const choose = (id: string) => {
              setRow(index);
              set(entry.field, id);
            };
            return (
              <div key={entry.field} className={active ? "cr-row active" : "cr-row"} style={style} onMouseEnter={() => setRow(index)}>
                <div className="cr-row-head">
                  <span className="ts-cursor" aria-hidden />
                  <span className="cr-label">{entry.label}</span>
                  <em>{entry.options[now].label}</em>
                  <span className="cr-count">
                    {now + 1}/{entry.options.length}
                  </span>
                </div>
                <div
                  className={`cr-options ${entry.look}`}
                  style={{ "--cols": entry.options.length > 9 ? Math.ceil(entry.options.length / 2) : entry.options.length } as CSSProperties}
                  role="radiogroup"
                  aria-label={entry.label}
                >
                  {entry.options.map((item, at) => {
                    const on = at === now;
                    if (entry.look === "swatches") {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={item.label}
                          title={item.label}
                          className={on ? "cr-swatch on" : "cr-swatch"}
                          onClick={() => choose(item.id)}
                        >
                          <i style={{ background: item.swatch }} />
                        </button>
                      );
                    }
                    if (entry.look === "thumbs") {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={item.label}
                          title={item.label}
                          className={on ? "cr-thumb on" : "cr-thumb"}
                          style={{ "--y": CROP[entry.field] ?? 4 } as CSSProperties}
                          onClick={() => choose(item.id)}
                        >
                          <CharacterPreview appearance={{ ...appearance, [entry.field]: item.id }} scale={3} walk={false} facing={entry.field === "extra" ? 1 : 0} />
                        </button>
                      );
                    }
                    return (
                      <button key={item.id} type="button" role="radio" aria-checked={on} className={on ? "cr-choice on" : "cr-choice"} onClick={() => choose(item.id)}>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="op-desc">Arraste o boneco para girar. Toque nele para ver o que acontece.</p>
      </section>

      <p className="ts-hint op-hint">
        <span>
          <kbd>{key("up")}</kbd>
          <kbd>{key("down")}</kbd> escolher
        </span>
        <span>
          <kbd>{key("left")}</kbd>
          <kbd>{key("right")}</kbd> trocar
        </span>
        <span>
          <kbd>{key("menu")}</kbd> sortear
        </span>
        <span>
          <kbd>{key("cancel")}</kbd> sair
        </span>
      </p>

      {review ? (
        <div className="ts-modal" role="dialog" aria-modal="true" aria-labelledby="cr-card-title">
          <div className="ts-modal-card cr-card">
            <p className="ts-modal-title" id="cr-card-title">
              Carteira de Treinador
            </p>
            <div className="cr-card-body">
              <span className="cr-card-photo">
                <CharacterPreview appearance={appearance} scale={4} walk={false} facing={0} />
              </span>
              <dl>
                <div>
                  <dt>Nome</dt>
                  <dd className="cr-card-name">{name || "Viajante"}</dd>
                </div>
                {summary.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="ts-modal-actions">
              <button
                type="button"
                className={reviewRow === 0 ? "ts-modal-btn active" : "ts-modal-btn"}
                onMouseEnter={() => setReviewRow(0)}
                onClick={() => {
                  playSfx("cancel");
                  setReview(false);
                }}
              >
                Ajustar
              </button>
              <button type="button" className={reviewRow === 1 ? "ts-modal-btn active" : "ts-modal-btn"} onMouseEnter={() => setReviewRow(1)} onClick={confirm}>
                Começar a jornada
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
