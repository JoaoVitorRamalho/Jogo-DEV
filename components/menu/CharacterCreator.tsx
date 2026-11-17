"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Portrait } from "@/components/game/Portrait";
import { playSfx } from "@/lib/audio/engine";
import { defaultAppearance, itemsFor, sanitizeAppearance, withSex } from "@/lib/character/appearance";
import { labelColor, labelItem } from "@/lib/character/labels";
import type { Appearance, Catalog, ColorField, ItemSlot, PaletteId, Sex } from "@/lib/character/types";
import { NONE, OPTIONAL_SLOTS } from "@/lib/character/types";
import { placeRuntime } from "@/lib/game/runtime";
import { useSession } from "@/lib/game/session";
import { freshStory } from "@/lib/story/types";
import { MAPS, tileCenter } from "@/lib/story/world";
import { createRepeater, useInputFrame } from "@/lib/input/engine";
import { useSave } from "@/lib/save/store";

type Row =
  | { kind: "name" }
  | { kind: "sex" }
  | { kind: "color"; field: ColorField; label: string }
  | { kind: "item"; slot: ItemSlot; label: string }
  | { kind: "confirm" };

const COLOR_OF: Record<ColorField, PaletteId> = {
  skin: "body",
  eyes: "eye",
  hairColor: "hair",
  shirtColor: "cloth",
  legsColor: "cloth",
  shoesColor: "cloth",
  hatColor: "cloth",
  glassesColor: "cloth",
};

const COLOR_FOR_SLOT: Partial<Record<ItemSlot, ColorField>> = {
  shirt: "shirtColor",
  legs: "legsColor",
  shoes: "shoesColor",
  hat: "hatColor",
  glasses: "glassesColor",
};

function swatch(catalog: Catalog, field: ColorField, id: string): string {
  const colors = catalog.palettes[COLOR_OF[field]].colors[id];
  return colors?.[colors.length - 1] ?? "#888";
}

export function CharacterCreator({ catalog }: { catalog: Catalog }) {
  const setScreen = useSession((state) => state.setScreen);
  const [appearance, setAppearance] = useState<Appearance>(() => defaultAppearance(catalog));
  const [row, setRow] = useState(0);
  const nameRef = useRef<HTMLInputElement>(null);
  const repeat = useRef(createRepeater());

  const rows = useMemo(() => {
    const list: Row[] = [
      { kind: "name" },
      { kind: "sex" },
      { kind: "color", field: "skin", label: "Pele" },
      { kind: "color", field: "eyes", label: "Olhos" },
    ];
    const slots: { slot: ItemSlot; label: string }[] = [
      { slot: "expression", label: "Expressão" },
      { slot: "eyebrows", label: "Sobrancelha" },
      { slot: "hair", label: "Cabelo" },
      { slot: "beard", label: "Barba" },
      { slot: "shirt", label: "Camisa" },
      { slot: "legs", label: "Calça ou saia" },
      { slot: "shoes", label: "Sapatos" },
      { slot: "hat", label: "Chapéu" },
      { slot: "glasses", label: "Óculos" },
    ];
    for (const entry of slots) {
      if (itemsFor(catalog, entry.slot, appearance.sex).length === 0 && entry.slot !== "expression") continue;
      list.push({ kind: "item", ...entry });
      if (entry.slot === "hair") list.push({ kind: "color", field: "hairColor", label: "Cor do cabelo" });
      const color = COLOR_FOR_SLOT[entry.slot];
      if (color) list.push({ kind: "color", field: color, label: `Cor: ${entry.label.toLowerCase()}` });
    }
    list.push({ kind: "confirm" });
    return list;
  }, [appearance.sex, catalog]);

  useEffect(() => {
    setRow((value) => Math.min(value, Math.max(0, rows.length - 1)));
    document.querySelector<HTMLElement>(".creator-layout .row.active")?.scrollIntoView({ block: "nearest" });
  }, [row, rows.length]);

  function shift(delta: number, index = row) {
    const current = rows[Math.min(index, rows.length - 1)];
    if (!current) return;
    if (current.kind === "sex") {
      const sex: Sex = appearance.sex === "male" ? "female" : "male";
      if ((delta > 0 && sex === "female") || (delta < 0 && sex === "male") || appearance.sex !== sex) {
        setAppearance(withSex(catalog, appearance, appearance.sex === "male" ? "female" : "male"));
      }
      return;
    }
    if (current.kind === "color") {
      const keys = Object.keys(catalog.palettes[COLOR_OF[current.field]].colors);
      const index = Math.max(0, keys.indexOf(appearance[current.field]));
      const next = keys[(index + delta + keys.length) % keys.length];
      setAppearance({ ...appearance, [current.field]: next });
      return;
    }
    if (current.kind === "item") {
      const ids = itemsFor(catalog, current.slot, appearance.sex).map((item) => item.id);
      const choices = OPTIONAL_SLOTS.includes(current.slot) ? [NONE, ...ids] : ids;
      if (choices.length === 0) return;
      const index = Math.max(0, choices.indexOf(appearance[current.slot]));
      const next = choices[(index + delta + choices.length) % choices.length];
      setAppearance({ ...appearance, [current.slot]: next });
    }
  }

  function confirm() {
    const named = sanitizeAppearance(catalog, {
      ...appearance,
      name: appearance.name.trim().slice(0, 12) || "Viajante",
    });
    const spot = tileCenter(7, 9, MAPS.house.rows);
    useSave.getState().write({
      appearance: named,
      x: spot.x,
      y: spot.y,
      direction: "up",
      story: freshStory(),
    });
    placeRuntime(spot.x, spot.y, "up");
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
    }
  });

  function choiceLabel(slot: ItemSlot): string {
    const id = appearance[slot];
    if (id === NONE) return "Nenhum";
    const item = catalog.items.find((entry) => entry.id === id);
    return item ? labelItem(item.name) : "Nenhum";
  }

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
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        nameRef.current?.blur();
                        setRow(Math.max(0, index - 1));
                      }
                      if (event.key === "ArrowDown" || event.key === "Enter") {
                        event.preventDefault();
                        nameRef.current?.blur();
                        setRow(Math.min(rows.length - 1, index + 1));
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
            if (entry.kind === "sex") {
              return (
                <button key="sex" type="button" className={active ? "row active" : "row"} onMouseEnter={() => setRow(index)} onClick={() => { setRow(index); shift(1, index); }}>
                  <span>Sexo</span>
                  <strong>{appearance.sex === "male" ? "Masculino" : "Feminino"}</strong>
                </button>
              );
            }
            if (entry.kind === "color") {
              return (
                <button
                  key={entry.field}
                  type="button"
                  className={active ? "row active" : "row"}
                  onMouseEnter={() => setRow(index)}
                  onClick={() => { setRow(index); shift(1, index); }}
                >
                  <span>{entry.label}</span>
                  <strong>
                    <i className="swatch" style={{ background: swatch(catalog, entry.field, appearance[entry.field]) }} />
                    {labelColor(appearance[entry.field])}
                  </strong>
                </button>
              );
            }
            if (entry.kind === "item") {
              const total = itemsFor(catalog, entry.slot, appearance.sex).length + (OPTIONAL_SLOTS.includes(entry.slot) ? 1 : 0);
              return (
                <button
                  key={entry.slot}
                  type="button"
                  className={active ? "row active" : "row"}
                  onMouseEnter={() => setRow(index)}
                  onClick={() => { setRow(index); shift(1, index); }}
                >
                  <span>{entry.label}</span>
                  <strong>
                    {choiceLabel(entry.slot)} <em>{total}</em>
                  </strong>
                </button>
              );
            }
            return (
              <button key="confirm" type="button" className={active ? "row active confirm" : "row confirm"} onMouseEnter={() => setRow(index)} onClick={confirm}>
                Começar jornada
              </button>
            );
          })}
        </div>
        <p className="hint-inline">Esquerda e direita trocam · Z confirma · X volta</p>
      </section>
      <aside className="stage-card">
        <Portrait catalog={catalog} appearance={appearance} mode="demo" />
        <p className="who">{appearance.name.trim() || "Sem nome"}</p>
        <p className="muted">{appearance.sex === "male" ? "Masculino" : "Feminino"}</p>
      </aside>
    </div>
  );
}
