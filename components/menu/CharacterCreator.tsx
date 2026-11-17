"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CharacterPreview } from "@/components/character-creator/CharacterPreview";
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

type Field = Exclude<keyof Appearance, "version" | "name">;
type Option = { id: string; label: string; swatch?: string };
type Row = { kind: "name" } | { kind: "field"; field: Field; label: string; options: Option[] } | { kind: "confirm" };

const labels = (source: Record<string, string>): Option[] => Object.entries(source).map(([id, label]) => ({ id, label }));
const SKIN_OPTIONS: Option[] = Object.entries(SKIN).map(([id, v]) => ({ id, label: v.label, swatch: v.main }));
const EYE_OPTIONS: Option[] = Object.entries(EYES).map(([id, v]) => ({ id, label: v.label, swatch: v.color }));
const HAIR_COLOR_OPTIONS: Option[] = Object.entries(HAIR_COLORS).map(([id, v]) => ({ id, label: v.label, swatch: v.main }));
const CLOTH_OPTIONS: Option[] = Object.entries(CLOTH).map(([id, v]) => ({ id, label: v.label, swatch: v.main }));
const SEX_OPTIONS: Option[] = [
  { id: "male", label: "Masculino" },
  { id: "female", label: "Feminino" },
];

export function CharacterCreator() {
  const setScreen = useSession((state) => state.setScreen);
  const [appearance, setAppearance] = useState<Appearance>(() => defaultAppearance("male"));
  const [row, setRow] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const repeat = useRef(createRepeater());

  const rows = useMemo(() => {
    const list: Row[] = [
      { kind: "name" },
      { kind: "field", field: "sex", label: "Aparência", options: SEX_OPTIONS },
      { kind: "field", field: "skin", label: "Pele", options: SKIN_OPTIONS },
      { kind: "field", field: "eyes", label: "Olhos", options: EYE_OPTIONS },
      { kind: "field", field: "hairStyle", label: "Cabelo", options: labels(HAIR_STYLES) },
      { kind: "field", field: "hairColor", label: "Cor do cabelo", options: HAIR_COLOR_OPTIONS },
      { kind: "field", field: "top", label: "Roupa", options: labels(TOPS) },
      { kind: "field", field: "topColor", label: "Cor da roupa", options: CLOTH_OPTIONS },
    ];
    if (appearance.top !== "dress") {
      list.push({ kind: "field", field: "bottom", label: "Calça ou saia", options: labels(BOTTOMS) });
      list.push({ kind: "field", field: "bottomColor", label: "Cor da peça", options: CLOTH_OPTIONS });
    }
    list.push({ kind: "field", field: "shoes", label: "Calçado", options: labels(SHOES) });
    list.push({ kind: "field", field: "shoesColor", label: "Cor do calçado", options: CLOTH_OPTIONS });
    list.push({ kind: "field", field: "headwear", label: "Chapéu", options: labels(HEADWEAR) });
    if (appearance.headwear !== "none") list.push({ kind: "field", field: "headwearColor", label: "Cor do chapéu", options: CLOTH_OPTIONS });
    list.push({ kind: "field", field: "extra", label: "Acessório", options: labels(EXTRAS) });
    if (appearance.extra === "backpack" || appearance.extra === "scarf") {
      list.push({ kind: "field", field: "extraColor", label: "Cor do acessório", options: CLOTH_OPTIONS });
    }
    list.push({ kind: "confirm" });
    return list;
  }, [appearance.top, appearance.headwear, appearance.extra]);

  useEffect(() => {
    setRow((value) => Math.min(value, rows.length - 1));
    document.querySelector<HTMLElement>(".creator-layout .row.active")?.scrollIntoView({ block: "nearest" });
  }, [row, rows.length]);

  function shift(delta: number, index = row) {
    const current = rows[index];
    if (!current || current.kind !== "field") return;
    const options = current.options;
    const now = options.findIndex((option) => option.id === appearance[current.field]);
    const next = options[(Math.max(0, now) + delta + options.length) % options.length];
    playSfx("cursor");
    setAppearance((value) => ({ ...value, [current.field]: next.id }));
  }

  function confirm() {
    const name = appearance.name.trim().slice(0, 12) || "Viajante";
    useGame.getState().newGame({ ...appearance, name });
    playSfx("confirm");
    setScreen("field");
  }

  useInputFrame((frame, dt) => {
    if (document.activeElement === nameRef.current) return;
    const step = repeat.current;
    if (step("up", frame.held.up, dt)) setRow((value) => Math.max(0, value - 1));
    if (step("down", frame.held.down, dt)) setRow((value) => Math.min(rows.length - 1, value + 1));
    if (step("left", frame.held.left, dt)) shift(-1);
    if (step("right", frame.held.right, dt)) shift(1);
    if (frame.pressed.cancel) {
      playSfx("cancel");
      setScreen("title");
    }
    if (frame.pressed.confirm) {
      const current = rows[row];
      if (current?.kind === "name") nameRef.current?.focus();
      else if (current?.kind === "confirm") confirm();
      else shift(1);
    }
  });

  return (
    <div className="screen creator-layout">
      <section className="panel creator-panel">
        <h1>Novo jogo</h1>
        <div className="rows">
          {rows.map((entry, index) => {
            const active = index === row;
            if (entry.kind === "name") {
              return (
                <label key="name" className={active ? "row active field" : "row field"}>
                  <span>Nome</span>
                  <input
                    ref={nameRef}
                    value={appearance.name}
                    maxLength={12}
                    placeholder="Viajante"
                    spellCheck={false}
                    onFocus={() => setRow(index)}
                    onChange={(event) => setAppearance({ ...appearance, name: event.target.value.slice(0, 12) })}
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
                </label>
              );
            }
            if (entry.kind === "confirm") {
              return (
                <button key="confirm" type="button" className={active ? "row active confirm" : "row confirm"} onMouseEnter={() => setRow(index)} onClick={confirm}>
                  Começar a jornada
                </button>
              );
            }
            const option = entry.options.find((item) => item.id === appearance[entry.field]) ?? entry.options[0];
            return (
              <button
                key={entry.field}
                type="button"
                className={active ? "row active" : "row"}
                onMouseEnter={() => setRow(index)}
                onClick={() => {
                  setRow(index);
                  shift(1, index);
                }}
              >
                <span>{entry.label}</span>
                <strong>
                  {active ? "◀ " : ""}
                  {option.swatch ? <i className="swatch" style={{ background: option.swatch }} /> : null}
                  {option.label}
                  {active ? " ▶" : ""}
                </strong>
              </button>
            );
          })}
        </div>
        <p className="hint-inline">◀ ▶ trocam · Z confirma · X volta</p>
      </section>
      <aside className="stage-card">
        <CharacterPreview appearance={appearance} scale={7} />
        <p className="who">{appearance.name.trim() || "Sem nome"}</p>
      </aside>
    </div>
  );
}
